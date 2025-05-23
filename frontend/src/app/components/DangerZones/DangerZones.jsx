import { MapPin} from "lucide-react"


export default function DangerZones() {
  const zones = [
    {
      id: "ZONE-001",
      name: "Аэропорт Шереметьево",
      coordinates: "55.972642, 37.414589",
      radius: "8 км",
      restriction: "Полный запрет",
    },
    {
      id: "ZONE-002",
      name: "Кремль",
      coordinates: "55.751999, 37.617734",
      radius: "5 км",
      restriction: "Полный запрет",
    },
    {
      id: "ZONE-003",
      name: "Стадион Лужники",
      coordinates: "55.715765, 37.553168",
      radius: "2 км",
      restriction: "Временный запрет",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Опасные зоны</h2>
        <p className="text-sm text-gray-600">Зоны с ограничениями для полётов дронов</p>
      </div>
      <div className="p-4">
        <div className="bg-gray-100 rounded-lg h-64 mb-4 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Карта опасных зон</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Координаты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Радиус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ограничение
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{zone.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.coordinates}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.radius}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        zone.restriction === "Полный запрет"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {zone.restriction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}