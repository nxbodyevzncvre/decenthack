"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, useMap, Circle, Popup } from "react-leaflet"
import {
  Plane,
  Battery,
  MapPin,
  Navigation,
  Clock,
  Signal,
  Route,
  Wifi,
  WifiOff,
  Play,
  Square,
  RefreshCw,
} from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Toast from "@/app/components/Toast/Toast.jsx"
import axios from "axios"
import { now } from "lodash"

// В начале файла, добавить функцию для получения иконки статуса
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "одобрена":
      return "✅"
    case "rejected":
    case "отклонена":
      return "❌"
    case "pending":
    case "на рассмотрении":
      return "⏳"
    case "cancelled":
    case "отменена":
      return "🚫"
    case "in_progress":
    case "в процессе":
      return "🔄"
    default:
      return "📋"
  }
}

// Добавить функцию для получения иконки погоды после функции getStatusIcon:
const getWeatherIcon = (weatherMain) => {
  switch (weatherMain?.toLowerCase()) {
    case "clear":
      return "☀️"
    case "clouds":
      return "☁️"
    case "rain":
      return "🌧️"
    case "snow":
      return "❄️"
    case "thunderstorm":
      return "⛈️"
    case "drizzle":
      return "🌦️"
    case "mist":
    case "fog":
      return "🌫️"
    default:
      return "🌤️"
  }
}

const getWindDirection = (degrees) => {
  const directions = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"]
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

const getFlightConditions = (weather) => {
  if (!weather) return { status: "unknown", text: "Нет данных", color: "text-gray-600" }

  const { wind, main, weather: weatherArray } = weather
  const windSpeed = wind?.speed || 0
  const temp = main?.temp || 0
  const weatherMain = weatherArray?.[0]?.main?.toLowerCase()

  // Критерии для полетов дронов
  if (windSpeed > 8 || temp < -15 || temp > 35 || weatherMain === "thunderstorm") {
    return { status: "bad", text: "Неблагоприятные", color: "text-red-600" }
  } else if (windSpeed > 5 || temp < -5 || temp > 30 || weatherMain === "rain" || weatherMain === "snow") {
    return { status: "caution", text: "Осторожно", color: "text-yellow-600" }
  } else {
    return { status: "good", text: "Благоприятные", color: "text-green-600" }
  }
}

export default function DroneTracker() {
  // Добавить состояние для погодных данных в начале компонента:
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [drones, setDrones] = useState(new Map())
  const [selectedDrone, setSelectedDrone] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [dangerZones, setDangerZones] = useState([])
  const [messages, setMessages] = useState([])
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const messageIdRef = useRef(0)
  const droneMarkers = useRef(new Map())
  const droneAnimations = useRef(new Map())
  const mapRef = useRef(null)
  const connectionAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)

  const center = [51.12, 71.43]

  // Создаем SVG иконки для дронов с уникальными цветами
  const createDroneSvg = (size = 24, color = "#3b82f6", isSelected = false) => {
    const svgSize = isSelected ? size + 8 : size
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="${isSelected ? "11" : "10"}" fill="white" stroke="${color}" strokeWidth="2"/>
        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="${color}"/>
        ${isSelected ? '<circle cx="12" cy="12" r="3" fill="white"/>' : ""}
      </svg>
    `)}`
  }

  // Функция для получения уникального цвета для каждого дрона
  const getDroneColor = (droneId, isSelected = false) => {
    if (isSelected) return "#ef4444"

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#f97316"]
    const index = Number.parseInt(droneId.toString()) % colors.length
    return colors[index]
  }

  const addMessage = useCallback((message, type) => {
    const newMessage = {
      id: `msg-${messageIdRef.current++}`,
      timestamp: new Date().toLocaleTimeString("ru-RU"),
      message,
      type,
    }

    setMessages((prev) => [newMessage, ...prev.slice(0, 49)])
  }, [])

  // Исправленная функция подключения без зависимости от состояния
  const connect = useCallback(() => {
    // Предотвращаем множественные подключения
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return
    }

    isConnectingRef.current = true
    setIsConnecting(true)

    try {
      wsRef.current = new WebSocket("ws://localhost:5050/ws")

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        isConnectingRef.current = false
        connectionAttemptsRef.current = 0
        addMessage("🔗 WebSocket подключен", "connection")
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleMessage(data)
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        setIsConnecting(false)
        isConnectingRef.current = false

        // Только показываем сообщение при первом отключении
        if (connectionAttemptsRef.current === 0) {
          addMessage("🔗 WebSocket отключен", "connection")
        }

        // Автоматическое переподключение только если не было ручного отключения
        if (!event.wasClean && connectionAttemptsRef.current < 5) {
          connectionAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      }

      wsRef.current.onerror = (error) => {
        setIsConnecting(false)
        isConnectingRef.current = false

        // Показываем ошибку только при первой попытке
        if (connectionAttemptsRef.current === 0) {
          addMessage("❌ Ошибка WebSocket подключения", "connection")
        }
        console.error("WebSocket error:", error)
      }
    } catch (error) {
      setIsConnecting(false)
      isConnectingRef.current = false
      if (connectionAttemptsRef.current === 0) {
        addMessage("❌ Не удалось подключиться к WebSocket", "connection")
      }
    }
  }, [addMessage])

  const disconnect = useCallback(() => {
    // Очищаем таймер переподключения
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Закрываем соединение
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect") // Код 1000 = нормальное закрытие
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    isConnectingRef.current = false
    connectionAttemptsRef.current = 0
  }, [])

  const createDronePopup = (drone) => {
    return `
      <div style="min-width: 200px;">
        <h4 style="font-weight: medium; color: #4a5568;">${drone.serial_number}</h4>
        <div style="margin-top: 8px; space-y: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Статус:</span>
            <span style="color: ${getStatusColor(drone.status).split(" ")[0]};">
              ${getStatusText(drone.status)}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Батарея:</span>
            <span style="color: ${getBatteryColor(drone.battery)};">${drone.battery}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Высота:</span>
            <span>${drone.currentPosition?.altitude}м</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Скорость:</span>
            <span style="color: ${getBatteryColor(drone.battery)};">${drone.currentPosition?.speed.toFixed(1)} м/с</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Прогресс:</span>
            <span>${drone.currentPosition?.route_progress.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `
  }

  const smoothMoveMarker = (marker, fromLatLng, toLatLng, duration = 2000) => {
    const droneId = Array.from(droneMarkers.current.entries()).find(([_, m]) => m === marker)?.[0]

    if (droneAnimations.current.has(droneId)) {
      cancelAnimationFrame(droneAnimations.current.get(droneId))
    }

    const startTime = Date.now()
    const distance = fromLatLng.distanceTo(toLatLng)
    const adaptiveDuration = Math.min(duration, Math.max(500, distance * 100))

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / adaptiveDuration, 1)

      // Используем easing функцию для более плавного движения
      const easeProgress = 1 - Math.pow(1 - progress, 3) // easeOutCubic

      const lat = fromLatLng.lat + (toLatLng.lat - fromLatLng.lat) * easeProgress
      const lng = fromLatLng.lng + (toLatLng.lng - fromLatLng.lng) * easeProgress

      marker.setLatLng([lat, lng])

      if (progress < 1) {
        const animationId = requestAnimationFrame(animate)
        droneAnimations.current.set(droneId, animationId)
      } else {
        droneAnimations.current.delete(droneId)
      }
    }

    const animationId = requestAnimationFrame(animate)
    droneAnimations.current.set(droneId, animationId)
  }

  // Функция для удаления маркера дрона с карты
  const removeDroneFromMap = useCallback((droneId) => {
    const map = mapRef.current
    if (!map) return

    // Удаляем маркер
    if (droneMarkers.current.has(droneId)) {
      const marker = droneMarkers.current.get(droneId)
      map.removeLayer(marker)
      droneMarkers.current.delete(droneId)
    }

    // Останавливаем анимацию
    if (droneAnimations.current.has(droneId)) {
      cancelAnimationFrame(droneAnimations.current.get(droneId))
      droneAnimations.current.delete(droneId)
    }
  }, [])

  // Функция для обновления всех иконок дронов
  const updateAllDroneIcons = useCallback(() => {
    droneMarkers.current.forEach((marker, droneId) => {
      const drone = drones.get(droneId)
      if (drone && drone.status === "flying") {
        const isSelected = selectedDrone && selectedDrone.drone_id === droneId
        const color = getDroneColor(droneId, isSelected)
        const icon = L.icon({
          iconUrl: createDroneSvg(isSelected ? 32 : 24, color, isSelected),
          iconSize: isSelected ? [32, 32] : [24, 24],
          iconAnchor: isSelected ? [16, 16] : [12, 12],
          popupAnchor: [0, isSelected ? -16 : -12],
        })
        marker.setIcon(icon)
      } else {
        // Удаляем маркер если дрон не летает
        removeDroneFromMap(droneId)
      }
    })
  }, [selectedDrone, drones, removeDroneFromMap])

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type })
  }, [])

  // Функция для вычисления расстояния между двумя точками (формула Haversine)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000 // Радиус Земли в метрах
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Расстояние в метрах
  }, [])

  // Функция для проверки приближения к запретным зонам
  const checkRestrictedZones = useCallback(
    (drone) => {
      if (!drone.currentPosition || dangerZones.length === 0) return

      const dronePos = drone.currentPosition
      const nowTime = now()

      dangerZones.forEach((zone) => {
        const distance = calculateDistance(dronePos.latitude, dronePos.longitude, zone.latitude, zone.longtitude)

        // Предупреждение если дрон в пределах радиуса зоны + 50 метров буферной зоны
        const warningDistance = zone.radius + 50

        if (distance <= warningDistance && distance > zone.radius) {
          // Проверяем, не показывали ли мы уже предупреждение для этого дрона и зоны
          const warningKey = `${drone.drone_id}-${zone.restrictedZone_id}`
          const lastWarning = localStorage.getItem(`warning-${warningKey}`)

          // Показываем предупреждение не чаще чем раз в 30 секунд
          if (!lastWarning || nowTime - Number.parseInt(lastWarning) > 30000) {
            showToast(
              `⚠️ Дрон ${drone.serial_number} приближается к запретной зоне "${zone.zone_name}" (${Math.round(distance)}м)`,
              "warning",
            )
            addMessage(
              `⚠️ Дрон ${drone.drone_id}: Предупреждение о запретной зоне ${zone.zone_name} (расстояние: ${Math.round(distance)}м)`,
              "warning",
            )
            localStorage.setItem(`warning-${warningKey}`, nowTime.toString())
          }
        } else if (distance <= zone.radius) {
          // Критическое предупреждение - дрон в запретной зоне
          const criticalKey = `${drone.drone_id}-${zone.restrictedZone_id}-critical`
          const lastCritical = localStorage.getItem(`critical-${criticalKey}`)

          if (!lastCritical || nowTime - Number.parseInt(lastCritical) > 10000) {
            showToast(`🚨 КРИТИЧНО! Дрон ${drone.serial_number} в запретной зоне "${zone.zone_name}"!`, "error")
            addMessage(`🚨 Дрон ${drone.drone_id}: НАРУШЕНИЕ! Вход в запретную зону ${zone.zone_name}`, "warning")
            localStorage.setItem(`critical-${criticalKey}`, nowTime.toString())
          }
        }
      })
    },
    [dangerZones, calculateDistance, showToast, addMessage],
  )

  function updateDroneOnMap(drone) {
    // Показываем только летающие дроны
    if (!drone.currentPosition || drone.status !== "flying") {
      // Если дрон не летает, удаляем его с карты
      removeDroneFromMap(drone.drone_id)
      return
    }

    const position = [drone.currentPosition.latitude, drone.currentPosition.longitude]
    const isSelected = selectedDrone && selectedDrone.drone_id === drone.drone_id
    const color = getDroneColor(drone.drone_id, isSelected)
    const map = mapRef.current

    // Обновляем маркер с улучшенной плавной анимацией
    if (droneMarkers.current.has(drone.drone_id)) {
      const marker = droneMarkers.current.get(drone.drone_id)
      const currentLatLng = marker.getLatLng()
      const newLatLng = L.latLng(position[0], position[1])

      // Проверяем значимое изменение позиции
      const distance = currentLatLng.distanceTo(newLatLng)
      if (distance > 0.5) {
        // Минимальное расстояние 0.5 метра
        smoothMoveMarker(marker, currentLatLng, newLatLng)
      }

      marker.getPopup().setContent(createDronePopup(drone))
    } else {
      const icon = L.icon({
        iconUrl: createDroneSvg(isSelected ? 32 : 24, color, isSelected),
        iconSize: isSelected ? [32, 32] : [24, 24],
        iconAnchor: isSelected ? [16, 16] : [12, 12],
        popupAnchor: [0, isSelected ? -16 : -12],
      })

      const marker = L.marker(position, { icon }).addTo(map)

      marker.bindPopup(createDronePopup(drone))
      marker.on("click", () => setSelectedDrone(drone))
      droneMarkers.current.set(drone.drone_id, marker)
    }

    // Проверяем приближение к запретным зонам
    checkRestrictedZones(drone)
  }

  const handleMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "status_update":
          const statusMessage = `📋 Заявка ${data.application_id}: ${data.status} - ${data.message}`
          addMessage(statusMessage, "status-update")

          // Показываем toast для важных статусов
          if (data.status === "rejected" || data.status === "отклонена") {
            showToast(`❌ Заявка ${data.application_id} отклонена${data.message ? `: ${data.message}` : ""}`, "error")
          } else if (data.status === "approved" || data.status === "одобрена") {
            showToast(`✅ Заявка ${data.application_id} одобрена${data.message ? `: ${data.message}` : ""}`, "success")
          } else if (data.status === "pending" || data.status === "на рассмотрении") {
            showToast(
              `⏳ Заявка ${data.application_id} на рассмотрении${data.message ? `: ${data.message}` : ""}`,
              "warning",
            )
          } else if (data.status === "cancelled" || data.status === "отменена") {
            showToast(`🚫 Заявка ${data.application_id} отменена${data.message ? `: ${data.message}` : ""}`, "warning")
          } else {
            // Для других статусов показываем общее уведомление
            showToast(
              `📋 Заявка ${data.application_id}: ${data.status}${data.message ? ` - ${data.message}` : ""}`,
              "success",
            )
          }
          break

        case "restricted_zone_warning":
          // Показываем toast уведомление для предупреждений о запретных зонах
          showToast(`⚠️ Дрон ${data.drone_id} приближается к запретной зоне: ${data.zone_name}`, "warning")
          addMessage(`⚠️ Дрон ${data.drone_id}: Предупреждение о запретной зоне ${data.zone_name}`, "warning")
          break

        case "flight_started":
          if (data.application_id && data.drone_id && data.pilot_id) {
            const flightData = {
              application_id: data.application_id,
              drone_id: data.drone_id,
              pilot_id: data.pilot_id,
            }

            setDrones((prev) => {
              const newDrones = new Map(prev)
              const existingDrone = newDrones.get(data.drone_id) || {
                drone_id: data.drone_id,
                serial_number: `Drone-${data.drone_id}`,
                model_name: "Unknown Model",
                brand: "Unknown Brand",
                battery: Math.max(20, 100 - Math.floor(Math.random() * 50)),
                signal: Math.max(50, 100 - Math.floor(Math.random() * 30)),
                status: "flying",
                positions: [],
                lastUpdate: new Date().toISOString(),
              }

              newDrones.set(data.drone_id, {
                ...existingDrone,
                flightData,
                status: "flying",
              })

              return newDrones
            })

            addMessage(`🚁 Полет начат: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "flight-started")
            showToast(`🚁 Полет начат: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "success")
          }
          break

        case "position_update":
          if (data.application_id && data.drone_id && data.latitude && data.longitude) {
            const position = {
              application_id: data.application_id,
              drone_id: data.drone_id,
              latitude: data.latitude,
              longitude: data.longitude,
              altitude: data.altitude || 0,
              speed: data.speed || 0,
              route_progress: data.route_progress || 0,
              timestamp: new Date().toISOString(),
            }

            setDrones((prev) => {
              const newDrones = new Map(prev)
              const existingDrone = newDrones.get(data.drone_id) || {
                drone_id: data.drone_id,
                serial_number: `Drone-${data.drone_id}`,
                model_name: "Unknown Model",
                brand: "Unknown Brand",
                battery: Math.max(20, 100 - Math.floor(Math.random() * 50)),
                signal: Math.max(50, 100 - Math.floor(Math.random() * 30)),
                status: "flying",
                positions: [],
                lastUpdate: new Date().toISOString(),
              }

              // Проверяем значимое изменение позиции для уменьшения дрожания
              const lastPosition = existingDrone.currentPosition
              const shouldUpdate =
                !lastPosition ||
                Math.abs(lastPosition.latitude - position.latitude) > 0.00001 ||
                Math.abs(lastPosition.longitude - position.longitude) > 0.00001

              if (shouldUpdate) {
                const newPositions = [...existingDrone.positions, position]

                newDrones.set(data.drone_id, {
                  ...existingDrone,
                  positions: newPositions,
                  currentPosition: position,
                  lastUpdate: new Date().toISOString(),
                })
              }

              return newDrones
            })

            // Показываем только каждое 10-е обновление позиции
            if (Number.parseInt(data.application_id) % 10 === 0) {
              addMessage(
                `📍 Дрон ${data.drone_id}: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}, прогресс=${data.route_progress?.toFixed(1)}%`,
                "position-update",
              )
            }
          }
          break

        case "flight_completed":
          if (data.application_id && data.drone_id) {
            setDrones((prev) => {
              const newDrones = new Map(prev)
              const existingDrone = newDrones.get(data.drone_id)
              if (existingDrone) {
                newDrones.set(data.drone_id, {
                  ...existingDrone,
                  status: "idle",
                  flightData: undefined,
                })
              }
              return newDrones
            })

            // Убираем дрон с карты когда полет завершен
            removeDroneFromMap(data.drone_id)

            // Если завершенный дрон был выбран, сбрасываем выбор
            setSelectedDrone((prev) => {
              if (prev && prev.drone_id === data.drone_id) {
                return null
              }
              return prev
            })

            addMessage(`🏁 Полет завершен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "flight-completed")
            showToast(`🏁 Полет завершен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "success")
          }
          break
      }
    },
    [addMessage, removeDroneFromMap, showToast],
  )

  const fetchDangerZones = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await axios.get("http://localhost:5050/auth/zones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setDangerZones(response.data.zones || [])
    } catch (err) {
      console.error("Error fetching danger zones:", err)
      setDangerZones([])
    }
  }

  // Добавить функцию для получения погодных данных после функции fetchDangerZones:
  const fetchWeatherData = async () => {
    setWeatherLoading(true)
    try {
      const API_KEY = "56bca329a171141090d33ab607b33d5f"
      const lat = center[0]
      const lon = center[1]

      // Реальный запрос к OpenWeatherMap API
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`,
      )

      const weatherData = response.data

      // Преобразуем данные в нужный формат
      const formattedWeatherData = {
        main: {
          temp: Math.round(weatherData.main.temp),
          feels_like: Math.round(weatherData.main.feels_like),
          humidity: weatherData.main.humidity,
          pressure: weatherData.main.pressure,
        },
        wind: {
          speed: weatherData.wind?.speed || 0,
          deg: weatherData.wind?.deg || 0,
        },
        weather: weatherData.weather,
        visibility: weatherData.visibility || 10000,
        name: weatherData.name || "Астана",
      }

      setWeatherData(formattedWeatherData)
      addMessage(
        `🌤️ Погода обновлена: ${formattedWeatherData.main.temp}°C, ${formattedWeatherData.weather[0]?.description}`,
        "weather",
      )
    } catch (error) {
      console.error("Error fetching weather data:", error)
      addMessage("❌ Ошибка получения данных о погоде", "connection")

      // В случае ошибки показываем fallback данные
      const fallbackWeatherData = {
        main: {
          temp: -2,
          feels_like: -5,
          humidity: 75,
          pressure: 1013,
        },
        wind: {
          speed: 3.5,
          deg: 180,
        },
        weather: [
          {
            main: "Clouds",
            description: "облачно с прояснениями",
            icon: "02d",
          },
        ],
        visibility: 9000,
        name: "Астана",
      }
      setWeatherData(fallbackWeatherData)
    } finally {
      setWeatherLoading(false)
    }
  }

  // Обновляем иконки при изменении выбранного дрона
  useEffect(() => {
    updateAllDroneIcons()
  }, [selectedDrone, updateAllDroneIcons])

  // Исправленный useEffect без зависимостей от функций
  useEffect(() => {
    fetchDangerZones()
    // Добавить вызов fetchWeatherData в useEffect после fetchDangerZones():
    fetchWeatherData()
    // Обновляем погоду каждые 10 минут
    const weatherInterval = setInterval(fetchWeatherData, 600000)
    connect()

    return () => {
      disconnect()
      // Добавить очистку интервала в cleanup функцию useEffect:
      if (weatherInterval) clearInterval(weatherInterval)
      // Очищаем анимации
      droneAnimations.current.forEach((animationId) => {
        cancelAnimationFrame(animationId)
      })
      droneAnimations.current.clear()

      // Очищаем маркеры и траектории
      droneMarkers.current.forEach((marker) => mapRef.current?.removeLayer(marker))
      droneMarkers.current.clear()
    }
  }, []) // Убрали зависимости!

  const clearMessages = () => {
    setMessages([])
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "flying":
        return "text-blue-600 bg-blue-100"
      case "idle":
        return "text-yellow-600 bg-yellow-100"
      case "charging":
        return "text-purple-600 bg-purple-100"
      case "maintenance":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "flying":
        return "В полёте"
      case "idle":
        return "Ожидание"
      case "charging":
        return "Зарядка"
      case "maintenance":
        return "Обслуживание"
      default:
        return "Неизвестно"
    }
  }

  const getBatteryColor = (battery) => {
    if (battery > 50) return "text-green-600"
    if (battery > 20) return "text-yellow-600"
    return "text-red-600"
  }

  const getMessageTypeColor = (type) => {
    switch (type) {
      case "flight-started":
        return "text-green-600"
      case "flight-completed":
        return "text-blue-600"
      case "position-update":
        return "text-gray-600"
      case "status-update":
        return "text-purple-600"
      case "warning":
        return "text-orange-600"
      case "connection":
        return "text-purple-600"
      case "weather":
        return "text-blue-600"
      case "application-approved":
        return "text-green-600"
      case "application-rejected":
        return "text-red-600"
      case "application-pending":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  function MapController() {
    const map = useMap()

    useEffect(() => {
      mapRef.current = map

      if (selectedDrone?.currentPosition && selectedDrone?.status === "flying") {
        map.flyTo([selectedDrone.currentPosition.latitude, selectedDrone.currentPosition.longitude], 15, {
          duration: 1.5,
        })
      }

      // Обновляем только летающие дроны на карте
      const flyingDrones = Array.from(drones.values()).filter((drone) => drone.status === "flying")
      flyingDrones.forEach((drone) => {
        updateDroneOnMap(drone)
      })

      // Удаляем с карты дроны, которые больше не летают
      const allDroneIds = Array.from(drones.keys())
      const flyingDroneIds = flyingDrones.map((drone) => drone.drone_id)

      allDroneIds.forEach((droneId) => {
        if (!flyingDroneIds.includes(droneId) && droneMarkers.current.has(droneId)) {
          removeDroneFromMap(droneId)
        }
      })
    }, [selectedDrone?.currentPosition, map, drones])

    return null
  }

  // Фильтруем только летающие дроны для отображения
  const flyingDrones = Array.from(drones.values()).filter((drone) => drone.status === "flying")
  const allDrones = Array.from(drones.values())

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Заголовок с управлением подключением */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Отслеживание дронов в реальном времени</h2>
            <p className="text-sm text-gray-600">WebSocket подключение для мониторинга полетов</p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Статус подключения */}
            <div className="flex items-center space-x-2">
              {isConnected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
              <span className={`text-sm font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}>
                {isConnecting ? "Подключение..." : isConnected ? "Подключено" : "Отключено"}
              </span>
            </div>

            {/* Кнопки управления */}
            <div className="flex space-x-2">
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Square className="h-4 w-4" />
                  <span>Отключить</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    connectionAttemptsRef.current = 0
                    connect()
                  }}
                  disabled={isConnecting}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  <span>Подключить</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Боковое меню с дронами и логами */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Список дронов */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Летающие дроны ({flyingDrones.length})</h3>
            </div>

            {flyingDrones.length === 0 ? (
              <div className="text-center py-6">
                <Plane className="h-6 w-6 text-gray-400 mx-auto" />
                <p className="mt-2 text-xs text-gray-600">Нет летающих дронов</p>
                <p className="text-xs text-gray-500">Ожидание данных от WebSocket...</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {flyingDrones.map((drone) => {
                  const droneColor = getDroneColor(drone.drone_id, selectedDrone?.drone_id === drone.drone_id)
                  return (
                    <div
                      key={drone.drone_id}
                      onClick={() => setSelectedDrone(drone)}
                      className={`p-2 rounded-md border cursor-pointer transition-all hover:shadow-sm ${
                        selectedDrone?.drone_id === drone.drone_id
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          <div
                            className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: droneColor }}
                          />
                          <span className="text-xs font-medium text-gray-900 truncate">{drone.serial_number}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(drone.status)}`}
                        >
                          {getStatusText(drone.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Battery className="h-2.5 w-2.5" />
                            <span className={getBatteryColor(drone.battery)}>{drone.battery}%</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Signal className="h-2.5 w-2.5" />
                            <span className="text-gray-600">{drone.signal}%</span>
                          </div>
                        </div>
                      </div>

                      {drone.currentPosition && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Позиций:</span>
                              <span>{drone.positions.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Прогресс:</span>
                              <span>{drone.currentPosition.route_progress.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Скорость:</span>
                              <span>{drone.currentPosition.speed.toFixed(1)} м/с</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {drone.flightData && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <Route className="h-2.5 w-2.5" />
                            <span className="truncate">Заявка #{drone.flightData.application_id}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Лог сообщений */}
          <div className="h-32 border-t border-gray-200 flex flex-col">
            <div className="flex items-center justify-between p-2 bg-gray-50">
              <h4 className="text-xs font-medium text-gray-900">Лог событий</h4>
              <button onClick={clearMessages} className="text-xs text-gray-600 hover:text-gray-900">
                Очистить
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {messages.slice(0, 20).map((msg) => (
                <div key={msg.id} className="text-xs leading-tight">
                  <span className="text-gray-500">[{msg.timestamp}]</span>{" "}
                  <span className={getMessageTypeColor(msg.type)}>{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Карта */}
        <div className="flex-1 relative">
          <MapContainer
            center={
              selectedDrone?.currentPosition && selectedDrone?.status === "flying"
                ? [selectedDrone.currentPosition.latitude, selectedDrone.currentPosition.longitude]
                : center
            }
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {dangerZones.map((zone) => (
              <Circle
                key={zone.restrictedZone_id}
                center={[zone.latitude, zone.longtitude]}
                radius={zone.radius}
                pathOptions={{
                  color: "red",
                  fillColor: "red",
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              >
                <Popup>
                  <div>
                    <h4 className="font-medium text-red-600">⚠️ {zone.zone_name}</h4>
                    <p className="text-sm text-gray-600">Радиус: {zone.radius}м</p>
                    <p className="text-sm text-gray-600">Высота: {zone.altitude}м</p>
                    <p className="text-sm text-red-600 font-medium">Полный запрет полётов</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            <MapController />
          </MapContainer>

          {/* Информационная панель выбранного дрона */}
          {selectedDrone && selectedDrone.currentPosition && selectedDrone.status === "flying" && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[300px] border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: getDroneColor(selectedDrone.drone_id, true) }}
                  />
                  <h4 className="font-medium text-gray-900">{selectedDrone.serial_number}</h4>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedDrone.status)}`}>
                  {getStatusText(selectedDrone.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="flex items-center space-x-2">
                  <Battery className="h-4 w-4 text-gray-400" />
                  <span className={getBatteryColor(selectedDrone.battery)}>{selectedDrone.battery}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Signal className="h-4 w-4 text-gray-400" />
                  <span>{selectedDrone.signal}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4 text-gray-400" />
                  <span>{selectedDrone.currentPosition.altitude}м</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{selectedDrone.currentPosition.speed.toFixed(1)} м/с</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-xs">
                    {selectedDrone.currentPosition.latitude.toFixed(6)},{" "}
                    {selectedDrone.currentPosition.longitude.toFixed(6)}
                  </span>
                </div>

                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-600">
                    <div>Прогресс маршрута: {selectedDrone.currentPosition.route_progress.toFixed(1)}%</div>
                    <div>Точек траектории: {selectedDrone.positions.length}</div>
                    <div>Последнее обновление: {new Date(selectedDrone.lastUpdate).toLocaleTimeString("ru-RU")}</div>
                  </div>
                </div>

                {selectedDrone.flightData && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <Route className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-700">Активный полет</p>
                    </div>
                    <div className="text-xs text-gray-600">
                      <div>Заявка: {selectedDrone.flightData.application_id}</div>
                      <div>Пилот: {selectedDrone.flightData.pilot_id}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Виджет погоды */}
          {weatherData && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 min-w-[280px] border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getWeatherIcon(weatherData.weather[0]?.main)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{weatherData.name}</h4>
                    <p className="text-xs text-gray-600">{weatherData.weather[0]?.description}</p>
                  </div>
                </div>
                <button
                  onClick={fetchWeatherData}
                  disabled={weatherLoading}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${weatherLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🌡️</span>
                  <div>
                    <div className="font-medium">{weatherData.main.temp}°C</div>
                    <div className="text-xs text-gray-600">Ощущается {weatherData.main.feels_like}°C</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💨</span>
                  <div>
                    <div className="font-medium">{weatherData.wind.speed} м/с</div>
                    <div className="text-xs text-gray-600">{getWindDirection(weatherData.wind.deg)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💧</span>
                  <div>
                    <div className="font-medium">{weatherData.main.humidity}%</div>
                    <div className="text-xs text-gray-600">Влажность</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="font-medium">{weatherData.main.pressure} гПа</div>
                    <div className="text-xs text-gray-600">Давление</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Видимость:</span>
                    <span className="text-sm font-medium">{(weatherData.visibility / 1000).toFixed(1)} км</span>
                  </div>
                </div>

                <div className="mt-2 p-2 rounded-md bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Условия для полетов:</span>
                    <span className={`text-sm font-medium ${getFlightConditions(weatherData).color}`}>
                      {getFlightConditions(weatherData).text}
                    </span>
                  </div>
                  {getFlightConditions(weatherData).status === "bad" && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Полеты не рекомендуются</p>
                  )}
                  {getFlightConditions(weatherData).status === "caution" && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ Соблюдайте осторожность</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Нижняя панель со статистикой */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          {/* Обновить статистику в нижней панели, добавив информацию о погоде: */}
          <div className="text-sm text-gray-600">
            Всего дронов: {Array.from(drones.keys()).length} | В полёте: {flyingDrones.length} | Активных полетов:{" "}
            {flyingDrones.filter((d) => d.flightData).length} | Сообщений: {messages.length}
            {weatherData && (
              <span className="ml-4">
                | Погода: {weatherData.main.temp}°C, ветер {weatherData.wind.speed} м/с
                <span className={`ml-1 ${getFlightConditions(weatherData).color}`}>
                  ({getFlightConditions(weatherData).text})
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>WebSocket</span>
            </div>
          </div>
        </div>
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  )
}
