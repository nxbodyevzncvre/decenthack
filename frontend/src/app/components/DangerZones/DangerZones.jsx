"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Circle, useMapEvents, Marker, Popup } from "react-leaflet"
import { Save, X, MapPin, ArrowLeft, Delete } from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import axios from "axios"
import Toast from "@/app/components/toast/Toast.jsx"
import Link from "next/link"

export default function AddDangerZone() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [zonesLoading, setZonesLoading] = useState(false)

  // Form states
  const [zoneName, setZoneName] = useState("")
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [radius, setRadius] = useState(100)
  const [altitude, setAltitude] = useState(50)

  const customIcon = L.icon({
    iconUrl: "/pin.svg",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

  useEffect(() => {
    fetchDangerZones()
  }, [])

  const fetchDangerZones = async () => {
    setZonesLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Токен авторизации не найден")
        return
      }

      const response = await axios.get("http://localhost:5050/auth/zones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setZones(response.data.zones || [])
    } catch (err) {
      console.error("Error fetching danger zones:", err)
      setError("Ошибка загрузки зон")
      setZones([])
    } finally {
      setZonesLoading(false)
    }
  }

  function ZoneSelector() {
    const map = useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        setSelectedPosition([lat, lng])
        map.flyTo([lat, lng], map.getZoom())
      },
    })

    return selectedPosition ? (
      <>
        <Marker position={selectedPosition} icon={customIcon}>
          <Popup>
            Центр зоны: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
          </Popup>
        </Marker>
        <Circle
          center={selectedPosition}
          radius={radius}
          pathOptions={{
            color: "red",
            fillColor: "red",
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
      </>
    ) : null
  }

  const deleteZone = async (zoneId) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту зону?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      await axios.delete(`http://localhost:5050/auth/zones/delete/${zoneId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setZones(zones.filter((zone) => zone.restrictedZone_id !== zoneId))
      setSuccess(true)
    } catch (err) {
      console.error("Ошибка удаления зоны:", err)
      setError("Ошибка при удалении зоны")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!zoneName || !selectedPosition || !radius || !altitude) {
      setError("Пожалуйста, заполните все обязательные поля и выберите местоположение")
      return
    }

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const zoneData = {
        latitude: Number.parseFloat(selectedPosition[0].toFixed(6)),
        longtitude: Number.parseFloat(selectedPosition[1].toFixed(6)),
        altitude: Number.parseFloat(altitude),
        zone_name: zoneName.trim(),
        radius: Number.parseInt(radius),
      }

      await axios.post("http://localhost:5050/auth/zones/create", zoneData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setSuccess(true)
      resetForm()
      fetchDangerZones()
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка при создании зоны")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setZoneName("")
    setSelectedPosition(null)
    setRadius(100)
    setAltitude(50)
  }

  const closeToast = () => {
    setSuccess(false)
    setError("")
  }

  return (
    <div className="space-y-6">
      <Toast message="Опасная зона успешно добавлена!" type="success" show={success} onClose={closeToast} />
      <Toast message={error} type="error" show={!!error} onClose={closeToast} />

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <Link href="/dashboard" className="inline-block mb-4">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Главное меню
            </button>
          </Link>
          <h2 className="text-lg font-medium text-gray-900">Добавление опасной зоны</h2>
          <p className="text-sm text-gray-600">Создайте новую зону с ограничениями для полётов дронов</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="zoneName" className="block text-sm font-medium text-gray-700">
                Название зоны *
              </label>
              <input
                type="text"
                id="zoneName"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Например: Астана"
                required
              />
            </div>

            <div>
              <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
                Радиус зоны (метры) *
              </label>
              <input
                type="number"
                id="radius"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                min="50"
                max="50000"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="altitude" className="block text-sm font-medium text-gray-700">
                Высота ограничения (метры) *
              </label>
              <input
                type="number"
                id="altitude"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
                min="10"
                max="1000"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Местоположение зоны *</label>
            <p className="text-xs text-gray-500 mb-2">Кликните на карту, чтобы выбрать центр опасной зоны</p>

            <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
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

                {/* Existing danger zones */}
                {zones.map((zone) => (
                  <Circle
                    key={zone.restrictedZone_id}
                    center={[zone.latitude, zone.longtitude]}
                    radius={zone.radius}
                    pathOptions={{
                      color: "red",
                      fillColor: "red",
                      fillOpacity: 0.1,
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

                <ZoneSelector />
              </MapContainer>
            </div>

            {selectedPosition && (
              <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm text-gray-700">
                  <MapPin className="h-4 w-4 inline mr-1 text-red-500" />
                  Выбранные координаты: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                </p>
                <p className="text-sm text-red-600">
                  Радиус зоны: {radius} метров | Высота: {altitude} метров
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <X className="h-4 w-4 mr-1 inline" />
              Очистить
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              <Save className="h-4 w-4 mr-1" />
              {loading ? "Сохранение..." : "Создать зону"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing zones table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Существующие опасные зоны</h3>
          <p className="text-sm text-gray-600">Список всех активных зон ограничений ({zones.length})</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Координаты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Радиус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Высота
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zonesLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    Загрузка зон...
                  </td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    Опасные зоны не найдены
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.restrictedZone_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{zone.zone_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {zone.latitude?.toFixed(5)}, {zone.longtitude?.toFixed(5)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.radius} м</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.altitude} м</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Полный запрет
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => deleteZone(zone.restrictedZone_id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Удалить зону"
                      >
                        <Delete className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
