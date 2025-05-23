"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, User, Plane, AlertTriangle, Plus, Info, LogOut } from "lucide-react"
import AddDrone from "@/app/components/AddDrone/AddDrone.jsx"
import DangerZones from "@/app/components/DangerZones/DangerZones.jsx"
import DroneInfo from "@/app/components/DroneInfo/DroneInfo.jsx"
import DroneMap from "@/app/components/DroneMap/DroneMap.jsx"
import FlightApplications from "@/app/components/FlightApplications/FlightApplications.jsx"
import { useRouter } from 'next/navigation'








export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("map")
  const router = useRouter();
  const logout = () =>{
    localStorage.removeItem("token");
    router.push("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Drone Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Иван Петров</span>
              <Link href="/">
                <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100" onClick={logout}>
                  <LogOut className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Боковая навигация */}
          <div className="w-full md:w-64 bg-white rounded-lg shadow-sm p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("map")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "map" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MapPin className="h-5 w-5" />
                <span>Карта дронов</span>
              </button>
              <button
                onClick={() => setActiveTab("drones")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "drones" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Plane className="h-5 w-5" />
                <span>Информация о дронах</span>
              </button>
              <button
                onClick={() => setActiveTab("applications")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "applications" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Info className="h-5 w-5" />
                <span>Заявки на полёты</span>
              </button>
              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "danger" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
                <span>Опасные зоны</span>
              </button>
              <button
                onClick={() => setActiveTab("add")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "add" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Plus className="h-5 w-5" />
                <span>Добавить дрон</span>
              </button>
            </nav>
          </div>

          {/* Основной контент */}
          <div className="flex-1">
            {activeTab === "map" && <DroneMap />}
            {activeTab === "drones" && <DroneInfo />}
            {activeTab === "pilot" && <PilotInfo />}
            {activeTab === "applications" && <FlightApplications />}
            {activeTab === "danger" && <DangerZones />}
            {activeTab === "add" && <AddDrone />}
          </div>
        </div>
      </div>
    </div>
  )
}

