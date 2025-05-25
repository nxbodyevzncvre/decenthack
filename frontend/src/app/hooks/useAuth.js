"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export const useAuth = () => {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token")

      if (!token) {
        router.push("/sign-in")
        return
      }


      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const currentTime = Date.now() / 1000

        if (payload.exp && payload.exp < currentTime) {
          console.log("Токен истек")
          localStorage.removeItem("token")
          router.push("/sign-in")
        }
      } catch (error) {
        console.error("Ошибка при проверке токена:", error)
        localStorage.removeItem("token")
        router.push("/sign-in")
      }
    }

    checkAuth()
  }, [router])
}
