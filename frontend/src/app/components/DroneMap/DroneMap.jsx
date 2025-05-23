"use client";
import { MapPin } from "lucide-react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMapEvents } from "react-leaflet";
import { useState, useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";

export default function DroneMap() {
  const center = [51.505, -0.09];

  const fillBlueOptions = {
    color: "red",
    fillColor: "none",
    fillOpacity: 0.5,
  };

  const redOptions = { color: "red" };

  const customIcon = L.icon({
    iconUrl: "/pin.svg",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });


    function LocationMarker() {
        const [position, setPosition] = useState(null);
        const markerRef = useRef(null);
        const map = useMapEvents({
            click(e) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            map.flyTo([lat, lng], map.getZoom()); // плавно центрируем карту
            },
        });

        useEffect(() => {
            if (position !== null && markerRef.current) {
            markerRef.current.openPopup(); // открываем попап, когда метка появилась
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
        <MapContainer center={[51.12, 71.43]} zoom={13} scrollWheelZoom={false} className="h-[350px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[51.12, 71.43]} icon={customIcon}>
            <Popup>
              A pretty CSS3 popup. <br /> Easily customizable.
            </Popup>
          </Marker>
          <Circle center={center} pathOptions={fillBlueOptions} radius={200} />
          <CircleMarker center={[51.12, 71.43]} pathOptions={redOptions} radius={20}>
            <Popup>Popup in CircleMarker</Popup>
          </CircleMarker>
          <LocationMarker />
        </MapContainer>
      </div>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Интерактивная карта дронов</h2>
        <p className="text-sm text-gray-600">Отслеживайте местоположение всех дронов в реальном времени</p>
      </div>
      <div className="p-4">
        <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Интерактивная карта на основе Leaflet.js</p>
            <p className="text-xs text-red-500 mt-2">Внимание: 2 дрона в опасной зоне!</p>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">Всего активных дронов: 8</div>
          <button
            className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
            onClick={() => window.location.reload()}
          >
            Обновить карту
          </button>
        </div>
      </div>
    </div>
  );
}
