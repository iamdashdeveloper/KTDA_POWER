/**
 * Weather Service - Fetches weather data from Open-Meteo API
 * Open-Meteo provides free weather data without authentication
 */

export interface CurrentWeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  windDirection: number
  weatherCode: number
  condition: string
  precipitation: number
  cloudCover: number
  visibility: number
  pressure: number
  isDay: boolean
  time: string
  evapotranspiration?: number
  dewPoint?: number
}

export interface DailyWeatherData {
  date: string
  maxTemp: number
  minTemp: number
  precipitation: number
  weatherCode: number
  condition: string
  windSpeed: number
  uvIndex: number
  sunrise: string
  sunset: string
}

export interface MonthlyWeatherData {
  month: string
  avgTemp: number
  maxTemp: number
  minTemp: number
  totalPrecipitation: number
  avgWindSpeed: number
  avgHumidity: number
}

export interface WeatherResponse {
  current: CurrentWeatherData
  daily: DailyWeatherData[]
  monthly?: MonthlyWeatherData[]
  latitude: number
  longitude: number
  timezone: string
}

// WMO Weather interpretation codes
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
}

/**
 * Get weather condition description from WMO code
 */
function getWeatherCondition(code: number): string {
  return WMO_CODES[code] || "Unknown"
}

/**
 * Fetch current weather data for a specific location
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @returns Current weather data
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<CurrentWeatherData> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,weather_code,precipitation,cloud_cover,visibility,pressure_msl,is_day,et0_fao_evapotranspiration,dew_point_2m",
      timezone: "auto",
    })

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()
    const current = data.current

    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      condition: getWeatherCondition(current.weather_code),
      precipitation: current.precipitation || 0,
      cloudCover: current.cloud_cover,
      visibility: current.visibility / 1000, // Convert to km
      pressure: current.pressure_msl,
      isDay: current.is_day === 1,
      time: current.time,
      evapotranspiration: current.et0_fao_evapotranspiration,
      dewPoint: current.dew_point_2m,
    }
  } catch (error) {
    console.error("Error fetching current weather:", error)
    throw error
  }
}

/**
 * Fetch daily weather forecast for a location
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @param days - Number of days to forecast (default: 7, max: 16)
 * @returns Array of daily weather data
 */
export async function fetchDailyWeather(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<DailyWeatherData[]> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily:
        "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,uv_index_max,sunrise,sunset",
      timezone: "auto",
      forecast_days: Math.min(days, 16).toString(),
    })

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()
    const daily = data.daily

    return daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index],
      precipitation: daily.precipitation_sum[index] || 0,
      weatherCode: daily.weather_code[index],
      condition: getWeatherCondition(daily.weather_code[index]),
      windSpeed: daily.wind_speed_10m_max[index],
      uvIndex: daily.uv_index_max[index],
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
    }))
  } catch (error) {
    console.error("Error fetching daily weather:", error)
    throw error
  }
}

/**
 * Fetch weather data for multiple days and aggregate to monthly statistics
 * This is a helper function that uses daily data to compute monthly statistics
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @param days - Number of days to aggregate (default: 30)
 * @returns Monthly weather statistics
 */
export async function fetchMonthlyWeatherStats(
  latitude: number,
  longitude: number,
  days: number = 30
): Promise<MonthlyWeatherData> {
  try {
    const dailyData = await fetchDailyWeather(latitude, longitude, days)

    if (dailyData.length === 0) {
      throw new Error("No daily weather data available")
    }

    // Calculate monthly aggregates
    const avgTemp =
      dailyData.reduce((sum, day) => sum + (day.maxTemp + day.minTemp) / 2, 0) /
      dailyData.length
    const maxTemp = Math.max(...dailyData.map((day) => day.maxTemp))
    const minTemp = Math.min(...dailyData.map((day) => day.minTemp))
    const totalPrecipitation = dailyData.reduce(
      (sum, day) => sum + day.precipitation,
      0
    )
    const avgWindSpeed =
      dailyData.reduce((sum, day) => sum + day.windSpeed, 0) / dailyData.length
    const avgHumidity = 65 // Default placeholder - Open-Meteo doesn't provide daily humidity average

    const firstDate = new Date(dailyData[0].date)
    const month = firstDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })

    return {
      month,
      avgTemp: Math.round(avgTemp * 10) / 10,
      maxTemp,
      minTemp,
      totalPrecipitation: Math.round(totalPrecipitation * 10) / 10,
      avgWindSpeed: Math.round(avgWindSpeed * 10) / 10,
      avgHumidity,
    }
  } catch (error) {
    console.error("Error fetching monthly weather stats:", error)
    throw error
  }
}

/**
 * Fetch comprehensive weather data (current + daily forecast)
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @param forecastDays - Number of days to forecast (default: 7)
 * @returns Complete weather response with current and forecast data
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  forecastDays: number = 7
): Promise<WeatherResponse> {
  try {
    const [current, daily] = await Promise.all([
      fetchCurrentWeather(latitude, longitude),
      fetchDailyWeather(latitude, longitude, forecastDays),
    ])

    // Get timezone from API
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: "weather_code",
    })
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    )
    const data = await response.json()

    return {
      current,
      daily,
      latitude,
      longitude,
      timezone: data.timezone || "UTC",
    }
  } catch (error) {
    console.error("Error fetching comprehensive weather data:", error)
    throw error
  }
}

/**
 * Fetch weather data for a specific date range
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function fetchWeatherByRange(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<WeatherResponse> {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    
    const start = new Date(startDate)
    const isHistorical = start < ninetyDaysAgo
    
    const baseUrl = isHistorical 
      ? "https://archive-api.open-meteo.com/v1/archive" 
      : "https://api.open-meteo.com/v1/forecast"

    // Archive API doesn't support dates in the future. 
    // Forecast API doesn't support dates older than 92 days.
    let finalEndDate = endDate
    if (isHistorical && endDate > todayStr) {
      finalEndDate = todayStr
    }

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,sunrise,sunset",
      timezone: "auto",
      start_date: startDate,
      end_date: finalEndDate,
    })

    const [current, response] = await Promise.all([
      fetchCurrentWeather(latitude, longitude),
      fetch(`${baseUrl}?${params}`)
    ])

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.reason || errorData.message || response.statusText || 'Unknown error';
      throw new Error(`Weather API error: ${errorMessage}`);
    }

    const data = await response.json()
    const daily = data.daily

    const dailyData: DailyWeatherData[] = daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index],
      precipitation: daily.precipitation_sum[index] || 0,
      weatherCode: daily.weather_code[index],
      condition: getWeatherCondition(daily.weather_code[index]),
      windSpeed: daily.wind_speed_10m_max[index],
      uvIndex: daily.uv_index_max ? daily.uv_index_max[index] : 0,
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
    }))

    return {
      current,
      daily: dailyData,
      latitude,
      longitude,
      timezone: data.timezone || "UTC",
    }
  } catch (error) {
    console.error("Error fetching weather by range:", error)
    throw error
  }
}

/**
 * Get weather data for a default location (Nairobi as default)
 * @returns Weather data for the default location
 */
export async function fetchDefaultLocationWeather(): Promise<WeatherResponse> {
  // Default location: Nairobi, Kenya
  return fetchWeatherData(36.8219, -1.2921, 7)
}
