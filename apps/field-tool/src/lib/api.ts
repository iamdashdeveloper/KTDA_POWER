const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

export class ApiClient {
  static async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = localStorage.getItem("authToken")

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || error.message || "Request failed")
    }

    return response.json()
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
