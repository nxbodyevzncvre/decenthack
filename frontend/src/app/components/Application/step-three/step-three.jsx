"use client"

import { CheckCircle } from "lucide-react"

export default function StepThree({ formData, drones, intersectionCheck, dangerZones, onSubmit, onPrev }) {
  const getSelectedDroneDetails = () => {
    const drone = drones.find((d) => d.drone_id == formData.selectedDrone)
    return drone ? `${drone.serial_number} (${drone.model_name})` : "Не выбран"
  }

  return (
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
            <p className="text-sm text-gray-900">{formData.maxHeight} м</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Время начала:</p>
            <p className="text-sm text-gray-900">
              {formData.startDate ? new Date(formData.startDate).toLocaleString("ru-RU") : "Не указано"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Время окончания:</p>
            <p className="text-sm text-gray-900">
              {formData.endDate ? new Date(formData.endDate).toLocaleString("ru-RU") : "Не указано"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-500">Местоположение:</p>
            <p className="text-sm text-gray-900">
              {formData.selectedPosition
                ? `${formData.selectedPosition[0].toFixed(5)}, ${formData.selectedPosition[1].toFixed(5)}`
                : "Не выбрано"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-500">Демо:</p>
            <p className="text-sm text-gray-900">
              {formData.tested ? "✅ Демо тестирование" : "❌ Обычный полет"}
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
          onClick={onPrev}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Назад
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Отправить заявку
        </button>
      </div>
    </div>
  )
}
