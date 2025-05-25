"use client"

import FlightMap from "@/app/components/Application/flight-map/flight-map"

export default function StepOne({ formData, onFormDataChange, drones, dangerZones, onNext }) {
  const handleInputChange = (field, value) => {
    onFormDataChange({ ...formData, [field]: value })
  }

  const handlePositionSelect = (position) => {
    onFormDataChange({ ...formData, selectedPosition: position })
  }

  return (
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
              value={formData.selectedDrone}
              onChange={(e) => handleInputChange("selectedDrone", e.target.value)}
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
              value={formData.maxHeight}
              onChange={(e) => handleInputChange("maxHeight", e.target.value)}
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
              value={formData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
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
              value={formData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
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
          <div className="mt-1">
            <FlightMap
              selectedPosition={formData.selectedPosition}
              onPositionSelect={handlePositionSelect}
              dangerZones={dangerZones}
              showDangerZones={true}
            />
          </div>
          {formData.selectedPosition && (
            <div className="mt-2 text-sm text-gray-600">
              Выбранные координаты: {formData.selectedPosition[0].toFixed(5)}, {formData.selectedPosition[1].toFixed(5)}
            </div>
          )}
        </div>

        {/* Добавляем чекбокс tested */}
        <div className="flex items-center">
          <input
            id="tested"
            type="checkbox"
            checked={formData.tested || false}
            onChange={(e) => handleInputChange("tested", e.target.checked)}
            className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
          />
          <label htmlFor="tested" className="ml-2 block text-sm text-gray-900">
            Демо тестирование
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Продолжить
        </button>
      </div>
    </div>
  )
}
