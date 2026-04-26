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
      ...options.headers,
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json"
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    console.log(`[ApiClient] ${options.method || 'GET'} ${url}`)
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    })

    if (!response.ok) {
      console.error(`[ApiClient] Request failed with status ${response.status}: ${url}`)
      const error = await response.json().catch(() => ({}))
      console.error(`[ApiClient] Error details:`, error)
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

  static postForm<T>(endpoint: string, formData: FormData, options?: FetchOptions) {
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
