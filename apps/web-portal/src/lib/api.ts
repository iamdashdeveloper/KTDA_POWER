const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ktda-power-api.onrender.com"

// CRITICAL: Log the environment variable immediately
console.log("[ApiClient] VITE_API_URL at runtime:", API_BASE_URL)
if (import.meta.env.VITE_API_URL === "https://ktda-power.onrender.com") {
  console.warn("[ApiClient] WARNING: Using deprecated API URL. Please update VITE_API_URL to https://ktda-power-api.onrender.com")
}
console.log("[ApiClient] All env vars:", import.meta.env)

// Validate that API URL is set
if (!API_BASE_URL || API_BASE_URL === "undefined") {
  console.error(
    "[ApiClient] ERROR: VITE_API_URL is not defined! API calls will fail."
  )
  console.error(
    "[ApiClient] Make sure VITE_API_URL is set in .env or environment variables"
  )
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
  timeout?: number
}

// Retry configuration
let retryCount: Record<string, number> = {}
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

export class ApiClient {
  static async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const cleanBaseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    const url = `${cleanBaseUrl}${cleanEndpoint}`

    const token = localStorage.getItem("authToken")
    const timeout = options.timeout || 60000 // 60 second timeout (increased for Render cold starts)

    const headers: Record<string, string> = {
      ...options.headers,
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json"
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    console.log(`[ApiClient] ${options.method || "GET"} ${url}`)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestKey = `${options.method || "GET"}:${endpoint}`
    const currentRetry = retryCount[requestKey] || 0

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "omit", // Don't send credentials for cross-origin requests
        signal: controller.signal,
      })

      // Reset retry count on success
      retryCount[requestKey] = 0

      if (!response.ok) {
        console.error(
          `[ApiClient] Request failed with status ${response.status}: ${url}`
        )
        const error = await response.json().catch(() => ({}))
        console.error(`[ApiClient] Error details:`, error)

        if (response.status === 401) {
          localStorage.removeItem("authToken")
          window.location.href = "/login"
        }

        throw new Error(error.error || error.message || "Request failed")
      }

      return response.json()
    } catch (err: any) {
      console.error("[ApiClient] Request error:", {
        error: err.message,
        code: err.code,
        name: err.name,
        url: url,
        baseURL: API_BASE_URL,
        retry: currentRetry,
      })

      // Retry logic for network errors
      if (
        err.name === "AbortError" ||
        (err instanceof TypeError && err.message.includes("Failed to fetch"))
      ) {
        if (currentRetry < MAX_RETRIES) {
          retryCount[requestKey] = currentRetry + 1
          console.warn(
            `[ApiClient] Network error, retrying... (${currentRetry + 1}/${MAX_RETRIES})`
          )
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
          return this.request<T>(endpoint, options)
        }

        if (err.name === "AbortError") {
          throw new Error(
            "Request timeout. Server is not responding. Please check your connection."
          )
        }
        throw new Error(
          `Network error. API URL: ${API_BASE_URL}. Please check your connection and ensure the API server is accessible.`
        )
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  static get<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  static post<T>(endpoint: string, data?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static postForm<T>(
    endpoint: string,
    formData: FormData,
    options?: FetchOptions
  ) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
    })
  }

  static put<T>(endpoint: string, data?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  static patch<T>(endpoint: string, data?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  static delete<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }
}
