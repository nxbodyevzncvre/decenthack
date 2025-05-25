import { Battery, Signal, Navigation, Clock, MapPin, Route } from "lucide-react"
import { getStatusColor, getStatusText, getBatteryColor, getDroneColor } from "@/app/components/utils/utils"

export default function DroneInfoPanel({ drone }) {
  // Показываем панель для летающих и приостановленных дронов
  if (!drone || !drone.currentPosition || (drone.status !== "flying" && drone.status !== "paused")) return null

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[300px] border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div
            className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: getDroneColor(drone.drone_id, true) }}
          />
          <h4 className="font-medium text-gray-900">{drone.serial_number}</h4>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(drone.status)}`}>
          {getStatusText(drone.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="flex items-center space-x-2">
          <Battery className="h-4 w-4 text-gray-400" />
          <span className={getBatteryColor(drone.battery)}>{drone.battery}%</span>
        </div>
        <div className="flex items-center space-x-2">
          <Signal className="h-4 w-4 text-gray-400" />
          <span>{drone.signal}%</span>
        </div>
        <div className="flex items-center space-x-2">
          <Navigation className="h-4 w-4 text-gray-400" />
          <span>{drone.currentPosition.altitude}м</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>{drone.currentPosition.speed.toFixed(1)} м/с</span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-xs">
            {drone.currentPosition.latitude.toFixed(6)}, {drone.currentPosition.longitude.toFixed(6)}
          </span>
        </div>

        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-600">
            <div>Прогресс маршрута: {drone.currentPosition.route_progress.toFixed(1)}%</div>
            <div>Точек траектории: {drone.positions.length}</div>
            <div>Последнее обновление: {new Date(drone.lastUpdate).toLocaleTimeString("ru-RU")}</div>
          </div>
        </div>

        {drone.flightData && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <Route className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-gray-700">
                {drone.status === "paused" ? "Приостановленный полет" : "Активный полет"}
              </p>
            </div>
            <div className="text-xs text-gray-600">
              <div>Заявка: {drone.flightData.application_id}</div>
              <div>Пилот: {drone.flightData.pilot_id}</div>
              {drone.flightData.estimated_end_time && (
                <div>
                  Ожидаемое завершение: {new Date(drone.flightData.estimated_end_time).toLocaleTimeString("ru-RU")}
                </div>
              )}
            </div>

            {drone.pauseReason && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                <div className="text-orange-700 font-medium">Причина паузы:</div>
                <div className="text-orange-600">{drone.pauseReason}</div>
                {drone.pauseTime && (
                  <div className="text-orange-500 mt-1">
                    Приостановлен: {new Date(drone.pauseTime).toLocaleTimeString("ru-RU")}
                  </div>
                )}
              </div>
            )}

            {drone.lastAlert && (
              <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                <div className="text-red-700 font-medium">Последний алерт:</div>
                <div className="text-red-600">{drone.lastAlert.zone_name}</div>
                <div className="text-red-500">
                  {drone.lastAlert.alert_level} - {Math.round(drone.lastAlert.distance)}м
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
