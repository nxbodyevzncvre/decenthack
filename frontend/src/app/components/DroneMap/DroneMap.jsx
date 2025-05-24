"use client";
import { MapPin } from 'lucide-react';
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMapEvents } from "react-leaflet";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import DroneTracker from "@/app/components/DroneTracker/DroneTracker.jsx"


import "leaflet/dist/leaflet.css";

export default function DroneMap() {
  const [dangerZones, setDangerZones] = useState([]);
  const [position, setPosition] = useState(null);
  const markerRef = useRef(null);

  const center = [51.12, 71.43]; // Fixed to match the main map center

  const fillBlueOptions = {
    color: "blue",
    fillColor: "blue",
    fillOpacity: 0.2,
  };

  const redOptions = { 
    color: "red",
    fillColor: "red",
    fillOpacity: 0.3
  };

  const customIcon = L.icon({
    iconUrl: "/pin.svg",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Fetch danger zones on component mount
  useEffect(() => {
    fetchDangerZones();
  }, []);

  const fetchDangerZones = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await axios.get("http://localhost:5050/auth/zones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDangerZones(response.data.zones || []);
    } catch (err) {
      console.error("Error fetching danger zones:", err);
      setDangerZones([]);
    }
  };

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        map.flyTo([lat, lng], map.getZoom());
      },
    });

    useEffect(() => {
      if (position !== null && markerRef.current) {
        markerRef.current.openPopup();
      }
    }, [position]);

    return position ? (
      <Marker position={position} icon={customIcon} ref={markerRef}>
        <Popup>Ваши координаты: {position[0].toFixed(5)}, {position[1].toFixed(5)}</Popup>
      </Marker>
    ) : null;
  }

  return (
    <div className="rounded-lg shadow-sm overflow-hidden">
      <div className="rounded-lg border-black border-2 overflow-hidden">
        <MapContainer center={center} zoom={13} scrollWheelZoom={true} className="h-[350px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Main drone marker */}
          <Marker position={center} icon={customIcon}>
            <Popup>
              Основной дрон <br /> Статус: Активен
            </Popup>
          </Marker>

          {/* Danger zones from database */}
          {dangerZones.map((zone) => (
            <Circle
              key={zone.restrictedZone_id}
              center={[zone.latitude, zone.longtitude]}
              radius={zone.radius}
              pathOptions={{
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <div>
                  <h4 className="font-medium text-red-600">⚠️ Опасная зона</h4>
                  <p className="text-sm font-semibold">{zone.zone_name}</p>
                  <p className="text-sm text-gray-600">Радиус: {zone.radius}м</p>
                  <p className="text-sm text-gray-600">Высота: {zone.altitude}м</p>
                  <p className="text-sm text-red-600 font-medium">Полёт запрещён!</p>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Example static circle */}
          <Circle center={[51.505, -0.09]} pathOptions={fillBlueOptions} radius={200} />
          
          {/* Circle marker for specific location */}
          <CircleMarker center={center} pathOptions={redOptions} radius={20}>
            <Popup>Центральная точка мониторинга</Popup>
          </CircleMarker>
          
          <LocationMarker />
        </MapContainer>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        
        <h2 className="text-lg font-medium text-gray-900">Интерактивная карта дронов</h2>
        <p className="text-sm text-gray-600">Отслеживайте местоположение всех дронов в реальном времени</p>
      </div>
      
      <div className="p-4">
        <div className="bg-gray-100 rounded-lg p-4">
          <DroneTracker/>
          {/* <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Интерактивная карта на основе Leaflet.js</p>
            <p className="text-xs text-red-500 mt-2">
              Внимание: {dangerZones.length} опасных зон на карте!
            </p>
          </div> */}
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Всего активных дронов: 8 | Опасных зон: {dangerZones.length}
          </div>
          <button
            className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
            onClick={() => {
              fetchDangerZones();
              window.location.reload();
            }}
          >
            Обновить карту
          </button>
        </div>
      </div>
    </div>
  );
}
