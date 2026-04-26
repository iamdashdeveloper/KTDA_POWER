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
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */
export function getFeatureColor(geometryType: string, _layerId?: string, opacity: number = 1): string {
  // Default colors - simple colors
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return `rgba(59, 130, 246, ${opacity})`  // blue
  }

  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return `rgba(34, 197, 94, ${opacity * 0.8})`  // green
  }

  return `rgba(168, 85, 247, ${opacity * 0.9})`  // purple
}
