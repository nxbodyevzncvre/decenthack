import axios from "axios"


const api = axios.create({
  baseURL: "http://localhost:5050",
})


const redirectToAuth = () => {

  localStorage.removeItem("token")


  if (typeof window !== "undefined") {
    window.location.href = "/auth/login" // или ваш путь к странице авторизации
  }
}


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)


api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {

    if (error.response?.status === 401) {
      console.log("JWT токен истек или недействителен")
      redirectToAuth()
    }


    if (
      error.response?.data?.message?.includes("token") ||
      error.response?.data?.message?.includes("expired") ||
      error.response?.data?.message?.includes("unauthorized")
    ) {
      console.log("Проблема с токеном:", error.response.data.message)
      redirectToAuth()
    }

    return Promise.reject(error)
  },
)

export default api
