const API_BASE_URL = import.meta.env.VITE_API_URL

// CRITICAL: Log the environment variable immediately
console.log("[ApiClient] VITE_API_URL at runtime:", API_BASE_URL)
console.log("[ApiClient] All env vars:", import.meta.env)

// Validate that API URL is set
if (!API_BASE_URL || API_BASE_URL === "undefined") {
  console.error("[ApiClient] ERROR: VITE_API_URL is not defined! API calls will fail.")
  console.error("[ApiClient] Make sure VITE_API_URL is set in .env or environment variables")
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
  timeout?: number
}

export class ApiClient {
  static async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = localStorage.getItem("authToken")
    const timeout = options.timeout || 30000 // 30 second timeout

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    console.log(`[ApiClient] ${options.method || 'GET'} ${url}`)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "omit", // Don't send credentials for cross-origin requests
        signal: controller.signal,
      })

      if (!response.ok) {
        console.error(`[ApiClient] Request failed with status ${response.status}: ${url}`)
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
        url: url,
        baseURL: API_BASE_URL,
      })

      if (err.name === "AbortError") {
        throw new Error(
          "Request timeout. Server is not responding. Please check your connection."
        )
      }
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
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

// Auth-specific helpers
export const authApi = {
  signin: (email: string, password: string) =>
    ApiClient.post("/auth/login", { email, password }),

  signup: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    companyId: string
  }) => ApiClient.post("/auth/register", data),

  onboard: (data: { position: string; bio?: string; avatarUrl?: string }) =>
    ApiClient.post("/auth/onboarding", data),

  refresh: () => ApiClient.post("/auth/refresh", {}),

  logout: () => ApiClient.post("/auth/logout", {}),
}
