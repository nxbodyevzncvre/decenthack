"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function CreateApplication() {
  const [step, setStep] = useState(1)
  const [drones, setDrones] = useState([])
  const [dangerZones, setDangerZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [zonesLoading, setZonesLoading] = useState(false)
  const [error, setError] = useState("")
  const [intersectionCheck, setIntersectionCheck] = useState(null)
  const router = useRouter()

  // Form data states
  const [selectedDrone, setSelectedDrone] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [maxHeight, setMaxHeight] = useState("")
  const [selectedPosition, setSelectedPosition] = useState(null)

  const markerPositionRef = useRef(null)

  const prepareData = () => {
    const data = {
      start_date: startDate,
      end_date: endDate,
      status: "Pending",
      drone_id: Number(selectedDrone),
      latitude: selectedPosition ? Number.parseFloat(selectedPosition[0].toFixed(8)) : null,
      longtitude: selectedPosition ? Number.parseFloat(selectedPosition[1].toFixed(8)) : null,
      altitude: Number.parseInt(maxHeight),
    }

    console.log("Prepared data:", data)
    return data
  }

  const handleSubmitFin = async () => {
    const data = prepareData()

    try {
      const token = localStorage.getItem("token")
      const response = await axios.post("http://localhost:5050/auth/application/create", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log("Submission successful:", response.data)
      router.push("/dashboard")
    } catch (error) {
      console.error("Error submitting data:", error)
      setError("Ошибка при отправке заявки")
    }
  }

  useEffect(() => {
    fetchDrones()
  }, [])

  useEffect(() => {
    if (step === 2) {
      fetchDangerZones()
    }
  }, [step])

  useEffect(() => {
    if (selectedPosition && dangerZones.length > 0) {
      checkIntersection()
    }
  }, [selectedPosition, dangerZones])

  const fetchDrones = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("http://localhost:5050/auth/drone/drones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setDrones(response.data.drone || [])
    } catch (err) {
      setError("Ошибка загрузки данных о дронах")
    } finally {
      setLoading(false)
    }
  }

  const fetchDangerZones = async () => {
    setZonesLoading(true)
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
    } finally {
      setZonesLoading(false)
    }
  }

  const checkIntersection = () => {
    if (!selectedPosition) {
      setIntersectionCheck(null)
      return
    }

    const [lat, lng] = selectedPosition
    let hasIntersection = false
    const intersectedZones = []

    for (const zone of dangerZones) {
      const distance = calculateDistance(lat, lng, zone.latitude, zone.longtitude)
      if (distance <= zone.radius) {
        hasIntersection = true
        intersectedZones.push(zone)
      }
    }

    setIntersectionCheck({
      hasIntersection,
      intersectedZones,
      checkedPosition: selectedPosition,
    })
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000 // Радиус Земли в метрах
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const customIcon = L.icon({
    iconUrl: "/pin.svg",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

  function LocationMarker() {
    const markerRef = useRef(null)
    const map = useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        const newPosition = [lat, lng]
        setSelectedPosition(newPosition)
        markerPositionRef.current = newPosition
        map.flyTo(newPosition, map.getZoom())
      },
    })

    useEffect(() => {
      if (selectedPosition && markerRef.current) {
        markerRef.current.openPopup()
      }
    }, [selectedPosition])

    return selectedPosition ? (
      <Marker position={selectedPosition} icon={customIcon} ref={markerRef}>
        <Popup>
          Выбранные координаты: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
        </Popup>
      </Marker>
    ) : null
  }

  const nextStep = () => {
    if (step === 1) {
      if (!selectedDrone || !startDate || !endDate || !maxHeight) {
        setError("Пожалуйста, заполните все обязательные поля")
        return
      }
      if (!selectedPosition) {
        setError("Пожалуйста, выберите местоположение на карте")
        return
      }
    }
    if (step === 2) {
      if (intersectionCheck?.hasIntersection) {
        setError("Нельзя продолжить: выбранное местоположение пересекается с опасными зонами")
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const getSelectedDroneDetails = () => {
    const drone = drones.find((d) => d.drone_id == selectedDrone)
    return drone ? `${drone.serial_number} (${drone.model_name})` : "Не выбран"
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Создание заявки на полёт</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step >= 1 ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  1
                </div>
                <div className={`h-1 flex-1 ${step >= 2 ? "bg-gray-900" : "bg-gray-200"}`}></div>
              </div>
              <div className="mt-2 text-xs font-medium text-gray-600">Информация о полёте</div>
            </div>
            <div className="w-full">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step >= 2 ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  2
                </div>
                <div className={`h-1 flex-1 ${step >= 3 ? "bg-gray-900" : "bg-gray-200"}`}></div>
              </div>
              <div className="mt-2 text-xs font-medium text-gray-600">Проверка опасных зон</div>
            </div>
            <div className="w-full">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step >= 3 ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  3
                </div>
              </div>
              <div className="mt-2 text-xs font-medium text-gray-600">Подтверждение</div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {step === 1 && (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Информация о полёте</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="drone" className="block text-sm font-medium text-gray-700">
                      Выберите дрон *
                    </label>
                    <select
                      id="drone"
                      value={selectedDrone}
                      onChange={(e) => setSelectedDrone(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                      required
                    >
                      <option value="">Выберите дрон</option>
                      {drones.map((drone) => (
                        <option key={drone.drone_id} value={drone.drone_id}>
                          {drone.serial_number} - {drone.model_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="maxHeight" className="block text-sm font-medium text-gray-700">
                      Максимальная высота (м) *
                    </label>
                    <input
                      type="number"
                      value={maxHeight}
                      onChange={(e) => setMaxHeight(e.target.value)}
                      id="maxHeight"
                      min="1"
                      max="500"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                      Время начала *
                    </label>
                    <input
                      type="datetime-local"
                      id="startTime"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                      Время окончания *
                    </label>
                    <input
                      type="datetime-local"
                      id="endTime"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Местоположение *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Кликните на карту, чтобы выбрать местоположение</p>
                  <div className="mt-1 bg-gray-100 rounded-lg h-80 overflow-hidden">
                    <MapContainer center={[51.130246, 71.402378]} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Circle
                        key={"baza"}
                        center={[51.15545, 71.41216]}
                        radius={200}
                        pathOptions={{
                          color: "black",
                          fillColor: "black",
                          fillOpacity: 0.8,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div>
                            <h4 className="font-medium text-black"> База дронов</h4>
                            <p className="text-sm text-black">Радиус: 12</p>
                            <p className="text-sm text-black font-medium">Запуск осуществляется отсюда</p>
                          </div>
                        </Popup>
                      </Circle>
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
                      <LocationMarker />
                    </MapContainer>
                  </div>
                  {selectedPosition && (
                    <div className="mt-2 text-sm text-gray-600">
                      Выбранные координаты: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Проверка опасных зон</h2>

              {zonesLoading ? (
                <div className="bg-gray-100 rounded-lg h-80 mb-6 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Загрузка опасных зон...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg h-80 mb-6 overflow-hidden">
                  <MapContainer center={[51.12, 71.43]} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Circle
                        key={"baza"}
                        center={[51.15545, 71.41216]}
                        radius={200}
                        pathOptions={{
                          color: "black",
                          fillColor: "black",
                          fillOpacity: 0.8,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div>
                            <h4 className="font-medium text-black"> База дронов</h4>
                            <p className="text-sm text-black">Радиус: 12</p>
                            <p className="text-sm text-black font-medium">Запуск осуществляется отсюда</p>
                          </div>
                        </Popup>
                      </Circle>

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
                            <h4 className="font-medium text-red-600">⚠️ {zone.zone_name}</h4>
                            <p className="text-sm text-gray-600">Радиус: {zone.radius}м</p>
                            <p className="text-sm text-gray-600">Высота: {zone.altitude}м</p>
                            <p className="text-sm text-red-600 font-medium">Полный запрет полётов</p>
                          </div>
                        </Popup>
                      </Circle>
                    ))}

                    {/* Выбранная позиция */}
                    {selectedPosition && (
                      <Marker position={selectedPosition} icon={customIcon}>
                        <Popup>
                          Планируемое местоположение полёта
                          <br />
                          {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              )}

              {selectedPosition && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">
                    Проверяем координаты: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                  </p>

                  {intersectionCheck === null ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">Проверка пересечений с опасными зонами...</p>
                        </div>
                      </div>
                    </div>
                  ) : intersectionCheck.hasIntersection ? (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <XCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700 font-medium">
                            Внимание! Выбранное местоположение пересекается с опасными зонами:
                          </p>
                          <ul className="mt-2 text-sm text-red-600">
                            {intersectionCheck.intersectedZones.map((zone) => (
                              <li key={zone.restrictedZone_id} className="flex items-center">
                                <span className="mr-2">•</span>
                                {zone.zone_name} (радиус: {zone.radius}м)
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-sm text-red-700">
                            Полёт в этой зоне запрещен. Выберите другое местоположение.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            Отлично! Выбранное местоположение не пересекается с опасными зонами. Полёт разрешен.
                          </p>
                          <p className="text-sm text-green-600 mt-1">Проверено {dangerZones.length} опасных зон.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={intersectionCheck?.hasIntersection}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                    intersectionCheck?.hasIntersection
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Подтверждение заявки</h2>

              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">Информация о полёте</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Дрон:</p>
                    <p className="text-sm text-gray-900">{getSelectedDroneDetails()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Максимальная высота:</p>
                    <p className="text-sm text-gray-900">{maxHeight} м</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Время начала:</p>
                    <p className="text-sm text-gray-900">
                      {startDate ? new Date(startDate).toLocaleString("ru-RU") : "Не указано"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Время окончания:</p>
                    <p className="text-sm text-gray-900">
                      {endDate ? new Date(endDate).toLocaleString("ru-RU") : "Не указано"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Местоположение:</p>
                    <p className="text-sm text-gray-900">
                      {selectedPosition
                        ? `${selectedPosition[0].toFixed(5)}, ${selectedPosition[1].toFixed(5)}`
                        : "Не выбрано"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Результат проверки безопасности */}
              {intersectionCheck && !intersectionCheck.hasIntersection && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">Проверка безопасности пройдена</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Местоположение не пересекается с {dangerZones.length} опасными зонами
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Ваша заявка будет рассмотрена в течение 24 часов. Вы получите уведомление о статусе заявки.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFin}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Отправить заявку
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
