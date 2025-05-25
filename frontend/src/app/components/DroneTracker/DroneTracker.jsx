"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Wifi, WifiOff } from "lucide-react"
import axios from "axios"
import { now } from "lodash"
import api from "@/app/components/utils/api"

import { calculateDistance, getFlightConditions } from "../utils/utils"
import ConnectionStatus from "../connection-status/Connection-status"
import DroneList from "../drone-list/Drone-list"
import MessageLog from "../message-log/Message-log"
import WeatherWidget from "../WeatherWidget/WeatherWidget"
import DroneInfoPanel from "../drone-info-panel/Drone-info-panel"
import DroneMap from "@/app/components/drone-map/Drone-map"
import Toast from "@/app/components/Toast/Toast.jsx"



export default function DroneTracker() {
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
  const connectionAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)

  const center = [51.12, 71.43]

  const addMessage = useCallback((message, type) => {
    const newMessage = {
      id: `msg-${messageIdRef.current++}`,
      timestamp: new Date().toLocaleTimeString("ru-RU"),
      message,
      type,
    }

    setMessages((prev) => [newMessage, ...prev.slice(0, 49)])
  }, [])

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type })
  }, [])

  const checkRestrictedZones = useCallback(
    (drone) => {
      if (!drone.currentPosition || dangerZones.length === 0) return

      const dronePos = drone.currentPosition
      const nowTime = now()

      dangerZones.forEach((zone) => {
        const distance = calculateDistance(dronePos.latitude, dronePos.longitude, zone.latitude, zone.longtitude)
        const warningDistance = zone.radius + 50

        if (distance <= warningDistance && distance > zone.radius) {
          const warningKey = `${drone.drone_id}-${zone.restrictedZone_id}`
          const lastWarning = localStorage.getItem(`warning-${warningKey}`)

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
    [dangerZones, showToast, addMessage],
  )

  const connect = useCallback(() => {
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

        if (connectionAttemptsRef.current === 0) {
          addMessage("🔗 WebSocket отключен", "connection")
        }

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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect")
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    isConnectingRef.current = false
    connectionAttemptsRef.current = 0
  }, [])

  const handleMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "status_update":
          const statusMessage = `📋 Заявка ${data.application_id}: ${data.status} - ${data.message}`
          addMessage(statusMessage, "status-update")

          if (data.status === "rejected" || data.status === "отклонена") {
            showToast(
              `❌ Заявка ${data.application_id} отклонена${data.rejection_reason ? `: ${data.rejection_reason}` : ""}`,
              "error",
            )
          } else if (data.status === "approved" || data.status === "одобрена") {
            showToast(`✅ Заявка ${data.application_id} одобрена${data.message ? `: ${data.message}` : ""}`, "success")
          } else if (data.status === "processing") {
            showToast(
              `🔄 Заявка ${data.application_id} обрабатывается${data.message ? `: ${data.message}` : ""}`,
              "warning",
            )
          } else if (data.status === "executing") {
            showToast(
              `🚁 Заявка ${data.application_id} выполняется${data.message ? `: ${data.message}` : ""}`,
              "success",
            )
          } else if (data.status === "cancelled") {
            showToast(
              `🚫 Заявка ${data.application_id} отменена${data.rejection_reason ? `: ${data.rejection_reason}` : ""}`,
              "error",
            )
          }
          break

        case "flight_paused":
          if (data.application_id && data.drone_id) {
            setDrones((prev) => {
              const newDrones = new Map(prev)
              const existingDrone = newDrones.get(data.drone_id)

              if (existingDrone && data.pause_position) {
                // Обновляем позицию дрона на момент паузы
                const pausePosition = {
                  application_id: data.pause_position.application_id,
                  drone_id: data.pause_position.drone_id,
                  latitude: data.pause_position.latitude,
                  longitude: data.pause_position.longitude,
                  altitude: data.pause_position.altitude,
                  speed: 0, // При паузе скорость = 0
                  route_progress: data.pause_position.route_progress,
                  timestamp: data.pause_position.timestamp,
                }

                newDrones.set(data.drone_id, {
                  ...existingDrone,
                  status: "paused",
                  currentPosition: pausePosition,
                  positions: [...existingDrone.positions, pausePosition],
                  lastUpdate: new Date().toISOString(),
                  pauseReason: data.pause_reason,
                  pauseTime: data.pause_time,
                })
              }
              return newDrones
            })

            addMessage(
              `⏸️ Полет приостановлен: Дрон ${data.drone_id} (Заявка ${data.application_id})${data.pause_reason ? ` - ${data.pause_reason}` : ""}`,
              "flight-paused",
            )
            showToast(`⏸️ Полет приостановлен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "warning")
          }
          break

        case "flight_resumed":
          if (data.application_id && data.drone_id) {
            setDrones((prev) => {
              const newDrones = new Map(prev)
              const existingDrone = newDrones.get(data.drone_id)

              if (existingDrone && data.resume_position) {
                // Обновляем позицию дрона при возобновлении
                const resumePosition = {
                  application_id: data.resume_position.application_id,
                  drone_id: data.resume_position.drone_id,
                  latitude: data.resume_position.latitude,
                  longitude: data.resume_position.longitude,
                  altitude: data.resume_position.altitude,
                  speed: data.resume_position.speed,
                  route_progress: data.resume_position.route_progress,
                  timestamp: data.resume_position.timestamp,
                }

                newDrones.set(data.drone_id, {
                  ...existingDrone,
                  status: "flying",
                  currentPosition: resumePosition,
                  positions: [...existingDrone.positions, resumePosition],
                  lastUpdate: new Date().toISOString(),
                  pauseReason: undefined,
                  pauseTime: undefined,
                  resumeReason: data.resume_reason,
                  resumeTime: data.resume_time,
                })
              }
              return newDrones
            })

            addMessage(
              `▶️ Полет возобновлен: Дрон ${data.drone_id} (Заявка ${data.application_id})${data.resume_reason ? ` - ${data.resume_reason}` : ""}`,
              "flight-resumed",
            )
            showToast(`▶️ Полет возобновлен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "success")
          }
          break

        case "flight_started":
          if (data.application_id && data.drone_id && data.pilot_id) {
            const flightData = {
              application_id: data.application_id,
              drone_id: data.drone_id,
              pilot_id: data.pilot_id,
              route: data.route,
              start_time: data.start_time,
              estimated_end_time: data.estimated_end_time,
            }

            // Начальная позиция из current_position
            const startPosition = data.current_position
              ? {
                  application_id: data.current_position.application_id,
                  drone_id: data.current_position.drone_id,
                  latitude: data.current_position.latitude,
                  longitude: data.current_position.longitude,
                  altitude: data.current_position.altitude,
                  speed: data.current_position.speed,
                  route_progress: data.current_position.route_progress,
                  timestamp: data.current_position.timestamp,
                }
              : null

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
                currentPosition: startPosition,
                positions: startPosition ? [startPosition] : [],
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
              timestamp: data.timestamp || new Date().toISOString(),
              heading: data.heading,
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

              const lastPosition = existingDrone.currentPosition
              const shouldUpdate =
                !lastPosition ||
                Math.abs(lastPosition.latitude - position.latitude) > 0.00001 ||
                Math.abs(lastPosition.longitude - position.longitude) > 0.00001

              if (shouldUpdate) {
                const newPositions = [...existingDrone.positions, position]

                const updatedDrone = {
                  ...existingDrone,
                  positions: newPositions,
                  currentPosition: position,
                  lastUpdate: new Date().toISOString(),
                }

                newDrones.set(data.drone_id, updatedDrone)

                // Проверяем запретные зоны
                checkRestrictedZones(updatedDrone)
              }

              return newDrones
            })

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
            // Обновляем финальную позицию если есть
            if (data.final_position) {
              const finalPosition = {
                application_id: data.final_position.application_id,
                drone_id: data.final_position.drone_id,
                latitude: data.final_position.latitude,
                longitude: data.final_position.longitude,
                altitude: data.final_position.altitude,
                speed: 0,
                route_progress: 100,
                timestamp: data.final_position.timestamp,
              }

              setDrones((prev) => {
                const newDrones = new Map(prev)
                const existingDrone = newDrones.get(data.drone_id)
                if (existingDrone) {
                  newDrones.set(data.drone_id, {
                    ...existingDrone,
                    status: "idle",
                    flightData: undefined,
                    currentPosition: finalPosition,
                    positions: [...existingDrone.positions, finalPosition],
                    completionTime: data.completion_time,
                    completionStatus: data.completion_status,
                  })
                }
                return newDrones
              })
            } else {
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
            }

            setSelectedDrone((prev) => {
              if (prev && prev.drone_id === data.drone_id) {
                return null
              }
              return prev
            })

            addMessage(
              `🏁 Полет завершен: Дрон ${data.drone_id} (Заявка ${data.application_id}) - ${data.completion_status}`,
              "flight-completed",
            )
            showToast(`🏁 Полет завершен: Дрон ${data.drone_id} (Заявка ${data.application_id})`, "success")
          }
          break

        case "restricted_zone_alert":
          if (data.application_id && data.drone_id && data.zone_name) {
            const alertLevel = data.alert_level?.toLowerCase()
            const distance = Math.round(data.distance)

            let alertIcon = "⚠️"
            let alertType = "warning"

            if (alertLevel === "danger") {
              alertIcon = "🚨"
              alertType = "error"
            } else if (alertLevel === "critical") {
              alertIcon = "🔴"
              alertType = "error"
            }

            const alertMessage = `${alertIcon} Дрон ${data.drone_id} в ${distance}м от запретной зоны "${data.zone_name}"`

            addMessage(
              `${alertIcon} Дрон ${data.drone_id}: ${alertLevel?.toUpperCase()} - ${data.zone_name} (расстояние: ${distance}м)`,
              "restricted-zone-alert",
            )

            showToast(alertMessage, alertType)

            // Обновляем позицию дрона из алерта
            if (data.drone_position) {
              setDrones((prev) => {
                const newDrones = new Map(prev)
                const existingDrone = newDrones.get(data.drone_id)

                if (existingDrone) {
                  const alertPosition = {
                    application_id: data.drone_position.application_id,
                    drone_id: data.drone_position.drone_id,
                    latitude: data.drone_position.latitude,
                    longitude: data.drone_position.longitude,
                    altitude: data.drone_position.altitude,
                    speed: data.drone_position.speed,
                    route_progress: data.drone_position.route_progress,
                    timestamp: data.drone_position.timestamp,
                    heading: data.drone_position.heading,
                  }

                  newDrones.set(data.drone_id, {
                    ...existingDrone,
                    currentPosition: alertPosition,
                    positions: [...existingDrone.positions, alertPosition],
                    lastUpdate: new Date().toISOString(),
                    lastAlert: {
                      zone_name: data.zone_name,
                      alert_level: data.alert_level,
                      distance: data.distance,
                      timestamp: data.timestamp,
                    },
                  })
                }

                return newDrones
              })
            }
          }
          break

        default:
          console.log("Unknown message type:", data.type, data)
          break
      }
    },
    [addMessage, showToast, checkRestrictedZones],
  )

  const fetchDangerZones = async () => {
    try {
      // Используем api вместо axios
      const response = await api.get("/auth/zones")
      setDangerZones(response.data.zones || [])
    } catch (err) {
      console.error("Error fetching danger zones:", err)
      setDangerZones([])
    }
  }

  const fetchWeatherData = async () => {
    setWeatherLoading(true)
    try {
      const API_KEY = "56bca329a171141090d33ab607b33d5f"
      const lat = center[0]
      const lon = center[1]

      // Для внешних API можно использовать обычный axios
      const axios = require("axios")
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`,
      )

      const weatherData = response.data

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

  useEffect(() => {
    fetchDangerZones()
    fetchWeatherData()
    const weatherInterval = setInterval(fetchWeatherData, 600000)
    connect()

    return () => {
      disconnect()
      if (weatherInterval) clearInterval(weatherInterval)
    }
  }, [])

  const clearMessages = () => {
    setMessages([])
  }

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

          <ConnectionStatus
            isConnected={isConnected}
            isConnecting={isConnecting}
            onConnect={() => {
              connectionAttemptsRef.current = 0
              connect()
            }}
            onDisconnect={disconnect}
          />
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Боковое меню с дронами и логами */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <DroneList drones={allDrones} selectedDrone={selectedDrone} onSelectDrone={setSelectedDrone} />
          <MessageLog messages={messages} onClearMessages={clearMessages} />
        </div>

        {/* Карта */}
        <div className="flex-1 relative">
          <DroneMap
            drones={drones}
            selectedDrone={selectedDrone}
            dangerZones={dangerZones}
            center={center}
            onSelectDrone={setSelectedDrone}
          />

          <DroneInfoPanel drone={selectedDrone} />
          <WeatherWidget weatherData={weatherData} weatherLoading={weatherLoading} onRefresh={fetchWeatherData} />
        </div>
      </div>

      {/* Нижняя панель со статистикой */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
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
