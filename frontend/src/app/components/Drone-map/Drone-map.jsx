"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, useMap, Circle, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import axios from "axios";
import { createDroneSvg, getDroneColor } from "@/app/components/utils/utils"

export default function DroneMap({ drones, selectedDrone, dangerZones, center, onSelectDrone }) {
  const mapRef = useRef(null)
  const droneMarkers = useRef(new Map())
  const droneAnimations = useRef(new Map())

  const createDronePopup = (drone) => {
    return `
      <div style="min-width: 200px;">
        <h4 style="font-weight: medium; color: #4a5568;">${drone.serial_number}</h4>
        <div style="margin-top: 8px; space-y: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Батарея:</span>
            <span style="color: ${drone.battery > 50 ? "#059669" : drone.battery > 20 ? "#d97706" : "#dc2626"};">${drone.battery}%</span>
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

  const smoothMoveMarker = (marker, fromLatLng, toLatLng, duration = 2000) => {
    const droneId = Array.from(droneMarkers.current.entries()).find(([_, m]) => m === marker)?.[0]
    if (!droneId) return

    if (droneAnimations.current.has(droneId)) {
      cancelAnimationFrame(droneAnimations.current.get(droneId))
    }

    const startTime = Date.now()
    const distance = fromLatLng.distanceTo(toLatLng)
    const adaptiveDuration = Math.min(duration, Math.max(500, distance * 100))

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / adaptiveDuration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

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

  const updateDroneOnMap = (drone) => {
    if (!drone.currentPosition || (drone.status !== "flying" && drone.status !== "paused")) {
      removeDroneFromMap(drone.drone_id)
      return
    }

    const position = [drone.currentPosition.latitude, drone.currentPosition.longitude]
    const isSelected = selectedDrone?.drone_id === drone.drone_id
    const color = getDroneColor(drone.drone_id, isSelected)
    const map = mapRef.current

    if (!map) return

    if (droneMarkers.current.has(drone.drone_id)) {
      const marker = droneMarkers.current.get(drone.drone_id)
      const currentLatLng = marker.getLatLng()
      const newLatLng = L.latLng(position[0], position[1])

      const distance = currentLatLng.distanceTo(newLatLng)
      if (distance > 0.5) {
        smoothMoveMarker(marker, currentLatLng, newLatLng)
      }

      marker.getPopup()?.setContent(createDronePopup(drone))
    } else {
      const icon = L.icon({
        iconUrl: createDroneSvg(isSelected ? 32 : 24, color, isSelected),
        iconSize: isSelected ? [32, 32] : [24, 24],
        iconAnchor: isSelected ? [16, 16] : [12, 12],
        popupAnchor: [0, isSelected ? -16 : -12],
      })

      const marker = L.marker(position, { icon }).addTo(map)
      marker.bindPopup(createDronePopup(drone))
      marker.on("click", () => onSelectDrone(drone))
      droneMarkers.current.set(drone.drone_id, marker)
    }
  }

  const removeDroneFromMap = (droneId) => {
    const map = mapRef.current
    if (!map) return

    if (droneMarkers.current.has(droneId)) {
      const marker = droneMarkers.current.get(droneId)
      map.removeLayer(marker)
      droneMarkers.current.delete(droneId)
    }

    if (droneAnimations.current.has(droneId)) {
      cancelAnimationFrame(droneAnimations.current.get(droneId))
      droneAnimations.current.delete(droneId)
    }
  }

  function MapController() {
    const map = useMap()

    useEffect(() => {
      mapRef.current = map

      if (
        selectedDrone?.currentPosition &&
        (selectedDrone?.status === "flying" || selectedDrone?.status === "paused")
      ) {
        map.flyTo([selectedDrone.currentPosition.latitude, selectedDrone.currentPosition.longitude], 15, {
          duration: 1.5,
        })
      }

      const activeDrones = Array.from(drones.values()).filter(
        (drone) => drone.status === "flying" || drone.status === "paused",
      )
      activeDrones.forEach((drone) => {
        updateDroneOnMap(drone)
      })

      const allDroneIds = Array.from(drones.keys())
      const activeDroneIds = activeDrones.map((drone) => drone.drone_id)

      allDroneIds.forEach((droneId) => {
        if (!activeDroneIds.includes(droneId) && droneMarkers.current.has(droneId)) {
          removeDroneFromMap(droneId)
        }
      })
    }, [selectedDrone?.currentPosition, map, drones])

    return null
  }

  return (
    <MapContainer
      center={
        selectedDrone?.currentPosition && (selectedDrone?.status === "flying" || selectedDrone?.status === "paused")
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
  )
}
