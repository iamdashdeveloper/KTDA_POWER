import axios, { AxiosError } from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  withCredentials: true, // Send cookies with requests
})

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle responses and errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle specific error scenarios
    if (error.code === "ECONNABORTED") {
      console.error("[API] Request timeout - server may be unresponsive")
      return Promise.reject(
        new Error("Request timeout. Server is not responding.")
      )
    }

    if (!error.response) {
      // Network error or CORS error
      console.error("[API] Network Error:", error.message)
      if (error.message.includes("Network Error")) {
        return Promise.reject(
          new Error(
            "Network error. Please check your connection and the API server."
          )
        )
      }
      return Promise.reject(error)
    }

    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken")
      window.location.href = "/login"
      return Promise.reject(new Error("Session expired. Please login again."))
    }

    // Handle forbidden errors
    if (error.response?.status === 403) {
      return Promise.reject(
        new Error("You do not have permission to perform this action.")
      )
    }

    // Handle not found errors
    if (error.response?.status === 404) {
      return Promise.reject(new Error("Resource not found."))
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error("[API] Server error:", error.response?.data)
      return Promise.reject(new Error("Server error. Please try again later."))
    }

    return Promise.reject(error)
  }
)

export default apiClient
