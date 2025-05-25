




export const checkIntersectionWithZones = (position, dangerZones) => {
  if (!position) {
    return null
  }

  const [lat, lng] = position
  let hasIntersection = false
  const intersectedZones = []

  for (const zone of dangerZones) {
    const distance = calculateDistance(lat, lng, zone.latitude, zone.longtitude)
    if (distance <= zone.radius) {
      hasIntersection = true
      intersectedZones.push(zone)
    }
  }

  return {
    hasIntersection,
    intersectedZones,
    checkedPosition: position,
  }
}

export const prepareApplicationData = (formData) => {
  return {
    start_date: formData.startDate,
    end_date: formData.endDate,
    status: "Pending",
    drone_id: Number(formData.selectedDrone),
    latitude: formData.selectedPosition ? Number.parseFloat(formData.selectedPosition[0].toFixed(8)) : null,
    longtitude: formData.selectedPosition ? Number.parseFloat(formData.selectedPosition[1].toFixed(8)) : null,
    altitude: Number.parseInt(formData.maxHeight),
    tested: formData.tested ? 1 : 0, 
  }
}

export const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "одобрена":
      return "✅"
    case "rejected":
    case "отклонена":
      return "❌"
    case "pending":
    case "на рассмотрении":
      return "⏳"
    case "cancelled":
    case "отменена":
      return "🚫"
    case "in_progress":
    case "в процессе":
      return "🔄"
    default:
      return "📋"
  }
}

export const getWeatherIcon = (weatherMain) => {
  switch (weatherMain?.toLowerCase()) {
    case "clear":
      return "☀️"
    case "clouds":
      return "☁️"
    case "rain":
      return "🌧️"
    case "snow":
      return "❄️"
    case "thunderstorm":
      return "⛈️"
    case "drizzle":
      return "🌦️"
    case "mist":
    case "fog":
      return "🌫️"
    default:
      return "🌤️"
  }
}

export const getWindDirection = (degrees) => {
  const directions = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"]
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

export const getFlightConditions = (weather) => {
  if (!weather) return { status: "unknown", text: "Нет данных", color: "text-gray-600" }

  const { wind, main, weather: weatherArray } = weather
  const windSpeed = wind?.speed || 0
  const temp = main?.temp || 0
  const weatherMain = weatherArray?.[0]?.main?.toLowerCase()

  if (windSpeed > 8 || temp < -15 || temp > 35 || weatherMain === "thunderstorm") {
    return { status: "bad", text: "Неблагоприятные", color: "text-red-600" }
  } else if (windSpeed > 5 || temp < -5 || temp > 30 || weatherMain === "rain" || weatherMain === "snow") {
    return { status: "caution", text: "Осторожно", color: "text-yellow-600" }
  } else {
    return { status: "good", text: "Благоприятные", color: "text-green-600" }
  }
}

export const createDroneSvg = (size = 24, color = "#3b82f6", isSelected = false) => {
  const svgSize = isSelected ? size + 8 : size
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="${isSelected ? "11" : "10"}" fill="white" stroke="${color}" strokeWidth="2"/>
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="${color}"/>
      ${isSelected ? '<circle cx="12" cy="12" r="3" fill="white"/>' : ""}
    </svg>
  `)}`
}

export const getDroneColor = (droneId, isSelected = false) => {
  if (isSelected) return "#ef4444"

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#f97316"]
  const index = Number.parseInt(droneId.toString()) % colors.length
  return colors[index]
}

export const getStatusColor = (status) => {
  switch (status) {
    case "flying":
      return "text-blue-600 bg-blue-100"
    case "paused":
      return "text-orange-600 bg-orange-100"
    case "idle":
      return "text-yellow-600 bg-yellow-100"
    case "charging":
      return "text-purple-600 bg-purple-100"
    case "maintenance":
      return "text-red-600 bg-red-100"
    default:
      return "text-gray-600 bg-gray-100"
  }
}

export const getStatusText = (status) => {
  switch (status) {
    case "flying":
      return "В полёте"
    case "paused":
      return "Приостановлен"
    case "idle":
      return "Ожидание"
    case "charging":
      return "Зарядка"
    case "maintenance":
      return "Обслуживание"
    default:
      return "Неизвестно"
  }
}

export const getBatteryColor = (battery) => {
  if (battery > 50) return "text-green-600"
  if (battery > 20) return "text-yellow-600"
  return "text-red-600"
}

export const getMessageTypeColor = (type) => {
  switch (type) {
    case "flight-started":
      return "text-green-600"
    case "flight-completed":
      return "text-blue-600"
    case "flight-paused":
      return "text-orange-600"
    case "flight-resumed":
      return "text-green-600"
    case "position-update":
      return "text-gray-600"
    case "status-update":
      return "text-purple-600"
    case "warning":
      return "text-orange-600"
    case "connection":
      return "text-purple-600"
    case "weather":
      return "text-blue-600"
    case "application-approved":
      return "text-green-600"
    case "application-rejected":
      return "text-red-600"
    case "application-pending":
      return "text-yellow-600"
    case "restricted-zone-alert":
      return "text-red-600"
    default:
      return "text-gray-600"
  }
}

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Радиус Земли в метрах
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Расстояние в метрах
}
