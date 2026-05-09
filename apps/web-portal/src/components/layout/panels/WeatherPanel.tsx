import React, { useEffect, useState, useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line, Bar } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)
import {
  Cloud,
  Eye,
  Gauge,
  AlertCircle,
  Loader,
  Thermometer,
  Sun,
  CloudRain,
} from "lucide-react"
import { useWeatherStore } from "@/store/useWeatherStore"
import { WindTurbineViewer } from "@/components/three/WindTurbineViewer"

import cloudyImg from "@/assets/weather-icons/cloudy.png"
import heavyRainImg from "@/assets/weather-icons/heavy-rain.png"
import stormImg from "@/assets/weather-icons/storm.png"
import sunImg from "@/assets/weather-icons/sun.png"

const getWeatherImage = (code: number) => {
  if (code === 0 || code === 1) return sunImg
  if (code === 2 || code === 3 || code === 45 || code === 48) return cloudyImg
  if (code >= 51 && code <= 86) return heavyRainImg
  if (code >= 95 && code <= 99) return stormImg
  return sunImg
}

const getWindDirection = (degree: number) => {
  const directions = ["N", "N-E", "E", "S-E", "S", "S-W", "W", "N-W"]
  return directions[Math.round(degree / 45) % 8]
}

const getBgStyle = (code: number, isDay: boolean) => {
  if (!isDay)
    return {
      background: "linear-gradient(to bottom, #1e293b, #0f172a)",
      color: "white",
    }
  if (code === 0 || code === 1)
    return {
      background: "linear-gradient(to bottom, #bae6fd, #7dd3fc)",
      color: "#0f172a",
    } // Sunny
  if (code === 2 || code === 3 || code === 45 || code === 48)
    return {
      background: "linear-gradient(to bottom, #cbd5e1, #94a3b8)",
      color: "#0f172a",
    } // Cloudy
  if (code >= 51 && code <= 86)
    return {
      background: "linear-gradient(to bottom, #475569, #334155)",
      color: "white",
    } // Rain
  if (code >= 95 && code <= 99)
    return {
      background: "linear-gradient(to bottom, #1e293b, #0f172a)",
      color: "white",
    } // Storm
  return {
    background: "linear-gradient(to bottom, #bae6fd, #7dd3fc)",
    color: "#0f172a",
  }
}

interface WeatherPanelProps {
  stationName?: string
  latitude?: number
  longitude?: number
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({
  stationName = "Weather Station",
  latitude = -1.2921, // Nairobi Latitude
  longitude = 36.8219, // Nairobi Longitude
}) => {
  const {
    current,
    daily,
    isLoading,
    error,
    fetchAllWeatherData,
    fetchWeatherByRange,
    clearError,
  } = useWeatherStore()

  // Default range: today to 7 days from now
  const todayStr = new Date().toISOString().split("T")[0]
  const weekLaterStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]

  const [startDate, setStartDate] = useState<string>(todayStr)
  const [endDate, setEndDate] = useState<string>(weekLaterStr)
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false)
  const [forecastDays, setForecastDays] = useState<number>(7)

  // Calculate valid date ranges
  const maxForecastDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 16)
    return date.toISOString().split("T")[0]
  }, [])

  const minHistoricalDate = "1940-01-01"

  const today = daily && daily.length > 0 ? daily[0] : null
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "--:--"
    return new Date(timeStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const handleApply = React.useCallback(() => {
    if (useCustomRange) {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates")
        return
      }
      if (new Date(startDate) > new Date(endDate)) {
        alert("Start date must be before or equal to end date")
        return
      }
      fetchWeatherByRange(latitude, longitude, startDate, endDate)
    } else {
      fetchAllWeatherData(latitude, longitude, forecastDays)
    }
  }, [
    latitude,
    longitude,
    startDate,
    endDate,
    forecastDays,
    useCustomRange,
    fetchAllWeatherData,
    fetchWeatherByRange,
  ])

  // Fetch weather data when location changes or mode/forecast days changes
  useEffect(() => {
    handleApply()
  }, [latitude, longitude, forecastDays, useCustomRange]) // Removed startDate and endDate to prevent auto-fetching on every keystroke

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <Loader size={48} className="animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            Loading weather data...
          </p>
          <p className="text-xs text-muted-foreground">
            Fetching from Open-Meteo API
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="flex items-center gap-3 rounded border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle size={20} className="text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">
              Error loading weather
            </p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-xs font-semibold text-destructive hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <Cloud size={48} className="text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No weather data available
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-row gap-6">
        <div className="h-80 w-60 shrink-0">
          <WindTurbineViewer
            windSpeed={current.windSpeed}
            isDay={current.isDay}
          />
        </div>

        {/* Additional Metrics Grid */}
        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full grid-cols-2 gap-2 px-4">
            <div className="grid-col-span-2">{stationName}</div>
            <div>Weather Metrics</div>
            {/* Evapotranspiration */}
            <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Sun size={14} className="text-yellow-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Evaporation
                </span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {current.evapotranspiration !== undefined
                  ? current.evapotranspiration.toFixed(2)
                  : "--"}{" "}
                mm
              </div>
            </div>

            {/* Dew Point */}
            <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Thermometer size={14} className="text-rose-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Dew Point
                </span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {current.dewPoint !== undefined
                  ? Math.round(current.dewPoint)
                  : "--"}
                °C
              </div>
            </div>

            {/* Visibility */}
            <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-orange-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Visibility
                </span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {Math.round(current.visibility)} km
              </div>
            </div>

            {/* Cloud Cover */}
            <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Cloud size={14} className="text-gray-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Cloud Cover
                </span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {current.cloudCover}%
              </div>
            </div>

            {/* Precipitation */}
            <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <CloudRain size={14} className="text-cyan-600" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Precipitation
                </span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {current.precipitation.toFixed(1)} mm
              </div>
            </div>

            {/* Pressure */}
            <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Gauge size={14} className="text-purple-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Pressure
                </span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {Math.round(current.pressure)} mb
              </div>
            </div>
          </div>
        </div>

        {/* Current Weather Widget */}
        <div
          className="ml-auto flex w-[380px] flex-col justify-between rounded-sm p-4 shadow-xl"
          style={getBgStyle(current.weatherCode, current.isDay)}
        >
          {/* Header */}
          <div className="flex items-center justify-between font-sans">
            <span className="text-xl font-medium tracking-tight">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            <span className="text-lg font-bold tracking-tight">
              {new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Top section: Temp and Icon */}
          <div className="mt-4 flex items-center justify-between">
            <div className="font-sans text-[5.5rem] leading-none font-bold tracking-tighter">
              {Math.round(current.temperature)}°
            </div>
            <img
              src={getWeatherImage(current.weatherCode)}
              alt={current.condition}
              className="h-32 w-32 object-contain drop-shadow-xl"
            />
          </div>

          {/* Bottom details */}
          <div className="mt-8 flex justify-between font-sans text-[13px] leading-relaxed font-medium">
            <div className="flex flex-col opacity-90">
              <div>Real Feel {Math.round(current.temperature + 1)}°</div>
              <div>
                Wind: {getWindDirection(current.windDirection)},{" "}
                {Math.round(current.windSpeed)} km/h
              </div>
              <div>Pressure: {Math.round(current.pressure)}MB</div>
              <div>Humidity: {current.humidity}%</div>
            </div>

            <div className="flex flex-col justify-end text-right opacity-90">
              <div>Sunrise: {formatTime(today?.sunrise)}</div>
              <div>Sunset: {formatTime(today?.sunset)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast : todo make this 14 days*/}
      {daily && daily.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            14-Day Forecast
          </h3>
          <div className="flex gap-2 overflow-x-auto">
            {daily.slice(0, 14).map((day, index) => (
              <div
                key={index}
                className="flex flex-shrink-0 flex-col items-center gap-2 rounded border border-border bg-muted/20 p-3"
              >
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </span>
                <img
                  src={getWeatherImage(day.weatherCode)}
                  alt={day.condition}
                  className="h-8 w-8 object-contain drop-shadow-sm"
                />
                <div className="text-center">
                  <div className="text-xs font-bold text-foreground">
                    {Math.round(day.maxTemp)}°
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {Math.round(day.minTemp)}°
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {day.precipitation.toFixed(1)}mm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="mt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Weather Trends
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background p-1">
              <button
                onClick={() => setUseCustomRange(false)}
                className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${!useCustomRange ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Forecast
              </button>
              <button
                onClick={() => setUseCustomRange(true)}
                className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${useCustomRange ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Custom Range
              </button>
            </div>

            {!useCustomRange ? (
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={16}>16 Days</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  min={minHistoricalDate}
                  max={maxForecastDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground">to</span>
                <input
                  type="date"
                  value={endDate}
                  min={minHistoricalDate}
                  max={maxForecastDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleApply}
                  disabled={isLoading}
                  className="rounded bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? "Fetching..." : "Apply"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Temperature Graph */}
          <div className="rounded-sm border border-border bg-muted/10 p-4 shadow-sm">
            <h4 className="mb-4 text-[10px] font-semibold text-muted-foreground uppercase">
              Temperature Variation (°C)
            </h4>
            <div className="h-64">
              <Line
                data={{
                  labels:
                    daily?.map((d) =>
                      new Date(d.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                      })
                    ) || [],
                  datasets: [
                    {
                      label: "Max Temp",
                      data: daily?.map((d) => d.maxTemp) || [],
                      borderColor: "rgb(239, 68, 68)",
                      backgroundColor: "rgba(239, 68, 68, 0.5)",
                      tension: 0.4,
                      borderWidth: 1,
                      pointRadius: 1,
                    },
                    {
                      label: "Min Temp",
                      data: daily?.map((d) => d.minTemp) || [],
                      borderColor: "rgb(59, 130, 246)",
                      backgroundColor: "rgba(59, 130, 246, 0.5)",
                      tension: 0.4,
                      borderWidth: 1.5,
                      pointRadius: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "top" as const,
                      labels: { boxWidth: 12, font: { size: 10 } },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      grid: { color: "rgba(255, 255, 255, 0.05)" },
                      ticks: { font: { size: 10 } },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Rainfall Graph */}
          <div className="rounded-sm border border-border bg-muted/10 p-4 shadow-sm">
            <h4 className="mb-4 text-[10px] font-semibold text-muted-foreground uppercase">
              Precipitation Trends (mm)
            </h4>
            <div className="h-64">
              <Bar
                data={{
                  labels:
                    daily?.map((d) =>
                      new Date(d.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                      })
                    ) || [],
                  datasets: [
                    {
                      label: "Rainfall",
                      data: daily?.map((d) => d.precipitation) || [],
                      backgroundColor: "rgba(6, 182, 212, 0.6)",
                      borderColor: "rgb(6, 182, 212)",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "top" as const,
                      labels: { boxWidth: 12, font: { size: 10 } },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: "rgba(255, 255, 255, 0.05)" },
                      ticks: { font: { size: 10 } },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Some kind of map: */}
    </div>
  )
}
