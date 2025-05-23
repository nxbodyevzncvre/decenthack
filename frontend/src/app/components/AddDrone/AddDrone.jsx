"use client"


import { useState } from "react"
import axios from "axios"
import Toast from "@/app/components/toast/Toast.jsx"

export default function AddDrone() {
  const [model_name, setModel_name] = useState("")
  const [serial_number, setSerial_Number] = useState("")
  const [brand_name, setBrand_name] = useState("")
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const token = localStorage.getItem("token");
    console.log(token);
    console.log(serial_number, model_name, brand_name)


    try {
      const response = await axios.post("http://localhost:5050/auth/drone/create", {
        serial_number,
        model_name,
        brand_name,
      },{ headers:{Authorization: `Bearer ${token}` }})

      if (response.data.message) {
        setSuccess(true)
        // Очистить форму после успешного добавления
        setModel_name("")
        setSerial_Number("")
        setBrand_name("")
      }
    } catch (err) {
      setError(err.response?.data?.message || "Произошла ошибка при добавлении дрона")
    } finally {
      setLoading(false)
    }
  }

  const closeToast = () => {
    setSuccess(false)
    setError(null)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">

      <Toast message="Дрон успешно добавлен!" type="success" show={success} onClose={closeToast} />


      <Toast message={error || ""} type="error" show={!!error} onClose={closeToast} />

      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Добавление дрона</h2>
        <p className="text-sm text-gray-600">Зарегистрируйте новый дрон в системе</p>
      </div>
      <div className="p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="droneModel" className="block text-sm font-medium text-gray-700">
                Модель дрона
              </label>
              <input
                type="text"
                id="droneModel"
                value={model_name}
                onChange={(e) => setModel_name(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700">
                Серийный номер
              </label>
              <input
                type="text"
                id="serialNumber"
                value={serial_number}
                onChange={(e) => setSerial_Number(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                Марка дрона
              </label>
              <input
                type="text"
                id="brand"
                value={brand_name}
                onChange={(e) => setBrand_name(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Добавление..." : "Добавить дрон"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
