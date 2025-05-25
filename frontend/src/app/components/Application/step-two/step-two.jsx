"use client"

import FlightMap from "@/app/components/application/flight-map/flight-map"
import IntersectionStatus from "@/app/components/application/intersection-status/intersection-status"

export default function StepTwo({ formData, dangerZones, zonesLoading, intersectionCheck, onNext, onPrev }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Проверка опасных зон</h2>

      {zonesLoading ? (
        <div className="bg-gray-100 rounded-lg h-80 mb-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Загрузка опасных зон...</p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <FlightMap
            selectedPosition={formData.selectedPosition}
            onPositionSelect={() => {}} // Только для просмотра
            dangerZones={dangerZones}
            showDangerZones={true}
          />
        </div>
      )}

      {formData.selectedPosition && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">
            Проверяем координаты: {formData.selectedPosition[0].toFixed(5)}, {formData.selectedPosition[1].toFixed(5)}
          </p>
          <IntersectionStatus intersectionCheck={intersectionCheck} dangerZones={dangerZones} />
        </div>
      )}

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
          onClick={onNext}
          disabled={intersectionCheck?.hasIntersection}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
            intersectionCheck?.hasIntersection ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-800"
          }`}
        >
          Продолжить
        </button>
      </div>
    </div>
  )
}
