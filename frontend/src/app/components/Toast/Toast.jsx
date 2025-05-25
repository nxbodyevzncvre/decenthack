"use client"


import { useState, useEffect } from "react"


const Toast = ({ message, type, show, onClose }) => {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
  }, [show])

  useEffect(() => {
    if (isVisible) {
      // Увеличиваем время показа для error и warning сообщений
      const duration = type === "error" || type === "warning" ? 8000 : 5000
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose, type])

  if (!isVisible) {
    return null
  }

  let backgroundColor = "bg-green-100"
  let textColor = "text-green-700"
  let borderColor = "border-green-200"
  let icon = "✅"

  if (type === "error") {
    backgroundColor = "bg-red-100"
    textColor = "text-red-700"
    borderColor = "border-red-200"
    icon = "❌"
  } else if (type === "warning") {
    backgroundColor = "bg-orange-100"
    textColor = "text-orange-700"
    borderColor = "border-orange-200"
    icon = "⚠️"
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${backgroundColor} ${textColor} border ${borderColor} rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right duration-300`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-lg">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-relaxed break-words">{message}</div>
        </div>
        <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Toast
