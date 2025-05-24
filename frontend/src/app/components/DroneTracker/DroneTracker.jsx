"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import { Plane, Battery, MapPin, Navigation, Clock, Signal, Route, Wifi, WifiOff, Play, Square } from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Toast from "@/app/components/Toast/Toast.jsx" // путь к вашему Toast компоненту

export default function DroneTracker() {
  const [drones, setDrones] = useState(new Map())
  const [selectedDrone, setSelectedDrone] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [messages, setMessages] = useState([])
  const [showTrail, setShowTrail] = useState(true)
  const [maxTrailPoints, setMaxTrailPoints] = useState(50)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const messageIdRef = useRef(0)
  const droneMarkers = useRef(new Map())
  const droneTrails = useRef(new Map())
  const droneAnimations = useRef(new Map())
  const mapRef = useRef(null)

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

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setIsConnecting(true)

    try {
      wsRef.current = new WebSocket("ws://localhost:5050/ws")

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionAttempts(0)
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

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)

        // Только показываем сообщение при первом отключении
        if (connectionAttempts === 0) {
          addMessage("🔗 WebSocket отключен", "connection")
        }

        // Ограничиваем количество попыток переподключения
        if (connectionAttempts < 5) {
          setConnectionAttempts((prev) => prev + 1)
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }

      wsRef.current.onerror = (error) => {
        setIsConnecting(false)

        // Показываем ошибку только при первой попытке
        if (connectionAttempts === 0) {
          addMessage("❌ Ошибка WebSocket подключения", "connection")
        }
        console.error("WebSocket error:", error)
      }
    } catch (error) {
      setIsConnecting(false)
      if (connectionAttempts === 0) {
        addMessage("❌ Не удалось подключиться к WebSocket", "connection")
      }
    }
  }, [addMessage, connectionAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setConnectionAttempts(0)
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
            <span>${drone.currentPosition?.speed.toFixed(1)} м/с</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Прогресс:</span>
            <span>${drone.currentPosition?.route_progress.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `
  }

  // Улучшенная функция плавной анимации
  const smoothMoveMarker = (marker, fromLatLng, toLatLng, duration = 2000) => {
    const droneId = Array.from(droneMarkers.current.entries()).find(([_, m]) => m === marker)?.[0]

    if (droneAnimations.current.has(droneId)) {
      cancelAnimationFrame(droneAnimations.current.get(droneId))
    }

    const startTime = Date.now()
    const distance = fromLatLng.distanceTo(toLatLng)

    // Адаптивная длительность анимации в зависимости от расстояния
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

  // Функция для обновления всех иконок дронов
  const updateAllDroneIcons = useCallback(() => {
    droneMarkers.current.forEach((marker, droneId) => {
      const drone = drones.get(droneId)
      if (drone) {
        const isSelected = selectedDrone && selectedDrone.drone_id === droneId
        const color = getDroneColor(droneId, isSelected)
        const icon = L.icon({
          iconUrl: createDroneSvg(isSelected ? 32 : 24, color, isSelected),
          iconSize: isSelected ? [32, 32] : [24, 24],
          iconAnchor: isSelected ? [16, 16] : [12, 12],
          popupAnchor: [0, isSelected ? -16 : -12],
        })
        marker.setIcon(icon)
      }
    })

    // Обновляем стили траекторий
    droneTrails.current.forEach((trail, droneId) => {
      const isSelected = selectedDrone && selectedDrone.drone_id === droneId
      const color = getDroneColor(droneId, isSelected)
      trail.setStyle({
        color: color,
        weight: isSelected ? 4 : 2,
        opacity: isSelected ? 0.9 : 0.6,
      })
    })
  }, [selectedDrone, drones])

  function updateDroneOnMap(drone) {
    if (!drone.currentPosition) return

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

    // Обновляем траекторию с улучшенным стилем
    if (showTrail && drone.positions.length > 1) {
      const trail = drone.positions.map((pos) => [pos.latitude, pos.longitude])

      if (droneTrails.current.has(drone.drone_id)) {
        const polyline = droneTrails.current.get(drone.drone_id)
        polyline.setLatLngs(trail)
      } else {
        const polyline = L.polyline(trail, {
          color: color,
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 0.9 : 0.6,
          smoothFactor: 2.0,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map)

        polyline.bindPopup(`
          <div>
            <h4 style="color: ${color}; margin: 0 0 8px 0;">📍 Траектория полёта</h4>
            <p style="margin: 0; font-size: 13px;">Дрон: ${drone.serial_number}</p>
            <p style="margin: 0; font-size: 13px;">Точек: ${drone.positions.length}</p>
          </div>
        `)

        droneTrails.current.set(drone.drone_id, polyline)
      }
    }
  }

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
  }

  const handleMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "status_update":
          addMessage(`📋 Заявка ${data.application_id}: ${data.status} - ${data.message}`, "status-update")
          break

        case "restricted_zone_warning":
          // Показываем toast уведомление для предупреждений о запретных зонах
          showToast(`⚠️ Дрон ${data.drone_id} приближается к запретной зоне: ${data.zone_name}`, "error")
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
                const newPositions = [...existingDrone.positions, position].slice(-maxTrailPoints)

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

            addMessage(`🏁 Полет завершен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "flight-completed")

            showToast(`🏁 Полет завершен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "success")
          }
          break
      }
    },
    [addMessage, maxTrailPoints],
  )

  // Обновляем иконки при изменении выбранного дрона
  useEffect(() => {
    updateAllDroneIcons()
  }, [selectedDrone, updateAllDroneIcons])

  useEffect(() => {
    connect()

    return () => {
      disconnect()

      // Очищаем анимации
      droneAnimations.current.forEach((animationId) => {
        cancelAnimationFrame(animationId)
      })
      droneAnimations.current.clear()

      // Очищаем маркеры и траектории
      droneMarkers.current.forEach((marker) => mapRef.current?.removeLayer(marker))
      droneTrails.current.forEach((trail) => mapRef.current?.removeLayer(trail))
      droneMarkers.current.clear()
      droneTrails.current.clear()
    }
  }, [connect, disconnect])

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
        return "text-yellow-600"
      case "warning":
        return "text-orange-600"
      case "connection":
        return "text-purple-600"
      default:
        return "text-gray-600"
    }
  }

  function MapController() {
    const map = useMap()

    useEffect(() => {
      mapRef.current = map

      if (selectedDrone?.currentPosition) {
        map.flyTo([selectedDrone.currentPosition.latitude, selectedDrone.currentPosition.longitude], 15, {
          duration: 1.5,
        })
      }

      // Обновляем дроны на карте при изменении данных
      const dronesArray = Array.from(drones.values())
      dronesArray.forEach((drone) => {
        updateDroneOnMap(drone)
      })
    }, [selectedDrone?.currentPosition, map, drones, showTrail])

    return null
  }

  const dronesArray = Array.from(drones.values())

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
                    setConnectionAttempts(0)
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
              <h3 className="text-sm font-medium text-gray-900">Активные дроны ({dronesArray.length})</h3>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={showTrail}
                    onChange={(e) => setShowTrail(e.target.checked)}
                    className="rounded"
                  />
                  <span>Траектория</span>
                </label>
              </div>
            </div>

            {dronesArray.length === 0 ? (
              <div className="text-center py-6">
                <Plane className="h-6 w-6 text-gray-400 mx-auto" />
                <p className="mt-2 text-xs text-gray-600">Нет активных дронов</p>
                <p className="text-xs text-gray-500">Ожидание данных от WebSocket...</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {dronesArray.map((drone) => {
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
              selectedDrone?.currentPosition
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

            <MapController />
          </MapContainer>

          {/* Информационная панель выбранного дрона */}
          {selectedDrone && selectedDrone.currentPosition && (
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
        </div>
      </div>

      {/* Нижняя панель со статистикой */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Всего дронов: {dronesArray.length} | В полёте: {dronesArray.filter((d) => d.status === "flying").length} |
            Активных полетов: {dronesArray.filter((d) => d.flightData).length} | Сообщений: {messages.length}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600">
              Макс. точек траектории:
              <input
                type="number"
                value={maxTrailPoints}
                onChange={(e) => setMaxTrailPoints(Math.max(10, Math.min(200, Number.parseInt(e.target.value) || 50)))}
                className="ml-1 w-16 px-1 py-0.5 text-xs border rounded"
                min="10"
                max="200"
              />
            </label>
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
