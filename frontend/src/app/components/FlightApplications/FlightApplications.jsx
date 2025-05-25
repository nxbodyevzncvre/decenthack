"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Delete, Plus, RefreshCw, Calendar, Clock, MapPin, AlertCircle } from "lucide-react"
import axios from "axios"

export default function FlightApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedApp, setSelectedApp] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const deleteApplication = async (appId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5050/auth/application/delete/${appId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setApplications(applications.filter((application) => application.id !== appId));
    } catch (err) {
      console.error("Ошибка удаления заявки:", err);
    }
  };

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("http://localhost:5050/auth/application/applications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setApplications(response.data.applications || [])
      console.log(response.data.applications)
      setError("")
    } catch (err) {
      console.error("Error fetching applications:", err)
      setError("Ошибка загрузки заявок")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "Одобрено"
      case "pending":
        return "В ожидании"
      case "rejected":
        return "Отклонено"
      default:
        return status
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ru-RU")
  }

  const formatTime = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
  }

  const openModal = (app) => {
    setSelectedApp(app)
    setShowModal(true)
  }

  const closeModal = () => {
    setSelectedApp(null)
    setShowModal(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Загрузка заявок...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Заявки на полёты</h2>
              <p className="text-sm text-gray-600">Управление заявками на полёты дронов</p>
            </div>
            <button
              onClick={fetchApplications}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Обновить"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>


        {applications.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет заявок</h3>
            <p className="mt-1 text-sm text-gray-500">Создайте свою первую заявку на полёт</p>
            <div className="mt-6">
              <Link href="/application">
                <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать заявку
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дрон
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Время
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Локация
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Высота
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.serial_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.start_date ? formatDate(app.start_date) : app.start_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        { app.start_date.split(" ")[1]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.latitude} {app.longtitude}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.altitude ? `${app.altitude} м` : app.altitude}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}
                        >
                          {getStatusText(app.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.status === "Executing" || app.status === "Processi ng" || app.status === "Completed" || "Rejected" || "Canceled" ? <button onClick={() => deleteApplication(app.id)} className="text-red-600 hover:text-red-900">
                            <Delete />
                        </button> : <p className="text-red-900 font-medium">
                            Запрещено
                        </p>}
                        
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">Всего заявок: {applications.length}</div>
              <Link href="/application">
                <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать новую заявку
                </button>
              </Link>
            </div>
          </>
        )}
      </div>

     
    
    </>
  )
}
