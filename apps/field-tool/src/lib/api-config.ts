/**
 * API Configuration Utility
 *
 * Provides centralized API URL configuration with fallbacks
 * and better error diagnostics
 */

export const API_CONFIG = {
  // Use environment variable for API URL
  // In production, set VITE_API_URL to full URL
  baseUrl: import.meta.env.VITE_API_URL as string,
  timeout: 30000, // 30 seconds (increased for Render cold starts)
}

/**
 * Makes an API request with better error handling
 *
 * @param endpoint - API endpoint (e.g., "/auth/login")
 * @param options - Fetch options
 * @returns Promise with response
 *
 * @example
 * const data = await apiRequest("/companies", {
 *   method: "GET",
 *   credentials: "include"
 * })
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseUrl}${endpoint}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "omit", // Use 'omit' for production CORS compatibility
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(
        errorData.error || errorData.message || "API request failed"
      )
      ;(error as any).status = response.status
      ;(error as any).data = errorData
      throw error
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      // Network error - API might not be running
      const err = new Error(
        `Unable to connect to API. Please ensure the API server is running at ${API_CONFIG.baseUrl}. ` +
          `This could also be a CORS issue or network connectivity problem.`
      )
      ;(err as any).originalError = error
      ;(err as any).isNetworkError = true
      throw err
    }

    if ((error as any).name === "AbortError") {
      throw new Error(
        `API request timeout (${API_CONFIG.timeout}ms). The server may be slow or unreachable.`
      )
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Check if API is reachable (for diagnostics)
 */
export async function checkApiHealth(): Promise<{
  isHealthy: boolean
  message: string
  url: string
}> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    return {
      isHealthy: response.ok,
      message: response.ok
        ? "API is reachable"
        : `API returned ${response.status}`,
      url: API_CONFIG.baseUrl,
    }
  } catch (error) {
    return {
      isHealthy: false,
      message: `Cannot connect to API: ${error instanceof Error ? error.message : "Unknown error"}`,
      url: API_CONFIG.baseUrl,
    }
  }
}

/**
 * Get API URL (useful for debugging)
 */
export function getApiUrl(endpoint: string = ""): string {
  return `${API_CONFIG.baseUrl}${endpoint}`
}

export default API_CONFIG
