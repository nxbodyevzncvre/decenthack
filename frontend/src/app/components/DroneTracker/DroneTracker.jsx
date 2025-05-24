"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet"
import { Plane, Battery, MapPin, Navigation, Clock, Signal } from "lucide-react"
import L from "leaflet"
import axios from "axios"
import "leaflet/dist/leaflet.css"

export default function DroneTracker() {
  const [drones, setDrones] = useState([])
  const [selectedDrone, setSelectedDrone] = useState(null)
  const [dangerZones, setDangerZones] = useState([])
  const [loading, setLoading] = useState(true)

  const center = [51.12, 71.43]

  // Иконки для дронов
  const droneIcon = L.icon({
    iconUrl: "/camera-drone.png",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })

  const selectedDroneIcon = L.icon({
    iconUrl: "/camera-drone.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })

  useEffect(() => {
    fetchDrones()
    fetchDangerZones()

    // Обновляем позиции дронов каждые 5 секунд
    const interval = setInterval(fetchDrones, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchDrones = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("http://localhost:5050/auth/drone/drones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Получаем также заявки для получения координат дронов
      const applicationsResponse = await axios.get("http://localhost:5050/auth/application/applications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const applications = applicationsResponse.data.applications || []

      // Добавляем координаты из заявок к дронам
      const dronesWithLocation = (response.data.drone || []).map((drone) => {
        // Находим последнюю одобренную заявку для этого дрона
        const droneApplications = applications.filter(
          (app) => app.serial_number === drone.serial_number && app.status === "approved",
        )

        const latestApp = droneApplications.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0]

        return {
          ...drone,
          latitude: latestApp ? Number.parseFloat(latestApp.latitude) : "",
          longitude: latestApp ? Number.parseFloat(latestApp.longtitude) : "",
          status: latestApp ? "flying" : ["pending", "rejected", "ok"][Math.floor(Math.random() * 3)],
          altitude: latestApp ? latestApp.altitude : "",
          lastUpdate: new Date().toISOString(),
          currentApplication: latestApp,
        }
      })

      setDrones(dronesWithLocation)

      // Если выбранный дрон существует, обновляем его данные
      if (selectedDrone) {
        const updatedSelectedDrone = dronesWithLocation.find((d) => d.drone_id === selectedDrone.drone_id)
        if (updatedSelectedDrone) {
          setSelectedDrone(updatedSelectedDrone)
        }
      }
    } catch (err) {
      console.error("Error fetching drones:", err)
      // Fallback данные остаются теми же
      setDrones([
        {
          drone_id: "DRN-001",
          serial_number: "PH001",
          model_name: "Phantom 4 Pro",
          brand: "DJI",
          latitude: 51.125,
          longitude: 71.435,
          battery: 87,
          status: "flying",
          altitude: 120,
          speed: 25,
          signal: 95,
          lastUpdate: new Date().toISOString(),
        },
        {
          drone_id: "DRN-002",
          serial_number: "MA002",
          model_name: "Mavic Air 2",
          brand: "DJI",
          latitude: 51.115,
          longitude: 71.425,
          battery: 64,
          status: "active",
          altitude: 0,
          speed: 0,
          signal: 88,
          lastUpdate: new Date().toISOString(),
        },
        {
          drone_id: "DRN-003",
          serial_number: "IN003",
          model_name: "Inspire 2",
          brand: "DJI",
          latitude: 51.118,
          longitude: 71.44,
          battery: 12,
          status: "charging",
          altitude: 0,
          speed: 0,
          signal: 0,
          lastUpdate: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchDangerZones = async () => {
    try {
      const token = localStorage.getItem("token")
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

  const handleDroneSelect = (drone) => {
    setSelectedDrone(drone)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "flying":
        return "text-blue-600 bg-blue-100"
      case "active":
        return "text-green-600 bg-green-100"
      case "idle":
        return "text-yellow-600 bg-yellow-100"
      case "charging":
        return "text-purple-600 bg-purple-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "flying":
        return "В полёте"
      case "active":
        return "Активен"
      case "idle":
        return "Ожидание"
      case "charging":
        return "Зарядка"
      default:
        return "Неизвестно"
    }
  }

  const getBatteryColor = (battery) => {
    if (battery > 50) return "text-green-600"
    if (battery > 20) return "text-yellow-600"
    return "text-red-600"
  }

  // Компонент для автоматического центрирования карты на выбранном дроне
  function MapController() {
    const map = useMap()

    useEffect(() => {
      if (selectedDrone) {
        map.flyTo([selectedDrone.latitude, selectedDrone.longitude], 15, {
          duration: 1.5,
        })
      }
    }, [selectedDrone, map])

    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Отслеживание дронов</h2>
        <p className="text-sm text-gray-600">Выберите дрон для отслеживания в реальном времени</p>
      </div>

      <div className="flex h-[600px]">
        {/* Боковое меню с дронами - 1/4 */}
        <div className="w-1/4 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Доступные дроны ({drones.length})</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Загрузка...</p>
              </div>
            ) : drones.length === 0 ? (
              <div className="text-center py-8">
                <Plane className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-600">Нет доступных дронов</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drones.map((drone) => (
                  <div
                    key={drone.drone_id}
                    onClick={() => handleDroneSelect(drone)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedDrone?.drone_id === drone.drone_id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Plane className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">{drone.serial_number}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(drone.status)}`}>
                        {getStatusText(drone.status)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mb-2">{drone.model_name}</p>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1">
                        <Battery className="h-3 w-3" />
                        <span className={getBatteryColor(drone.battery)}>{drone.battery}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Signal className="h-3 w-3" />
                        <span className="text-gray-600">{drone.signal}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Карта - 3/4 */}
        <div className="w-3/4 relative">
          <MapContainer
            center={selectedDrone ? [selectedDrone.latitude, selectedDrone.longitude] : center}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController />

            {/* Опасные зоны */}
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
                    <h4 className="font-medium text-red-600">⚠️ Опасная зона</h4>
                    <p className="text-sm font-semibold">{zone.zone_name}</p>
                    <p className="text-sm text-gray-600">Радиус: {zone.radius}м</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Маркеры дронов */}
            {drones.map((drone) => (
              <Marker
                key={drone.drone_id}
                position={[drone.latitude, drone.longitude]}
                icon={selectedDrone?.drone_id === drone.drone_id ? selectedDroneIcon : droneIcon}
                eventHandlers={{
                  click: () => handleDroneSelect(drone),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h4 className="font-medium text-gray-900">{drone.serial_number}</h4>
                    <p className="text-sm text-gray-600">{drone.model_name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Статус:</span>
                        <span className={getStatusColor(drone.status).split(" ")[0]}>
                          {getStatusText(drone.status)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Батарея:</span>
                        <span className={getBatteryColor(drone.battery)}>{drone.battery}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Высота:</span>
                        <span>{drone.altitude}м</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Скорость:</span>
                        <span>{drone.speed} км/ч</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>


          {selectedDrone && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[280px] border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{selectedDrone.serial_number}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedDrone.status)}`}>
                  {getStatusText(selectedDrone.status)}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{selectedDrone.model_name}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
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
                  <span>{selectedDrone.altitude}м</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{selectedDrone.speed} км/ч</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {selectedDrone.latitude.toFixed(5)}, {selectedDrone.longitude.toFixed(5)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Обновлено: {new Date(selectedDrone.lastUpdate).toLocaleTimeString("ru-RU")}
                </p>

                {/* Информация о текущей заявке */}
                {selectedDrone.currentApplication && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700">Текущая заявка:</p>
                    <p className="text-xs text-gray-500">ID: {selectedDrone.currentApplication.id}</p>
                    <p className="text-xs text-gray-500">
                      Начало: {new Date(selectedDrone.currentApplication.start_date).toLocaleString("ru-RU")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Всего дронов: {drones.length} | В полёте: {drones.filter((d) => d.status === "flying").length} | Активных:{" "}
            {drones.filter((d) => d.status === "active").length}
          </div>
          <button
            onClick={() => {
              fetchDrones()
              fetchDangerZones()
            }}
            className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
          >
            Обновить данные
          </button>
        </div>
      </div>
    </div>
  )
}
