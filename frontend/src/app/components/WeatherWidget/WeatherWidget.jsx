"use client"

import { useState } from "react"
import { RefreshCw, Eye, EyeOff } from "lucide-react"
import { getWeatherIcon, getWindDirection, getFlightConditions } from "@/app/components/utils/utils"

export default function WeatherWidget({ weatherData, weatherLoading, onRefresh }) {
  const [isVisible, setIsVisible] = useState(true)

  if (!weatherData) return null

  return (
    <div className="absolute top-2 right-2 z-[999]">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-white p-2 rounded-md shadow-md border flex items-center justify-center"
      >
        {isVisible ? (
          <EyeOff className="h-4 w-4 text-gray-600" />
        ) : (
          <Eye className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {isVisible && (
        <div className="bg-white rounded-md shadow-md p-2 min-w-[70px] border mt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <span className="text-lg">{getWeatherIcon(weatherData.weather[0]?.main)}</span>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">{weatherData.name}</h4>
                <p className="text-[10px] text-gray-600">{weatherData.weather[0]?.description}</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={weatherLoading}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${weatherLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="flex items-center space-x-1">
              <span className="text-base">🌡️</span>
              <div>
                <div className="font-medium">{weatherData.main.temp}°C</div>
                <div className="text-[10px] text-gray-600">Ощущается {weatherData.main.feels_like}°C</div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-base">💨</span>
              <div>
                <div className="font-medium">{weatherData.wind.speed} м/с</div>
                <div className="text-[10px] text-gray-600">{getWindDirection(weatherData.wind.deg)}</div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-base">💧</span>
              <div>
                <div className="font-medium">{weatherData.main.humidity}%</div>
                <div className="text-[10px] text-gray-600">Влажность</div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-base">📊</span>
              <div>
                <div className="font-medium">{weatherData.main.pressure} гПа</div>
                <div className="text-[10px] text-gray-600">Давление</div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-gray-600">Видимость:</span>
                <span className="text-[10px] font-medium">{(weatherData.visibility / 1000).toFixed(1)} км</span>
              </div>
            </div>

            <div className="mt-1 p-1 rounded-md bg-gray-50">
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-medium text-gray-700">Условия для полетов:</span>
                <span className={`text-[10px] font-medium ${getFlightConditions(weatherData).color}`}>
                  {getFlightConditions(weatherData).text}
                </span>
              </div>
              {getFlightConditions(weatherData).status === "bad" && (
                <p className="text-[9px] text-red-600 mt-0.5">⚠️ Полеты не рекомендуются</p>
              )}
              {getFlightConditions(weatherData).status === "caution" && (
                <p className="text-[9px] text-yellow-600 mt-0.5">⚠️ Соблюдайте осторожность</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
