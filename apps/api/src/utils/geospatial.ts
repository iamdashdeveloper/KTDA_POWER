/**
 * PostGIS and Geospatial Utilities
 */

export interface Point {
  latitude: number
  longitude: number
}

export interface GeoJSONPoint {
  type: "Point"
  coordinates: [number, number] // [longitude, latitude]
}

/**
 * Convert Point coordinates to PostGIS Point string
 */
export function toPostGISPoint(point: Point): string {
  return `POINT(${point.longitude} ${point.latitude})`
}

/**
 * Convert PostGIS geometry to Point
 */
export function fromPostGISPoint(geometry: any): Point | null {
  if (!geometry) return null

  try {
    const coords = geometry.coordinates
    if (Array.isArray(coords) && coords.length === 2) {
      return {
        latitude: coords[1],
        longitude: coords[0],
      }
    }
  } catch (error) {
    console.error("Error parsing PostGIS geometry:", error)
  }

  return null
}

/**
 * Calculate distance between two points in kilometers
 * Using Haversine formula
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(point2.latitude - point1.latitude)
  const dLon = toRad(point2.longitude - point1.longitude)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Validate latitude
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90
}

/**
 * Validate longitude
 */
export function isValidLongitude(lon: number): boolean {
  return lon >= -180 && lon <= 180
}

/**
 * Validate point
 */
export function isValidPoint(point: Point): boolean {
  return isValidLatitude(point.latitude) && isValidLongitude(point.longitude)
}

/**
 * Convert PostGIS geometry to GeoJSON geometry
 * Handles geometry objects returned by Prisma/PostGIS
 */
export function postgisToGeoJSON(geometry: any): any {
  if (!geometry) return null

  try {
    // If it's already in GeoJSON format, return as-is
    if (
      geometry.type &&
      (geometry.type === "Point" ||
        geometry.type === "LineString" ||
        geometry.type === "Polygon" ||
        geometry.type === "MultiPoint" ||
        geometry.type === "MultiLineString" ||
        geometry.type === "MultiPolygon")
    ) {
      return geometry
    }

    // If it's a PostGIS object with coordinates property
    if (geometry.coordinates) {
      return geometry
    }

    // If it's a string (WKT format), we need to parse it
    if (typeof geometry === "string") {
      // This would require a WKT parser library
      console.warn("WKT geometry format not yet supported:", geometry)
      return null
    }

    console.warn("Unknown geometry format:", geometry)
    return null
  } catch (error) {
    console.error("Error converting PostGIS geometry to GeoJSON:", error)
    return null
  }
}
