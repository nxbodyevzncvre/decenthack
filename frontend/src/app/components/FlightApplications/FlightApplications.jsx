export default function FlightApplications() {
  const applications = [
    {
      id: "APP-001",
      date: "23.05.2025",
      time: "10:00 - 12:00",
      location: "Парк Горького",
      status: "Одобрено",
      height: "120 м",
    },
    {
      id: "APP-002",
      date: "25.05.2025",
      time: "14:00 - 16:00",
      location: "Воробьевы горы",
      status: "В ожидании",
      height: "150 м",
    },
    {
      id: "APP-003",
      date: "27.05.2025",
      time: "09:00 - 11:00",
      location: "ВДНХ",
      status: "Отклонено",
      height: "200 м",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Заявки на полёты</h2>
        <p className="text-sm text-gray-600">Управление заявками на полёты дронов</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Локация
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Высота</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applications.map((app) => (
              <tr key={app.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.time}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.height}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      app.status === "Одобрено"
                        ? "bg-green-100 text-green-800"
                        : app.status === "В ожидании"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-gray-600 hover:text-gray-900">Подробнее</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <button className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          Создать новую заявку
        </button>
      </div>
    </div>
  )
}