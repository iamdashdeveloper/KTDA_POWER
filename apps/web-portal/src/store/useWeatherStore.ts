import { create } from "zustand"
import {
  fetchWeatherData,
  fetchCurrentWeather,
  fetchDailyWeather,
  fetchMonthlyWeatherStats,
  fetchWeatherByRange,
  type CurrentWeatherData,
  type DailyWeatherData,
  type MonthlyWeatherData,
} from "@/services/weatherService"

interface WeatherStore {
  // Current weather data
  current: CurrentWeatherData | null
  daily: DailyWeatherData[]
  monthly: MonthlyWeatherData | null

  // Loading states
  isLoadingCurrent: boolean
  isLoadingDaily: boolean
  isLoadingMonthly: boolean
  isLoading: boolean

  // Error states
  error: string | null

  // Location data
  latitude: number
  longitude: number
  timezone: string

  // Data fetching functions
  fetchCurrentWeather: (latitude: number, longitude: number) => Promise<void>
  fetchDailyWeather: (
    latitude: number,
    longitude: number,
    days?: number
  ) => Promise<void>
  fetchMonthlyWeather: (
    latitude: number,
    longitude: number,
    days?: number
  ) => Promise<void>
  fetchAllWeatherData: (
    latitude: number,
    longitude: number,
    forecastDays?: number
  ) => Promise<void>
  fetchWeatherByRange: (
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ) => Promise<void>

  // Clear data
  clearWeatherData: () => void
  clearError: () => void
}

export const useWeatherStore = create<WeatherStore>((set) => ({
  // Initial state
  current: null,
  daily: [],
  monthly: null,
  isLoadingCurrent: false,
  isLoadingDaily: false,
  isLoadingMonthly: false,
  isLoading: false,
  error: null,
  latitude: 36.8219, // Default to Nairobi
  longitude: -1.2921,
  timezone: "UTC",

  // Fetch current weather
  fetchCurrentWeather: async (latitude: number, longitude: number) => {
    set({ isLoadingCurrent: true, error: null })
    try {
      const data = await fetchCurrentWeather(latitude, longitude)
      set({
        current: data,
        latitude,
        longitude,
        isLoadingCurrent: false,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch current weather"
      set({ error: errorMessage, isLoadingCurrent: false })
    }
  },

  // Fetch daily weather
  fetchDailyWeather: async (
    latitude: number,
    longitude: number,
    days: number = 7
  ) => {
    set({ isLoadingDaily: true, error: null })
    try {
      const data = await fetchDailyWeather(latitude, longitude, days)
      set({
        daily: data,
        latitude,
        longitude,
        isLoadingDaily: false,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch daily weather"
      set({ error: errorMessage, isLoadingDaily: false })
    }
  },

  // Fetch monthly weather
  fetchMonthlyWeather: async (
    latitude: number,
    longitude: number,
    days: number = 30
  ) => {
    set({ isLoadingMonthly: true, error: null })
    try {
      const data = await fetchMonthlyWeatherStats(latitude, longitude, days)
      set({
        monthly: data,
        latitude,
        longitude,
        isLoadingMonthly: false,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch monthly weather"
      set({ error: errorMessage, isLoadingMonthly: false })
    }
  },

  // Fetch all weather data at once
  fetchAllWeatherData: async (
    latitude: number,
    longitude: number,
    forecastDays: number = 7
  ) => {
    set({ isLoading: true, error: null })
    try {
      const weatherData = await fetchWeatherData(
        latitude,
        longitude,
        forecastDays
      )
      set({
        current: weatherData.current,
        daily: weatherData.daily,
        latitude: weatherData.latitude,
        longitude: weatherData.longitude,
        timezone: weatherData.timezone,
        isLoading: false,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch weather data"
      set({ error: errorMessage, isLoading: false })
    }
  },

  // Fetch weather data for a specific range
  fetchWeatherByRange: async (
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ) => {
    set({ isLoading: true, error: null })
    try {
      const weatherData = await fetchWeatherByRange(
        latitude,
        longitude,
        startDate,
        endDate
      )
      set({
        current: weatherData.current,
        daily: weatherData.daily,
        latitude: weatherData.latitude,
        longitude: weatherData.longitude,
        timezone: weatherData.timezone,
        isLoading: false,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch weather range"
      set({ error: errorMessage, isLoading: false })
    }
  },

  // Clear all weather data
  clearWeatherData: () => {
    set({
      current: null,
      daily: [],
      monthly: null,
      error: null,
    })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))
