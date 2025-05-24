package processor

import (
	"context"
	"log"
	"math"
	"sync"
	"time"

	"github.com/qwaq-dev/drones/internal/config"
	"github.com/qwaq-dev/drones/internal/grpc"
	"github.com/qwaq-dev/drones/internal/repository"
	"github.com/qwaq-dev/drones/internal/structures"
)

type FlightProcessor struct {
	repo            *repository.Repository
	grpcClient      *grpc.NotificationClient
	config          *config.Config
	activeFlights   map[int]*structures.ActiveFlight
	mutex           sync.RWMutex
	ctx             context.Context
	cancel          context.CancelFunc
	restrictedZones []structures.RestrictedZone
	zonesLastUpdate time.Time
}

func New(repo *repository.Repository, grpcClient *grpc.NotificationClient, cfg *config.Config) *FlightProcessor {
	ctx, cancel := context.WithCancel(context.Background())

	return &FlightProcessor{
		repo:          repo,
		grpcClient:    grpcClient,
		config:        cfg,
		activeFlights: make(map[int]*structures.ActiveFlight),
		ctx:           ctx,
		cancel:        cancel,
	}
}

func (fp *FlightProcessor) Start() {
	log.Println("🚀 Starting flight processor...")

	// Загружаем запретные зоны при старте
	fp.loadRestrictedZones()

	// Запускаем обработку новых заявок
	go fp.processNewApplications()

	// Запускаем симуляцию полетов
	go fp.simulateFlights()
}

func (fp *FlightProcessor) Stop() {
	fp.cancel()
}

// Загружаем запретные зоны в кэш
func (fp *FlightProcessor) loadRestrictedZones() {
	zones, err := fp.repo.GetRestrictedZones()
	if err != nil {
		log.Printf("❌ Error loading restricted zones: %v", err)
		return
	}

	fp.restrictedZones = zones
	fp.zonesLastUpdate = time.Now()
	log.Printf("🚫 Loaded %d restricted zones into cache", len(zones))
}

// Обновляем кэш запретных зон каждые 5 минут
func (fp *FlightProcessor) updateRestrictedZonesCache() {
	if time.Since(fp.zonesLastUpdate) > 5*time.Minute {
		fp.loadRestrictedZones()
	}
}

// Обработка новых заявок
func (fp *FlightProcessor) processNewApplications() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-fp.ctx.Done():
			return
		case <-ticker.C:
			fp.checkPendingApplications()
		}
	}
}

func (fp *FlightProcessor) checkPendingApplications() {
	applications, err := fp.repo.GetPendingApplications()
	if err != nil {
		log.Printf("❌ Error getting pending applications: %v", err)
		return
	}

	log.Printf("📋 Found %d pending applications", len(applications))

	for _, app := range applications {
		go fp.processApplication(app)
	}
}

func (fp *FlightProcessor) processApplication(app structures.Application) {
	log.Printf("🔄 Processing application %d", app.Id)

	// Обновляем статус на "processing"
	err := fp.repo.UpdateApplicationStatus(app.Id, structures.StatusProcessing, "")
	if err != nil {
		log.Printf("❌ Error updating application status: %v", err)
		return
	}

	// Отправляем уведомление
	fp.grpcClient.NotifyStatusUpdate(context.Background(), app.Id, structures.StatusProcessing, "Application is being processed", "")

	// Имитируем время обработки
	log.Printf("⏳ Processing application %d for %v", app.Id, fp.config.ProcessingDelay)
	time.Sleep(fp.config.ProcessingDelay)

	// Проверяем маршрут и запретные зоны
	approved, reason := fp.validateFlight(app)

	if approved {
		log.Printf("✅ Application %d APPROVED", app.Id)
		// Одобряем заявку
		err = fp.repo.UpdateApplicationStatus(app.Id, structures.StatusApproved, "")
		if err != nil {
			log.Printf("❌ Error approving application: %v", err)
			return
		}

		fp.grpcClient.NotifyStatusUpdate(context.Background(), app.Id, structures.StatusApproved, "Application approved, starting flight", "")

		// Запускаем полет
		fp.startFlight(app)
	} else {
		log.Printf("❌ Application %d REJECTED: %s", app.Id, reason)
		// Отклоняем заявку
		err = fp.repo.UpdateApplicationStatus(app.Id, structures.StatusRejected, reason)
		if err != nil {
			log.Printf("❌ Error rejecting application: %v", err)
			return
		}

		fp.grpcClient.NotifyStatusUpdate(context.Background(), app.Id, structures.StatusRejected, "Application rejected", reason)
	}
}

func (fp *FlightProcessor) validateFlight(app structures.Application) (bool, string) {
	log.Printf("🔍 Validating flight for application %d", app.Id)

	// Получаем точку назначения из маршрута
	destinationPoints, err := fp.repo.GetRouteByApplicationId(app.Id)
	if err != nil {
		log.Printf("❌ Error loading destination for app %d: %v", app.Id, err)
		return false, "Error loading destination"
	}

	log.Printf("📍 Found %d destination points for application %d", len(destinationPoints), app.Id)

	if len(destinationPoints) == 0 {
		log.Printf("❌ No destination point found for application %d", app.Id)
		return false, "No destination point specified"
	}

	// Берем первую точку как пункт назначения
	destination := destinationPoints[0]
	log.Printf("🎯 Destination: lat=%.6f, lon=%.6f, alt=%.2f",
		destination.Latitude, destination.Longitude, destination.Altitude)

	// Создаем полный маршрут: база -> назначение
	fullRoute := fp.createFullRoute(destination)
	log.Printf("🛣️ Created full route with %d points", len(fullRoute))
	for i, point := range fullRoute {
		log.Printf("   Point %d: lat=%.6f, lon=%.6f, alt=%.2f",
			i, point.Latitude, point.Longitude, point.Altitude)
	}

	// Обновляем кэш запретных зон
	fp.updateRestrictedZonesCache()

	log.Printf("🚫 Found %d restricted zones", len(fp.restrictedZones))
	for _, zone := range fp.restrictedZones {
		log.Printf("   Zone '%s': lat=%.6f, lon=%.6f, radius=%d m",
			zone.Name, zone.Latitude, zone.Longtitude, zone.Radius)
	}

	// Проверяем пересечение с запретными зонами
	for i, point := range fullRoute {
		for _, zone := range fp.restrictedZones {
			distance := fp.calculateDistanceMeters(point.Latitude, point.Longitude, zone.Latitude, zone.Longtitude)
			log.Printf("🔍 Point %d to zone '%s': distance=%.1f m, zone radius=%d m",
				i, zone.Name, distance, zone.Radius)

			if distance <= float64(zone.Radius) {
				log.Printf("❌ COLLISION! Point %d intersects with zone '%s' (distance: %.1f m <= radius: %d m)",
					i, zone.Name, distance, zone.Radius)
				return false, "Route intersects with restricted zone: " + zone.Name
			}
		}
	}

	log.Printf("✅ No restricted zone collisions found")
	log.Printf("✅ All validations passed for application %d", app.Id)
	return true, ""
}

// Создаем полный маршрут от базы до пункта назначения
func (fp *FlightProcessor) createFullRoute(destination structures.RoutePoint) []structures.RoutePoint {
	// Координаты базы дронов (можете изменить на свои)
	baseLocation := structures.RoutePoint{
		Id:            0,        // Виртуальная точка
		Latitude:      51.11990, // Ваша база
		Longitude:     71.48048,
		Altitude:      0.0, // Высота взлета в метрах
		PointOrder:    0,
		ApplicationId: destination.ApplicationId,
	}

	// Обновляем порядок точек
	destination.PointOrder = 1

	return []structures.RoutePoint{baseLocation, destination}
}

func (fp *FlightProcessor) startFlight(app structures.Application) {
	// Получаем точку назначения
	destinationPoints, err := fp.repo.GetRouteByApplicationId(app.Id)
	if err != nil {
		log.Printf("❌ Error loading destination for flight %d: %v", app.Id, err)
		return
	}

	if len(destinationPoints) == 0 {
		log.Printf("❌ No destination found for application %d", app.Id)
		return
	}

	// Создаем полный маршрут
	fullRoute := fp.createFullRoute(destinationPoints[0])

	// Создаем активный полет
	flight := &structures.ActiveFlight{
		ApplicationId:   app.Id,
		DroneId:         app.Drone_id,
		PilotId:         app.Pilot_id,
		Route:           fullRoute,
		CurrentWaypoint: 0,
		StartTime:       time.Now(),
		Status:          structures.StatusExecuting,
		CurrentPosition: structures.DronePosition{
			ApplicationId: app.Id,
			DroneId:       app.Drone_id,
			Latitude:      fullRoute[0].Latitude, // Начинаем с базы
			Longitude:     fullRoute[0].Longitude,
			Altitude:      fullRoute[0].Altitude,
			Timestamp:     time.Now(),
			RouteProgress: 0.0, // 🔧 ВАЖНО: Начинаем с 0%
		},
	}

	// 🔧 ИСПРАВЛЕННЫЙ расчет времени полета
	totalDistance := fp.calculateRouteDistanceMeters(fullRoute)

	// Время = расстояние (м) / скорость (м/с) = секунды
	flightTimeSeconds := totalDistance / fp.config.FlightSpeedMS
	flightDuration := time.Duration(flightTimeSeconds) * time.Second

	flight.EstimatedEndTime = flight.StartTime.Add(flightDuration)

	fp.mutex.Lock()
	fp.activeFlights[app.Id] = flight
	fp.mutex.Unlock()

	// Обновляем статус в БД
	err = fp.repo.UpdateApplicationStatus(app.Id, structures.StatusExecuting, "")
	if err != nil {
		log.Printf("❌ Error updating application status to executing: %v", err)
	}

	fp.grpcClient.NotifyFlightStarted(context.Background(), flight)

	log.Printf("🚁 Started flight for application %d", app.Id)
	log.Printf("   📏 Distance: %.1f m (%.2f km)", totalDistance, totalDistance/1000)
	log.Printf("   🏃 Speed: %.1f m/s (%.1f km/h)", fp.config.FlightSpeedMS, fp.config.FlightSpeedMS*3.6)
	log.Printf("   ⏱️ Duration: %v", flightDuration)
}

// Остальные методы остаются без изменений...
func (fp *FlightProcessor) simulateFlights() {
	ticker := time.NewTicker(fp.config.PositionUpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-fp.ctx.Done():
			return
		case <-ticker.C:
			fp.updateFlightPositions()
		}
	}
}

func (fp *FlightProcessor) updateFlightPositions() {
	fp.mutex.RLock()
	flights := make([]*structures.ActiveFlight, 0, len(fp.activeFlights))
	for _, flight := range fp.activeFlights {
		flights = append(flights, flight)
	}
	fp.mutex.RUnlock()

	for _, flight := range flights {
		fp.updateSingleFlight(flight)
	}
}

func (fp *FlightProcessor) updateSingleFlight(flight *structures.ActiveFlight) {
	if flight.CurrentWaypoint >= len(flight.Route) {
		fp.completeFlight(flight)
		return
	}

	currentWaypoint := flight.Route[flight.CurrentWaypoint]

	// Рассчитываем новую позицию
	newPosition := fp.calculateNewPosition(flight.CurrentPosition, currentWaypoint)

	// Проверяем, достигли ли мы текущей точки маршрута (в метрах)
	distance := fp.calculateDistanceMeters(
		newPosition.Latitude, newPosition.Longitude,
		currentWaypoint.Latitude, currentWaypoint.Longitude,
	)

	if distance < 10.0 { // 10 метров точность
		log.Printf("🎯 Drone %d reached waypoint %d", flight.DroneId, flight.CurrentWaypoint)
		flight.CurrentWaypoint++
		if flight.CurrentWaypoint >= len(flight.Route) {
			fp.completeFlight(flight)
			return
		}
	}

	// Обновляем позицию
	flight.CurrentPosition = newPosition

	// 🔧 ИСПРАВЛЕННЫЙ расчет прогресса маршрута
	flight.CurrentPosition.RouteProgress = fp.calculateRouteProgress(flight)

	// 🚨 НОВОЕ: Проверяем близость к запретным зонам
	fp.checkRestrictedZoneProximity(flight)

	// Сохраняем в БД
	err := fp.repo.SaveDronePosition(flight.CurrentPosition)
	if err != nil {
		log.Printf("❌ Error saving drone position: %v", err)
	}

	// Отправляем обновление позиции
	fp.grpcClient.UpdateDronePosition(context.Background(), flight.CurrentPosition)

	// Логируем каждые 2 секунды для отладки
	if time.Now().Unix()%2 == 0 {
		log.Printf("📍 Drone %d: lat=%.6f, lon=%.6f, progress=%.1f%%, waypoint=%d/%d, distance_to_target=%.1fm",
			flight.DroneId, flight.CurrentPosition.Latitude, flight.CurrentPosition.Longitude,
			flight.CurrentPosition.RouteProgress, flight.CurrentWaypoint, len(flight.Route)-1, distance)
	}
}

// 🚨 НОВАЯ ФУНКЦИЯ: Проверка близости к запретным зонам
func (fp *FlightProcessor) checkRestrictedZoneProximity(flight *structures.ActiveFlight) {
	const WARNING_DISTANCE = 100.0 // Предупреждение за 100 метров
	const DANGER_DISTANCE = 50.0   // Опасность за 50 метров

	for _, zone := range fp.restrictedZones {
		distance := fp.calculateDistanceMeters(
			flight.CurrentPosition.Latitude,
			flight.CurrentPosition.Longitude,
			zone.Latitude,
			zone.Longtitude,
		)

		// Проверяем различные уровни близости
		if distance <= DANGER_DISTANCE {
			// КРИТИЧЕСКАЯ БЛИЗОСТЬ - красная зона
			fp.sendRestrictedZoneAlert(flight, zone, "DANGER", distance)
			log.Printf("🚨 DANGER! Drone %d is %.1fm from restricted zone '%s'",
				flight.DroneId, distance, zone.Name)
		} else if distance <= WARNING_DISTANCE {
			// ПРЕДУПРЕЖДЕНИЕ - желтая зона
			fp.sendRestrictedZoneAlert(flight, zone, "WARNING", distance)
			log.Printf("⚠️ WARNING! Drone %d is %.1fm from restricted zone '%s'",
				flight.DroneId, distance, zone.Name)
		} else if distance <= float64(zone.Radius)+WARNING_DISTANCE {
			// ИНФОРМАЦИЯ - зеленая зона
			fp.sendRestrictedZoneAlert(flight, zone, "INFO", distance)
			log.Printf("ℹ️ INFO: Drone %d is %.1fm from restricted zone '%s'",
				flight.DroneId, distance, zone.Name)
		}
	}
}

func (fp *FlightProcessor) sendRestrictedZoneAlert(flight *structures.ActiveFlight, zone structures.RestrictedZone, alertLevel string, distance float64) {
	err := fp.grpcClient.NotifyRestrictedZoneProximity(context.Background(),
		flight.ApplicationId,
		flight.DroneId,
		zone,
		alertLevel,
		distance,
		flight.CurrentPosition,
	)

	if err != nil {
		log.Printf("❌ Error sending restricted zone alert: %v", err)
	}
}

func (fp *FlightProcessor) calculateNewPosition(current structures.DronePosition, target structures.RoutePoint) structures.DronePosition {
	// Рассчитываем направление к цели
	deltaLat := target.Latitude - current.Latitude
	deltaLon := target.Longitude - current.Longitude
	deltaAlt := target.Altitude - current.Altitude

	distance := math.Sqrt(deltaLat*deltaLat + deltaLon*deltaLon)

	// Скорость в градусах в секунду
	// 1 градус ≈ 111320 метров на экваторе
	speedDegPerSec := fp.config.FlightSpeedMS / 111320.0

	if distance < speedDegPerSec {
		// Достигли точки
		return structures.DronePosition{
			ApplicationId: current.ApplicationId,
			DroneId:       current.DroneId,
			Latitude:      target.Latitude,
			Longitude:     target.Longitude,
			Altitude:      target.Altitude,
			Speed:         fp.config.FlightSpeedMS,
			Heading:       current.Heading,
			Timestamp:     time.Now(),
		}
	}

	// Движемся к цели
	ratio := speedDegPerSec / distance
	newLat := current.Latitude + deltaLat*ratio
	newLon := current.Longitude + deltaLon*ratio
	newAlt := current.Altitude + deltaAlt*ratio

	// Рассчитываем курс
	heading := math.Atan2(deltaLon, deltaLat) * 180 / math.Pi
	if heading < 0 {
		heading += 360
	}

	return structures.DronePosition{
		ApplicationId: current.ApplicationId,
		DroneId:       current.DroneId,
		Latitude:      newLat,
		Longitude:     newLon,
		Altitude:      newAlt,
		Speed:         fp.config.FlightSpeedMS,
		Heading:       heading,
		Timestamp:     time.Now(),
	}
}

// 🔧 ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ расчет прогресса маршрута
func (fp *FlightProcessor) calculateRouteProgress(flight *structures.ActiveFlight) float64 {
	if len(flight.Route) < 2 {
		return 100.0
	}

	// Общее расстояние всего маршрута
	totalDistance := fp.calculateRouteDistanceMeters(flight.Route)
	if totalDistance <= 0 {
		return 100.0
	}

	// Расстояние от стартовой точки до текущей позиции
	startPoint := flight.Route[0]
	currentDistanceFromStart := fp.calculateDistanceMeters(
		startPoint.Latitude, startPoint.Longitude,
		flight.CurrentPosition.Latitude, flight.CurrentPosition.Longitude,
	)

	// Рассчитываем прогресс как отношение пройденного расстояния к общему
	progress := (currentDistanceFromStart / totalDistance) * 100

	// Ограничиваем от 0 до 100
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}

	return progress
}

func (fp *FlightProcessor) completeFlight(flight *structures.ActiveFlight) {
	log.Printf("🏁 Completing flight for application %d", flight.ApplicationId)

	// Устанавливаем прогресс 100% при завершении
	flight.CurrentPosition.RouteProgress = 100.0

	// Обновляем статус
	err := fp.repo.UpdateApplicationStatus(flight.ApplicationId, structures.StatusCompleted, "")
	if err != nil {
		log.Printf("❌ Error updating application status to completed: %v", err)
	}

	// Отправляем финальное обновление позиции с 100%
	fp.grpcClient.UpdateDronePosition(context.Background(), flight.CurrentPosition)

	// Отправляем уведомление о завершении
	fp.grpcClient.NotifyFlightCompleted(context.Background(), flight, "completed")

	// Удаляем из активных полетов
	fp.mutex.Lock()
	delete(fp.activeFlights, flight.ApplicationId)
	fp.mutex.Unlock()
}

// Расчет расстояния в МЕТРАХ
func (fp *FlightProcessor) calculateDistanceMeters(lat1, lon1, lat2, lon2 float64) float64 {
	// Формула гаверсинуса для расчета расстояния между двумя точками
	const R = 6371000 // Радиус Земли в МЕТРАХ

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c // Возвращаем в метрах
}

func (fp *FlightProcessor) calculateRouteDistanceMeters(route []structures.RoutePoint) float64 {
	if len(route) < 2 {
		return 0
	}

	totalDistance := 0.0
	for i := 1; i < len(route); i++ {
		distance := fp.calculateDistanceMeters(
			route[i-1].Latitude, route[i-1].Longitude,
			route[i].Latitude, route[i].Longitude,
		)
		totalDistance += distance
	}

	return totalDistance // В метрах
}
