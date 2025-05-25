package processor

import (
	"context"
	"fmt"
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
	zonesMutex      sync.RWMutex
	sentAlerts      map[string]bool
	alertsMutex     sync.RWMutex
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
		sentAlerts:    make(map[string]bool),
	}
}

func (fp *FlightProcessor) Start() {
	log.Println("Starting flight processor...")

	fp.loadRestrictedZones()

	go fp.processNewApplications()
	go fp.simulateFlights()
	go fp.periodicZoneUpdate()
}

func (fp *FlightProcessor) Stop() {
	log.Println("Stopping flight processor...")
	fp.cancel()

	fp.mutex.Lock()
	for _, flight := range fp.activeFlights {
		fp.forceCompleteFlight(flight, "system_shutdown")
	}
	fp.mutex.Unlock()
}

func (fp *FlightProcessor) periodicZoneUpdate() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-fp.ctx.Done():
			return
		case <-ticker.C:
			fp.loadRestrictedZones()
		}
	}
}

func (fp *FlightProcessor) loadRestrictedZones() {
	zones, err := fp.repo.GetRestrictedZones()
	if err != nil {
		log.Printf("Error loading restricted zones: %v", err)
		return
	}

	fp.zonesMutex.Lock()
	fp.restrictedZones = zones
	fp.zonesLastUpdate = time.Now()
	fp.zonesMutex.Unlock()

	log.Printf("Loaded %d restricted zones into cache", len(zones))
}

func (fp *FlightProcessor) getRestrictedZones() []structures.RestrictedZone {
	fp.zonesMutex.RLock()
	defer fp.zonesMutex.RUnlock()

	zones := make([]structures.RestrictedZone, len(fp.restrictedZones))
	copy(zones, fp.restrictedZones)
	return zones
}

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
		log.Printf("Error getting pending applications: %v", err)
		return
	}

	if len(applications) > 0 {
		log.Printf("Found %d pending applications", len(applications))
	}

	for _, app := range applications {
		select {
		case <-fp.ctx.Done():
			return
		default:
			go fp.processApplication(app)
		}
	}
}

func (fp *FlightProcessor) processApplication(app structures.Application) {
	log.Printf("Processing application %d (tested: %d)", app.Id, app.Tested)

	select {
	case <-fp.ctx.Done():
		return
	default:
	}

	err := fp.repo.UpdateApplicationStatus(app.Id, structures.StatusProcessing, "")
	if err != nil {
		log.Printf("Error updating application status: %v", err)
		return
	}

	ctx, cancel := context.WithTimeout(fp.ctx, 15*time.Second)
	defer cancel()

	log.Printf("Sending PROCESSING status notification for application %d", app.Id)
	fp.notifyStatusUpdate(ctx, app.Id, structures.StatusProcessing, "Application is being processed and validated", "")

	select {
	case <-fp.ctx.Done():
		return
	case <-time.After(fp.config.ProcessingDelay):
	}

	approved, reason := fp.validateFlight(app)

	if approved {
		log.Printf("Application %d APPROVED", app.Id)
		err = fp.repo.UpdateApplicationStatus(app.Id, structures.StatusApproved, "")
		if err != nil {
			log.Printf("Error approving application: %v", err)
			log.Printf("Sending REJECTED status notification for application %d due to DB error", app.Id)
			fp.notifyStatusUpdate(ctx, app.Id, structures.StatusRejected, "Internal error occurred during approval", "Database update failed")
			return
		}

		log.Printf("Sending APPROVED status notification for application %d", app.Id)
		fp.notifyStatusUpdate(ctx, app.Id, structures.StatusApproved, "Application approved successfully. Flight will start shortly.", "")
		fp.startFlight(app)
	} else {
		log.Printf("Application %d REJECTED: %s", app.Id, reason)
		err = fp.repo.UpdateApplicationStatus(app.Id, structures.StatusRejected, reason)
		if err != nil {
			log.Printf("Error rejecting application: %v", err)
		}

		log.Printf("Sending REJECTED status notification for application %d with reason: %s", app.Id, reason)
		fp.notifyStatusUpdate(ctx, app.Id, structures.StatusRejected, "Application rejected after validation", reason)
	}
}

func (fp *FlightProcessor) notifyStatusUpdate(ctx context.Context, applicationId int, status structures.Status, message, rejectionReason string) {
	log.Printf("Attempting to send gRPC notification: app_id=%d, status=%s, message=%s, reason=%s",
		applicationId, status, message, rejectionReason)

	err := fp.grpcClient.NotifyStatusUpdate(ctx, applicationId, status, message, rejectionReason)
	if err != nil {
		log.Printf("FAILED to send status update notification for application %d: %v", applicationId, err)
	} else {
		log.Printf("SUCCESS: Status update notification sent for application %d", applicationId)
	}
}

func (fp *FlightProcessor) validateFlight(app structures.Application) (bool, string) {
	log.Printf("Validating flight for application %d", app.Id)

	destinationPoints, err := fp.repo.GetRouteByApplicationId(app.Id)
	if err != nil {
		log.Printf("Error loading destination for app %d: %v", app.Id, err)
		return false, "Unable to load flight route from database"
	}

	log.Printf("Found %d destination points for application %d", len(destinationPoints), app.Id)

	if len(destinationPoints) == 0 {
		log.Printf("No destination point found for application %d", app.Id)
		return false, "No destination point specified in the flight plan"
	}

	destination := destinationPoints[0]
	log.Printf("Destination: lat=%.6f, lon=%.6f, alt=%.2f",
		destination.Latitude, destination.Longitude, destination.Altitude)

	if destination.Altitude < 0 || destination.Altitude > 500 {
		return false, fmt.Sprintf("Invalid altitude: %.1f meters. Allowed range: 0-500 meters", destination.Altitude)
	}

	fullRoute := fp.createFullRoute(destination)
	log.Printf("Created full route with %d points", len(fullRoute))

	restrictedZones := fp.getRestrictedZones()
	log.Printf("Found %d restricted zones", len(restrictedZones))

	return fp.checkRouteAgainstZones(fullRoute, restrictedZones)
}

func (fp *FlightProcessor) checkRouteAgainstZones(route []structures.RoutePoint, zones []structures.RestrictedZone) (bool, string) {
	for _, zone := range zones {
		log.Printf("Checking zone '%s': lat=%.6f, lon=%.6f, radius=%d m",
			zone.Name, zone.Latitude, zone.Longtitude, zone.Radius)

		for i, point := range route {
			distance := fp.calculateDistanceMeters(point.Latitude, point.Longitude, zone.Latitude, zone.Longtitude)

			log.Printf("Point %d (lat=%.6f, lon=%.6f) to zone '%s': distance=%.1f m, zone_radius=%d m",
				i, point.Latitude, point.Longitude, zone.Name, distance, zone.Radius)

			if distance <= float64(zone.Radius) {
				log.Printf("COLLISION! Point %d inside zone '%s' (distance: %.1f m <= radius: %d m)",
					i, zone.Name, distance, zone.Radius)
				return false, fmt.Sprintf("Flight route passes through restricted zone '%s'. Minimum distance required: %d meters", zone.Name, zone.Radius)
			}
		}

		if fp.checkLineIntersection(route, zone) {
			log.Printf("COLLISION! Route path intersects with zone '%s'", zone.Name)
			return false, fmt.Sprintf("Flight path intersects with restricted zone '%s'", zone.Name)
		}
	}

	log.Printf("Basic route validation passed - no direct intersections with restricted zones")
	return true, ""
}

func (fp *FlightProcessor) checkLineIntersection(route []structures.RoutePoint, zone structures.RestrictedZone) bool {
	if len(route) < 2 {
		return false
	}

	zoneRadius := float64(zone.Radius)

	for i := 1; i < len(route); i++ {
		start := route[i-1]
		end := route[i]

		minDistance := fp.distanceFromPointToLineSegment(
			zone.Latitude, zone.Longtitude,
			start.Latitude, start.Longitude,
			end.Latitude, end.Longitude,
		)

		log.Printf("Segment %d-%d minimum distance to zone '%s': %.1f m (zone_radius: %.1f m)",
			i-1, i, zone.Name, minDistance, zoneRadius)

		if minDistance <= zoneRadius {
			return true
		}
	}

	return false
}

func (fp *FlightProcessor) distanceFromPointToLineSegment(px, py, x1, y1, x2, y2 float64) float64 {
	A := px - x1
	B := py - y1
	C := x2 - x1
	D := y2 - y1

	dot := A*C + B*D
	lenSq := C*C + D*D

	if lenSq == 0 {
		return fp.calculateDistanceMeters(px, py, x1, y1)
	}

	param := dot / lenSq

	var xx, yy float64
	if param < 0 {
		xx, yy = x1, y1
	} else if param > 1 {
		xx, yy = x2, y2
	} else {
		xx = x1 + param*C
		yy = y1 + param*D
	}

	return fp.calculateDistanceMeters(px, py, xx, yy)
}

func (fp *FlightProcessor) createFullRoute(destination structures.RoutePoint) []structures.RoutePoint {
	baseLocation := structures.RoutePoint{
		Id:            0,
		Latitude:      51.15545,
		Longitude:     71.41216,
		Altitude:      0.0,
		PointOrder:    0,
		ApplicationId: destination.ApplicationId,
	}

	destination.PointOrder = 1

	return []structures.RoutePoint{baseLocation, destination}
}

func (fp *FlightProcessor) startFlight(app structures.Application) {
	select {
	case <-fp.ctx.Done():
		return
	default:
	}

	destinationPoints, err := fp.repo.GetRouteByApplicationId(app.Id)
	if err != nil {
		log.Printf("Error loading destination for flight %d: %v", app.Id, err)
		ctx, cancel := context.WithTimeout(fp.ctx, 10*time.Second)
		defer cancel()
		log.Printf("Sending CANCELLED status notification for application %d due to route loading error", app.Id)
		fp.notifyStatusUpdate(ctx, app.Id, structures.StatusCancelled, "Failed to start flight", "Unable to load flight route")
		return
	}

	if len(destinationPoints) == 0 {
		log.Printf("No destination found for application %d", app.Id)
		ctx, cancel := context.WithTimeout(fp.ctx, 10*time.Second)
		defer cancel()
		log.Printf("Sending CANCELLED status notification for application %d due to no destination", app.Id)
		fp.notifyStatusUpdate(ctx, app.Id, structures.StatusCancelled, "Failed to start flight", "No destination found")
		return
	}

	fullRoute := fp.createFullRoute(destinationPoints[0])

	demoMode := app.Tested == 1

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
			Latitude:      fullRoute[0].Latitude,
			Longitude:     fullRoute[0].Longitude,
			Altitude:      fullRoute[0].Altitude,
			Timestamp:     time.Now(),
			RouteProgress: 0.0,
		},

		State:           structures.FlightStateActive,
		FlightStartTime: time.Now(),
		DemoMode:        demoMode,
	}

	totalDistance := fp.calculateRouteDistanceMeters(fullRoute)
	flightTimeSeconds := totalDistance / fp.config.FlightSpeedMS
	flightDuration := time.Duration(flightTimeSeconds) * time.Second
	flight.EstimatedEndTime = flight.StartTime.Add(flightDuration)

	fp.mutex.Lock()
	fp.activeFlights[app.Id] = flight
	fp.mutex.Unlock()

	fp.clearAlertsForFlight(app.Id)

	err = fp.repo.UpdateApplicationStatus(app.Id, structures.StatusExecuting, "")
	if err != nil {
		log.Printf("Error updating application status to executing: %v", err)
	}

	ctx, cancel := context.WithTimeout(fp.ctx, 15*time.Second)
	defer cancel()

	demoModeStatus := "OFF"
	if demoMode {
		demoModeStatus = "ON"
	}

	log.Printf("Sending EXECUTING status notification for application %d", app.Id)
	fp.notifyStatusUpdate(ctx, app.Id, structures.StatusExecuting, fmt.Sprintf("Flight started successfully. Estimated duration: %v", flightDuration), "")

	log.Printf("Sending flight started notification for application %d", app.Id)
	err = fp.grpcClient.NotifyFlightStarted(ctx, flight)
	if err != nil {
		log.Printf("FAILED to send flight started notification: %v", err)
	} else {
		log.Printf("SUCCESS: Flight started notification sent for application %d", app.Id)
	}

	log.Printf("Started flight for application %d (DEMO MODE: %s)", app.Id, demoModeStatus)
	log.Printf("   Distance: %.1f m (%.2f km)", totalDistance, totalDistance/1000)
	log.Printf("   Speed: %.1f m/s (%.1f km/h)", fp.config.FlightSpeedMS, fp.config.FlightSpeedMS*3.6)
	log.Printf("   Duration: %v", flightDuration)

	if demoMode {
		log.Printf("   Demo pause scheduled after 30 seconds")
	} else {
		log.Printf("   Normal flight mode - no demo pauses")
	}
}

func (fp *FlightProcessor) checkDemoPause(flight *structures.ActiveFlight) bool {
	if !flight.DemoMode {
		return false
	}

	timeSinceStart := time.Since(flight.FlightStartTime)

	if timeSinceStart >= 30*time.Second && timeSinceStart < 31*time.Second && flight.State == structures.FlightStateActive {
		fp.pauseFlight(flight, "Demo pause for 10 seconds (tested=1)")
		return true
	}

	if flight.State == structures.FlightStatePaused && flight.PauseStartTime != nil {
		timeSincePause := time.Since(*flight.PauseStartTime)
		if timeSincePause >= 10*time.Second {
			fp.resumeFlight(flight, "Demo pause completed (tested=1)")
			flight.DemoMode = false
			log.Printf("Demo mode disabled for flight %d after first pause cycle", flight.ApplicationId)
			return true
		}
	}

	return false
}

func (fp *FlightProcessor) pauseFlight(flight *structures.ActiveFlight, reason string) {
	log.Printf("PAUSING flight %d: %s", flight.ApplicationId, reason)

	now := time.Now()
	flight.State = structures.FlightStatePaused
	flight.PauseStartTime = &now
	flight.CurrentPosition.Speed = 0

	ctx, cancel := context.WithTimeout(fp.ctx, 10*time.Second)
	defer cancel()

	err := fp.grpcClient.NotifyFlightPaused(ctx, flight, reason)
	if err != nil {
		log.Printf("FAILED to send flight paused notification: %v", err)
	} else {
		log.Printf("SUCCESS: Flight paused notification sent for application %d", flight.ApplicationId)
	}
}

func (fp *FlightProcessor) resumeFlight(flight *structures.ActiveFlight, reason string) {
	log.Printf("RESUMING flight %d: %s", flight.ApplicationId, reason)

	now := time.Now()
	flight.State = structures.FlightStateActive
	flight.PauseEndTime = &now
	flight.CurrentPosition.Speed = fp.config.FlightSpeedMS

	ctx, cancel := context.WithTimeout(fp.ctx, 10*time.Second)
	defer cancel()

	err := fp.grpcClient.NotifyFlightResumed(ctx, flight, reason)
	if err != nil {
		log.Printf("FAILED to send flight resumed notification: %v", err)
	} else {
		log.Printf("SUCCESS: Flight resumed notification sent for application %d", flight.ApplicationId)
	}
}

func (fp *FlightProcessor) forceCompleteFlight(flight *structures.ActiveFlight, reason string) {
	log.Printf("Force completing flight %d, reason: %s", flight.ApplicationId, reason)

	var status structures.Status
	var message string

	switch reason {
	case "system_shutdown":
		status = structures.StatusCancelled
		message = "Flight cancelled due to system shutdown"
	case "restricted_zone":
		status = structures.StatusCancelled
		message = "Flight cancelled due to restricted zone proximity"
	default:
		status = structures.StatusCompleted
		message = "Flight completed successfully"
	}

	err := fp.repo.UpdateApplicationStatus(flight.ApplicationId, status, reason)
	if err != nil {
		log.Printf("Error updating application status: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("Sending %s status notification for application %d", status, flight.ApplicationId)
	fp.notifyStatusUpdate(ctx, flight.ApplicationId, status, message, reason)

	log.Printf("Sending flight completed notification for application %d", flight.ApplicationId)
	err = fp.grpcClient.NotifyFlightCompleted(ctx, flight, reason)
	if err != nil {
		log.Printf("FAILED to send flight completed notification: %v", err)
	} else {
		log.Printf("SUCCESS: Flight completed notification sent for application %d", flight.ApplicationId)
	}
}

func (fp *FlightProcessor) stopFlightAndRemoveApplication(flight *structures.ActiveFlight, zone structures.RestrictedZone, distanceToBorder float64) {
	log.Printf("STOPPING FLIGHT %d due to proximity to restricted zone '%s' (%.1f m to border)",
		flight.ApplicationId, zone.Name, distanceToBorder)

	reason := fmt.Sprintf("Flight automatically stopped: drone approached within %.1f meters of restricted zone '%s'", distanceToBorder, zone.Name)

	err := fp.repo.UpdateApplicationStatus(flight.ApplicationId, structures.StatusCancelled, reason)
	if err != nil {
		log.Printf("Error updating application status to cancelled: %v", err)
	}

	ctx, cancel := context.WithTimeout(fp.ctx, 15*time.Second)
	defer cancel()

	log.Printf("Sending CANCELLED status notification for application %d due to restricted zone", flight.ApplicationId)
	fp.notifyStatusUpdate(ctx, flight.ApplicationId, structures.StatusCancelled, "Flight stopped for safety reasons", reason)

	log.Printf("Sending restricted zone proximity alert for application %d", flight.ApplicationId)
	err = fp.grpcClient.NotifyRestrictedZoneProximity(ctx, flight.ApplicationId, flight.DroneId, zone, "DANGER", distanceToBorder, flight.CurrentPosition)
	if err != nil {
		log.Printf("FAILED to send restricted zone alert: %v", err)
	} else {
		log.Printf("SUCCESS: Restricted zone alert sent for application %d", flight.ApplicationId)
	}

	fp.mutex.Lock()
	delete(fp.activeFlights, flight.ApplicationId)
	fp.mutex.Unlock()

	log.Printf("Sending flight completed notification for application %d", flight.ApplicationId)
	err = fp.grpcClient.NotifyFlightCompleted(ctx, flight, "restricted_zone")
	if err != nil {
		log.Printf("FAILED to send flight completed notification: %v", err)
	} else {
		log.Printf("SUCCESS: Flight completed notification sent for application %d", flight.ApplicationId)
	}
}

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
		select {
		case <-fp.ctx.Done():
			return
		default:
			fp.updateSingleFlight(flight)
		}
	}
}

func (fp *FlightProcessor) updateSingleFlight(flight *structures.ActiveFlight) {
	if flight.DemoMode && fp.checkDemoPause(flight) {
		return
	}

	if flight.State == structures.FlightStatePaused {
		return
	}

	if flight.CurrentWaypoint >= len(flight.Route) {
		fp.completeFlight(flight)
		return
	}

	currentWaypoint := flight.Route[flight.CurrentWaypoint]

	newPosition := fp.calculateNewPosition(flight.CurrentPosition, currentWaypoint)

	distance := fp.calculateDistanceMeters(
		newPosition.Latitude, newPosition.Longitude,
		currentWaypoint.Latitude, currentWaypoint.Longitude,
	)

	if distance < 10.0 {
		log.Printf("Drone %d reached waypoint %d", flight.DroneId, flight.CurrentWaypoint)
		flight.CurrentWaypoint++
		if flight.CurrentWaypoint >= len(flight.Route) {
			fp.completeFlight(flight)
			return
		}
	}

	flight.CurrentPosition = newPosition
	flight.CurrentPosition.RouteProgress = fp.calculateRouteProgress(flight)

	if fp.checkRestrictedZoneProximity(flight) {
		return
	}

	err := fp.repo.SaveDronePosition(flight.CurrentPosition)
	if err != nil {
		log.Printf("Error saving drone position: %v", err)
	}

	ctx, cancel := context.WithTimeout(fp.ctx, 5*time.Second)
	defer cancel()
	err = fp.grpcClient.UpdateDronePosition(ctx, flight.CurrentPosition)
	if err != nil {
		log.Printf("Failed to send position update: %v", err)
	}

	if time.Now().Unix()%2 == 0 {
		stateInfo := ""
		if flight.State == structures.FlightStatePaused {
			stateInfo = " [PAUSED]"
		}
		demoInfo := ""
		if flight.DemoMode {
			demoInfo = " [DEMO]"
		}
		log.Printf("Drone %d%s%s: lat=%.6f, lon=%.6f, progress=%.1f%%, waypoint=%d/%d, distance_to_target=%.1fm",
			flight.DroneId, stateInfo, demoInfo, flight.CurrentPosition.Latitude, flight.CurrentPosition.Longitude,
			flight.CurrentPosition.RouteProgress, flight.CurrentWaypoint, len(flight.Route)-1, distance)
	}
}

func (fp *FlightProcessor) checkRestrictedZoneProximity(flight *structures.ActiveFlight) bool {
	const STOP_DISTANCE = 100.0

	restrictedZones := fp.getRestrictedZones()

	for _, zone := range restrictedZones {
		distanceToCenter := fp.calculateDistanceMeters(
			flight.CurrentPosition.Latitude,
			flight.CurrentPosition.Longitude,
			zone.Latitude,
			zone.Longtitude,
		)

		distanceToBorder := distanceToCenter - float64(zone.Radius)

		if distanceToBorder <= STOP_DISTANCE {
			log.Printf("PROXIMITY ALERT! Drone %d is %.1f m from zone '%s' border (stop distance: %.1f m)",
				flight.DroneId, distanceToBorder, zone.Name, STOP_DISTANCE)
			fp.stopFlightAndRemoveApplication(flight, zone, distanceToBorder)
			return true
		}
	}

	return false
}

func (fp *FlightProcessor) completeFlight(flight *structures.ActiveFlight) {
	log.Printf("Completing flight for application %d", flight.ApplicationId)

	flight.CurrentPosition.RouteProgress = 100.0

	fp.clearAlertsForFlight(flight.ApplicationId)

	err := fp.repo.UpdateApplicationStatus(flight.ApplicationId, structures.StatusCompleted, "")
	if err != nil {
		log.Printf("Error updating application status to completed: %v", err)
	}

	ctx, cancel := context.WithTimeout(fp.ctx, 10*time.Second)
	defer cancel()

	log.Printf("Sending COMPLETED status notification for application %d", flight.ApplicationId)
	fp.notifyStatusUpdate(ctx, flight.ApplicationId, structures.StatusCompleted, "Flight completed successfully. Drone has reached destination.", "")

	err = fp.grpcClient.UpdateDronePosition(ctx, flight.CurrentPosition)
	if err != nil {
		log.Printf("Failed to send final position update: %v", err)
	}

	log.Printf("Sending flight completed notification for application %d", flight.ApplicationId)
	err = fp.grpcClient.NotifyFlightCompleted(ctx, flight, "completed")
	if err != nil {
		log.Printf("FAILED to send flight completed notification: %v", err)
	} else {
		log.Printf("SUCCESS: Flight completed notification sent for application %d", flight.ApplicationId)
	}

	fp.mutex.Lock()
	delete(fp.activeFlights, flight.ApplicationId)
	fp.mutex.Unlock()
}

func (fp *FlightProcessor) calculateNewPosition(current structures.DronePosition, target structures.RoutePoint) structures.DronePosition {
	deltaLat := target.Latitude - current.Latitude
	deltaLon := target.Longitude - current.Longitude
	deltaAlt := target.Altitude - current.Altitude

	distance := math.Sqrt(deltaLat*deltaLat + deltaLon*deltaLon)

	speedDegPerSec := fp.config.FlightSpeedMS / 111320.0

	if distance < speedDegPerSec {
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

	ratio := speedDegPerSec / distance
	newLat := current.Latitude + deltaLat*ratio
	newLon := current.Longitude + deltaLon*ratio
	newAlt := current.Altitude + deltaAlt*ratio

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

func (fp *FlightProcessor) calculateRouteProgress(flight *structures.ActiveFlight) float64 {
	if len(flight.Route) < 2 {
		return 100.0
	}

	totalDistance := fp.calculateRouteDistanceMeters(flight.Route)
	if totalDistance <= 0 {
		return 100.0
	}

	startPoint := flight.Route[0]
	currentDistanceFromStart := fp.calculateDistanceMeters(
		startPoint.Latitude, startPoint.Longitude,
		flight.CurrentPosition.Latitude, flight.CurrentPosition.Longitude,
	)

	progress := (currentDistanceFromStart / totalDistance) * 100

	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}

	return progress
}

func (fp *FlightProcessor) calculateDistanceMeters(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
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

	return totalDistance
}

func (fp *FlightProcessor) clearAlertsForFlight(applicationId int) {
	fp.alertsMutex.Lock()
	defer fp.alertsMutex.Unlock()

	for key := range fp.sentAlerts {
		if len(key) > 0 && key[0:1] == string(rune(applicationId)) {
			delete(fp.sentAlerts, key)
		}
	}
}
