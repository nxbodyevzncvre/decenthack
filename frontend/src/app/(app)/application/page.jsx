"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, MapPin, AlertTriangle } from "lucide-react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useRouter } from "next/navigation";
import axios from "axios"

export default function CreateApplication() {
  const [step, setStep] = useState(1)
  const center = [51.505, -0.09]
  const [drones, setDrones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  // Form data states
  const [selectedDrone, setSelectedDrone] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [maxHeight, setMaxHeight] = useState("")
  const [selectedPosition, setSelectedPosition] = useState(null)

  // Ref for accessing marker position
  const markerPositionRef = useRef(null)

  const prepareData = () => {
    const data = {
        start_date: startDate,
        end_date: endDate,
        status: "Pending",  
        drone_id: Number(selectedDrone),
        latitude: selectedPosition ? parseFloat(selectedPosition[0].toFixed(8)): null,
        longtitude: selectedPosition ? parseFloat(selectedPosition[1].toFixed(8)): null,
        altitude: Number.parseInt(maxHeight),
    }

    console.log("Prepared data:", data)
    console.log(drones)
    console.log(selectedDrone, "1923912391293")
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
  

  const fillBlueOptions = {
    color: "red",
    fillColor: "none",
    fillOpacity: 0.5,
  }

  const redOptions = { color: "red" }

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
      // Validate first step
      if (!selectedDrone || !startDate || !endDate || !maxHeight) {
        setError("Пожалуйста, заполните все обязательные поля")
        return
      }
      if (!selectedPosition) {
        setError("Пожалуйста, выберите местоположение на карте")
        return
      }
    }
    setError("")
    setStep(step + 1)
    console.log("Current data:", { selectedDrone, startDate, endDate, maxHeight, selectedPosition }, drones)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  // Get selected drone details for display
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
  if (error && drones.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
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
                    <MapContainer center={[51.12, 71.43]} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[51.12, 71.43]} icon={customIcon}>
                        <Popup>
                          Центр карты <br /> Кликните в любом месте для выбора локации.
                        </Popup>
                      </Marker>
                      <Circle center={center} pathOptions={fillBlueOptions} radius={200} />
                      <CircleMarker center={[51.12, 71.43]} pathOptions={redOptions} radius={20}>
                        <Popup>Опасная зона</Popup>
                      </CircleMarker>
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

              <div className="bg-gray-100 rounded-lg h-80 mb-6 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-gray-600">Карта с отмеченными опасными зонами</p>
                  {selectedPosition && (
                    <p className="mt-1 text-xs text-gray-500">
                      Проверяем координаты: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Отлично! Выбранное местоположение не пересекается с опасными зонами. Полёт разрешен.
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
                  onClick={nextStep}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
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
