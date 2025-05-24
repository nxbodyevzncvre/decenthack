"use client"

import { useState, useEffect } from "react";
import axios from "axios";
import { Delete, Plane, RefreshCw } from "lucide-react";

export default function DroneInfo() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDrones();
  }, []);

  const fetchDrones = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5050/auth/drone/drones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDrones(response.data.drone);
    } catch (err) {
      setError("Ошибка загрузки данных о дронах");
    } finally {
      setLoading(false);
    }
  };

  const deleteDrone = async (droneId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5050/auth/drone/delete/${droneId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDrones(drones.filter((drone) => drone.drone_id !== droneId));
    } catch (err) {
      console.error("Ошибка удаления дрона:", err);
    }
  };

  if (loading && drones !== null) return  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Загрузка дронов...</p>
        </div>
      </div>;

  if (error) return <p className="text-red-500">{error}</p>;
  if (drones === null) return <div className="p-8 text-center">
      <Plane className="h-12 w-12 text-gray-400 mx-auto" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Нет дронов</h3>
      <p className="mt-1 text-sm text-gray-500">Добавьте свой первый дрон для начала работы</p>
    </div>
    

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Информация о дронах</h2>
        <p className="text-sm text-gray-600">Просмотр и управление вашими дронами</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Модель</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Серийный номер</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бренд</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drones.map((drone) => (
              <tr key={drone.drone_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{drone.drone_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drone.model_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drone.serial_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drone.brand_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => deleteDrone(drone.drone_id)} className="text-red-600 hover:text-red-900">
                    <Delete />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
