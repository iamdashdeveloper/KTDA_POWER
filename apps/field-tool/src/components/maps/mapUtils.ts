import type { RouteStep } from "./types"

/* ------------------------------------------------------------------ */
/*  Generate human-readable instruction from OSRM maneuver data       */
/* ------------------------------------------------------------------ */
export function generateInstruction(
  step: RouteStep,
  proximity?: number
): string {
  const { maneuver, name } = step
  const type = maneuver.type.toLowerCase()
  const modifier = maneuver.modifier?.toLowerCase() || ""
  const street = name || "the road"

  if (type === "arrive") {
    return "You have arrived at your destination"
  }

  let action = ""
  switch (type) {
    case "depart":
      action = `Head ${modifier || "straight"} on ${street}`
      break
    case "turn":
      action = `Turn ${modifier} onto ${street}`
      break
    case "continue":
      action = `Continue ${modifier || "straight"} on ${street}`
      break
    case "uturn":
      action = `Make a U-turn onto ${street}`
      break
    case "roundabout":
    case "rotary": {
      const exitMatch = modifier.match(/\d+/)
      const exit = exitMatch ? `exit ${exitMatch[0]}` : "the exit"
      action = `Enter the roundabout and take ${exit} onto ${street}`
      break
    }
    case "on ramp":
    case "on_ramp":
      action = `Take the ramp ${modifier} onto ${street}`
      break
    case "off ramp":
    case "off_ramp":
      action = `Take the exit ${modifier} onto ${street}`
      break
    case "merge":
      action = `Merge ${modifier} onto ${street}`
      break
    case "fork":
      action = `Keep ${modifier || "straight"} at the fork onto ${street}`
      break
    case "end of road":
    case "end_of_road":
      action = `At the end of the road, turn ${modifier} onto ${street}`
      break
    case "new name":
    case "new_name":
      action = `Continue onto ${street}`
      break
    default:
      action = `Proceed on ${street}`
  }

  if (proximity !== undefined && proximity < 100) {
    return action.replace(/\s+in\s+\d+\s+(meters?|kilometers?)/, "") + " now"
  }
  if (proximity !== undefined) {
    return `${action} in ${Math.round(proximity)} meters`
  }

  return action
}

/* ------------------------------------------------------------------ */
/*  Distance / duration formatters                                     */
/* ------------------------------------------------------------------ */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)} min`
  }
  return `${Math.round(seconds)} sec`
}

/* ------------------------------------------------------------------ */
/*  Haversine distance (meters) between two [lon, lat] points         */
/* ------------------------------------------------------------------ */
export function haversineDistance(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371e3 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
      ),
      Math.sqrt(
        1 -
          (sinDLat * sinDLat +
            Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon)
      )
    )

  return R * c
}

/* ------------------------------------------------------------------ */
/*  Project coordinate resolution                                      */
/* ------------------------------------------------------------------ */
export function getProjectCoordinates(
  location:
    | {
        latitude: number
        longitude: number
      }
    | string
    | null
    | undefined
): [number, number] | null {
  if (!location) {
    return null
  }

  if (typeof location === "object") {
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return [longitude, latitude]
    }
    return null
  }

  try {
    const parsed = JSON.parse(location)

    if (
      parsed?.type === "Point" &&
      Array.isArray(parsed.coordinates) &&
      parsed.coordinates.length >= 2
    ) {
      const longitude = Number(parsed.coordinates[0])
      const latitude = Number(parsed.coordinates[1])
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [longitude, latitude]
      }
    }
  } catch {
    return null
  }

  return null
}

/* ------------------------------------------------------------------ */
/*  Persistence Helpers                                                 */
/* ------------------------------------------------------------------ */

const COLOR_STORAGE_KEY = "ktda_map_layer_colors"

/**
 * Gets a map of layer ID to color hex from localStorage
 */
export function getStoredLayerColors(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(COLOR_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (e) {
    console.error("Failed to parse stored layer colors:", e)
    return {}
  }
}

/**
 * Persists a new color for a specific layer ID
 */
export function setStoredLayerColor(layerId: string, color: string): void {
  if (typeof window === "undefined") return
  const colors = getStoredLayerColors()
  colors[layerId] = color
  localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors))
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
export function formatLayerCount(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

/* ------------------------------------------------------------------ */
/*  Theme helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Returns a CSS oklch() color string derived from a shadcn CSS variable.
 * Defaults to 'primary' if no variable is specified.
 */
export function getThemeColor(variable: string = "--primary", opacity: number = 1): string {
  if (typeof window === "undefined") return "rgba(0,0,0,0)"

  // If variable looks like it's already a complete color (hex, rgb, oklch, hsl), return it as-is
  if (variable.startsWith("#") || variable.startsWith("rgb") || variable.startsWith("oklch") || variable.startsWith("hsl")) {
    if (opacity < 1 && variable.startsWith("#")) {
      // For hex colors with opacity, convert to rgba
      const hex = variable.slice(1)
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    return variable
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  if (!value) return "rgba(0,0,0,1)" // Fallback if variable is missing

  // Check if value is already wrapped in oklch() or other color function
  if (value.startsWith("oklch(") || value.startsWith("rgb(") || value.startsWith("hsl(")) {
    // Already wrapped - replace opacity or add it
    if (value.includes("/")) {
      // Already has opacity, replace it
      return value.replace(/\/\s*[\d.]+\s*\)/, `/ ${opacity})`)
    } else if (value.endsWith(")")) {
      // Add opacity
      return value.slice(0, -1) + ` / ${opacity})`
    }
    return value
  }

  // Value is just the oklch components (e.g., "0.5 0.1 200")
  return `oklch(${value} / ${opacity})`
}

export function getFeatureColor(geometryType: string, layerId?: string, opacity: number = 1): string {
  // Check for stored override first
  if (layerId) {
    const storedColors = getStoredLayerColors()
    if (storedColors[layerId]) {
      const baseColor = storedColors[layerId]
      // If baseColor is hex, convert to rgba with opacity if needed
      if (baseColor.startsWith("#") && opacity < 1) {
        const hex = baseColor.slice(1)
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${opacity})`
      }
      return baseColor
    }
  }

  // Default colors - no theme variables, just simple colors
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return `rgba(59, 130, 246, ${opacity})`  // blue
  }

  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return `rgba(34, 197, 94, ${opacity * 0.8})`  // green
  }

  return `rgba(168, 85, 247, ${opacity * 0.9})`  // purple
}

