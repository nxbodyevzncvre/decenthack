import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export default function IntersectionStatus({ intersectionCheck, dangerZones }) {
  if (intersectionCheck === null) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">Проверка пересечений с опасными зонами...</p>
          </div>
        </div>
      </div>
    )
  }

  if (intersectionCheck.hasIntersection) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 font-medium">
              Внимание! Выбранное местоположение пересекается с опасными зонами:
            </p>
            <ul className="mt-2 text-sm text-red-600">
              {intersectionCheck.intersectedZones.map((zone) => (
                <li key={zone.restrictedZone_id} className="flex items-center">
                  <span className="mr-2">•</span>
                  {zone.zone_name} (радиус: {zone.radius}м)
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-red-700">Полёт в этой зоне запрещен. Выберите другое местоположение.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border-l-4 border-green-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-green-700">
            Отлично! Выбранное местоположение не пересекается с опасными зонами. Полёт разрешен.
          </p>
          <p className="text-sm text-green-600 mt-1">Проверено {dangerZones.length} опасных зон.</p>
        </div>
      </div>
    </div>
  )
}
