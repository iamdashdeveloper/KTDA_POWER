import axios, { AxiosError } from "axios"

// CRITICAL: Log the environment variable immediately
const API_BASE_URL = import.meta.env.VITE_API_URL
console.log("[API] VITE_API_URL at runtime:", API_BASE_URL)
console.log("[API] All env vars:", import.meta.env)

// Validate that API URL is set
if (!API_BASE_URL || API_BASE_URL === "undefined") {
  console.error(
    "[API] ERROR: VITE_API_URL is not defined! API calls will fail."
  )
  console.error(
    "[API] Make sure VITE_API_URL is set in .env or environment variables"
  )
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL || "https://ktda-power-api.onrender.com", // Fallback for safety
  timeout: 30000, // 30 second timeout
  withCredentials: false, // Don't send credentials for cross-origin requests
})

// Retry configuration for network errors
let retryCount: Record<string, number> = {}
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Log the actual URL being called
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

// Handle responses and errors with retry logic
apiClient.interceptors.response.use(
  (response) => {
    // Reset retry count on success
    const key = `${response.config.method}:${response.config.url}`
    retryCount[key] = 0
    return response
  },
  async (error: AxiosError) => {
    // Log the full error for debugging
    console.error("[API] Full error object:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      },
    })

    // Determine request key for retry tracking
    const requestKey = `${error.config?.method}:${error.config?.url}`
    const currentRetry = retryCount[requestKey] || 0

    // Retry logic for network errors (not for 4xx/5xx responses)
    if (
      !error.response &&
      error.code !== "ECONNABORTED" &&
      currentRetry < MAX_RETRIES
    ) {
      retryCount[requestKey] = currentRetry + 1
      console.warn(
        `[API] Network error, retrying... (${currentRetry + 1}/${MAX_RETRIES})`
      )

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))

      // Retry the request
      return apiClient.request(error.config!)
    }

    // Handle specific error scenarios
    if (error.code === "ECONNABORTED") {
      console.error("[API] Request timeout - server may be unresponsive")
      return Promise.reject(
        new Error("Request timeout. Server is not responding.")
      )
    }

    if (!error.response) {
      // Network error or CORS error
      console.error("[API] Network Error Details:", {
        message: error.message,
        code: error.code,
        baseURL: API_BASE_URL,
      })
      if (error.message.includes("Network Error")) {
        return Promise.reject(
          new Error(
            `Network error. API URL: ${API_BASE_URL}. Please check your connection and the API server.`
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

    // Handle bad request errors - include response data
    if (error.response?.status === 400) {
      const errorData = error.response?.data as any
      console.error("[API] Bad Request (400) Details:", errorData)
      const errorMsg =
        errorData?.error || errorData?.message || "Invalid request"
      return Promise.reject(new Error(`Bad request: ${errorMsg}`))
    }

    // Handle server errors
    if (error.response?.status && error.response?.status >= 500) {
      console.error("[API] Server error:", error.response?.data)
      return Promise.reject(new Error("Server error. Please try again later."))
    }

    return Promise.reject(error)
  }
)

export default apiClient
