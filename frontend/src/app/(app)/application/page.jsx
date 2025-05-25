"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuth } from "@/app/hooks/useAuth"

import { checkIntersectionWithZones, prepareApplicationData } from "@/app/components/utils/utils"
import ProgressIndicator from "@/app/components/Application/progress-indicator/progress-indicator"
import ErrorMessage from "@/app/components/Application/error-message/error-message"
import StepOne from "@/app/components/Application/step-one/step-one"
import StepTwo from "@/app/components/Application/step-two/step-two"
import StepThree from "@/app/components/Application/step-three/step-three"

export default function CreateApplication() {
  useAuth()
  const [step, setStep] = useState(1)
  const [drones, setDrones] = useState([])
  const [dangerZones, setDangerZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [zonesLoading, setZonesLoading] = useState(false)
  const [error, setError] = useState("")
  const [intersectionCheck, setIntersectionCheck] = useState(null)
  const router = useRouter()

  // Form data state
  const [formData, setFormData] = useState({
    selectedDrone: "",
    startDate: "",
    endDate: "",
    maxHeight: "",
    selectedPosition: null,
    tested: false,
  })

  useEffect(() => {
    fetchDrones()
  }, [])

  useEffect(() => {
    if (step === 2) {
      fetchDangerZones()
    }
  }, [step])

  useEffect(() => {
    if (formData.selectedPosition && dangerZones.length > 0) {
      const result = checkIntersectionWithZones(formData.selectedPosition, dangerZones)
      setIntersectionCheck(result)
    }
  }, [formData.selectedPosition, dangerZones])

  const fetchDrones = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("http://localhost:5050/auth/drone/drones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setDrones(response.data.drone || [])
    } catch (err) {
      setError("Ошибка загрузки данных о дронах")
    } finally {
      setLoading(false)
    }
  }

  const fetchDangerZones = async () => {
    setZonesLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("http://localhost:5050/auth/zones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setDangerZones(response.data.zones || [])
    } catch (err) {
      console.error("Error fetching danger zones:", err)
      setDangerZones([])
    } finally {
      setZonesLoading(false)
    }
  }

  const handleSubmit = async () => {
    const data = prepareApplicationData(formData)

    try {
      const token = localStorage.getItem("token")
      const response = await axios.post("http://localhost:5050/auth/application/create", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log("Submission successful:", response.data)
      router.push("/dashboard")
    } catch (error) {
      console.error("Error submitting data:", error)
      setError("Ошибка при отправке заявки")
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.selectedDrone || !formData.startDate || !formData.endDate || !formData.maxHeight) {
        setError("Пожалуйста, заполните все обязательные поля")
        return
      }
      if (!formData.selectedPosition) {
        setError("Пожалуйста, выберите местоположение на карте")
        return
      }
    }
    if (step === 2) {
      if (intersectionCheck?.hasIntersection) {
        setError("Нельзя продолжить: выбранное местоположение пересекается с опасными зонами")
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Создание заявки на полёт</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ProgressIndicator currentStep={step} />
        <ErrorMessage error={error} />

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {step === 1 && (
            <StepOne
              formData={formData}
              onFormDataChange={setFormData}
              drones={drones}
              dangerZones={dangerZones}
              onNext={nextStep}
            />
          )}

          {step === 2 && (
            <StepTwo
              formData={formData}
              dangerZones={dangerZones}
              zonesLoading={zonesLoading}
              intersectionCheck={intersectionCheck}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}

          {step === 3 && (
            <StepThree
              formData={formData}
              drones={drones}
              intersectionCheck={intersectionCheck}
              dangerZones={dangerZones}
              onSubmit={handleSubmit}
              onPrev={prevStep}
            />
          )}
        </div>
      </div>
    </div>
  )
}
