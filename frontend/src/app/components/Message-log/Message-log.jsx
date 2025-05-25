"use client"

import { getMessageTypeColor } from "../utils/utils"

export default function MessageLog({ messages, onClearMessages }) {
  return (
    <div className="h-32 border-t border-gray-200 flex flex-col">
      <div className="flex items-center justify-between p-2 bg-gray-50">
        <h4 className="text-xs font-medium text-gray-900">Лог событий</h4>
        <button onClick={onClearMessages} className="text-xs text-gray-600 hover:text-gray-900">
          Очистить
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {messages.slice(0, 20).map((msg) => (
          <div key={msg.id} className="text-xs leading-tight">
            <span className="text-gray-500">[{msg.timestamp}]</span>{" "}
            <span className={getMessageTypeColor(msg.type)}>{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
