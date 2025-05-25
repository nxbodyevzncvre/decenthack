"use client"

import { Wifi, WifiOff, Play, Square } from "lucide-react"

export default function ConnectionStatus({ isConnected, isConnecting, onConnect, onDisconnect }) {
  return (
    <div className="flex items-center space-x-3">
      {/* Статус подключения */}
      <div className="flex items-center space-x-2">
        {isConnected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
        <span className={`text-sm font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}>
          {isConnecting ? "Подключение..." : isConnected ? "Подключено" : "Отключено"}
        </span>
      </div>

      {/* Кнопки управления */}
      <div className="flex space-x-2">
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Square className="h-4 w-4" />
            <span>Отключить</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            <span>Подключить</span>
          </button>
        )}
      </div>
    </div>
  )
}
