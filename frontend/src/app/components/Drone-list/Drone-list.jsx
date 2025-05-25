"use client"

import { Plane, Battery, Signal, Route } from "lucide-react"
import { getStatusColor, getStatusText, getBatteryColor, getDroneColor } from "../utils/utils"



export default function DroneList({ drones, selectedDrone, onSelectDrone }) {
  const flyingDrones = drones.filter((drone) => drone.status === "flying")

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Летающие дроны ({flyingDrones.length})</h3>
      </div>

      {flyingDrones.length === 0 ? (
        <div className="text-center py-6">
          <Plane className="h-6 w-6 text-gray-400 mx-auto" />
          <p className="mt-2 text-xs text-gray-600">Нет летающих дронов</p>
          <p className="text-xs text-gray-500">Ожидание данных от WebSocket...</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {flyingDrones.map((drone) => {
            const droneColor = getDroneColor(drone.drone_id, selectedDrone?.drone_id === drone.drone_id)
            return (
              <div
                key={drone.drone_id}
                onClick={() => onSelectDrone(drone)}
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
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(drone.status)}`}>
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
  )
}
