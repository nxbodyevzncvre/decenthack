"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const customIcon = L.icon({
  iconUrl: "/pin.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

function LocationMarker({ selectedPosition, onPositionSelect }) {
  const markerRef = useRef(null)
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      const newPosition = [lat, lng]
      onPositionSelect(newPosition)
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

export default function FlightMap({ selectedPosition, onPositionSelect, dangerZones = [], showDangerZones = false }) {
  return (
    <div className="bg-gray-100 rounded-lg h-80 overflow-hidden">
      <MapContainer center={[51.15545, 71.41216]} zoom={13} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* База дронов */}
        <Circle
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
              <h4 className="font-medium text-black">База дронов</h4>
              <p className="text-sm text-black">Радиус: 200м</p>
              <p className="text-sm text-black font-medium">Запуск осуществляется отсюда</p>
            </div>
          </Popup>
        </Circle>

        {/* Опасные зоны */}
        {showDangerZones &&
          dangerZones.map((zone) => (
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

        <LocationMarker selectedPosition={selectedPosition} onPositionSelect={onPositionSelect} />
      </MapContainer>
    </div>
  )
}
