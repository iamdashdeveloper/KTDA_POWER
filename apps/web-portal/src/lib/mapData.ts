import { ApiClient } from "./api"

export type GeoJsonGeometry = {
  type: string
  coordinates?: unknown
  geometries?: unknown
  properties?: Record<string, unknown>
}

export interface ProjectMapFeature {
  id: string
  projectId: string | null
  name: string
  groupName?: string | null
  parentName?: string | null
  geometry: GeoJsonGeometry | string | null
  details?: Record<string, unknown>
  createdAt: string
  images?: string[]
  parentId?: string | null
}

export interface ProjectMapIssue {
  id: string
  projectId: string
  featureId?: string | null
  title: string
  description?: string | null
  status: string
  priority: number
  images?: string[]
  createdAt: string
  location?: GeoJsonGeometry | string | null
  metadata?: Record<string, unknown>
}

export async function loadProjectFeatures(
  projectId: string
): Promise<ProjectMapFeature[]> {
  if (!projectId) {
    return []
  }

  const response = await ApiClient.get<ProjectMapFeature[]>(
    `/projects/${projectId}/features`
  )
  return response || []
}

export async function loadProjectIssues(
  projectId: string
): Promise<ProjectMapIssue[]> {
  if (!projectId) {
    return []
  }

  const response = await ApiClient.get<ProjectMapIssue[]>(
    `/projects/${projectId}/issues/map`
  )
  return response || []
}

export async function loadFeatureById(
  id: string
): Promise<ProjectMapFeature & { subFeatures: ProjectMapFeature[] }> {
  return await ApiClient.get<
    ProjectMapFeature & { subFeatures: ProjectMapFeature[] }
  >(`/features/${id}`)
}

export function parseGeometry(
  geometry: ProjectMapFeature["geometry"]
): GeoJsonGeometry | null {
  if (!geometry) {
    return null
  }

  // If it's a JSON object, return it
  if (typeof geometry === "object") {
    return geometry as GeoJsonGeometry
  }

  if (typeof geometry === "string") {
    // Try parsing as JSON first
    try {
      return JSON.parse(geometry) as GeoJsonGeometry
    } catch {
      // If JSON parsing fails, try WKT parsing
      try {
        return parseWKTGeometry(geometry)
      } catch (wktError) {
        console.warn(
          "Failed to parse geometry as JSON or WKT:",
          geometry,
          wktError
        )
        return null
      }
    }
  }

  return null
}

/**
 * Parse WKT (Well-Known Text) geometry string to GeoJSON
 * Handles: POINT, LINESTRING, POLYGON, MULTIPOINT, MULTILINESTRING, MULTIPOLYGON, GEOMETRYCOLLECTION
 */
function parseWKTGeometry(wkt: string): GeoJsonGeometry | null {
  const trimmed = wkt.trim()

  // POINT
  if (trimmed.toUpperCase().startsWith("POINT")) {
    const match = trimmed.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
    if (match) {
      return {
        type: "Point",
        coordinates: [parseFloat(match[1]), parseFloat(match[2])],
      }
    }
  }

  // LINESTRING
  if (trimmed.toUpperCase().startsWith("LINESTRING")) {
    const match = trimmed.match(/LINESTRING\s*\(\s*(.+)\s*\)/i)
    if (match) {
      const coords = parseCoordinateList(match[1])
      if (coords.length >= 2) {
        return {
          type: "LineString",
          coordinates: coords,
        }
      }
    }
  }

  // POLYGON
  if (trimmed.toUpperCase().startsWith("POLYGON")) {
    const match = trimmed.match(/POLYGON\s*\(\s*(.+)\s*\)/i)
    if (match) {
      const rings = parseRings(match[1])
      if (rings.length > 0) {
        return {
          type: "Polygon",
          coordinates: rings,
        }
      }
    }
  }

  // MULTIPOINT
  if (trimmed.toUpperCase().startsWith("MULTIPOINT")) {
    const match = trimmed.match(/MULTIPOINT\s*\(\s*(.+)\s*\)/i)
    if (match) {
      const coords = parseCoordinateList(match[1])
      if (coords.length > 0) {
        return {
          type: "MultiPoint",
          coordinates: coords,
        }
      }
    }
  }

  // MULTILINESTRING
  if (trimmed.toUpperCase().startsWith("MULTILINESTRING")) {
    const match = trimmed.match(/MULTILINESTRING\s*\(\s*(.+)\s*\)/i)
    if (match) {
      const lines = parseLinestrings(match[1])
      if (lines.length > 0) {
        return {
          type: "MultiLineString",
          coordinates: lines,
        }
      }
    }
  }

  // MULTIPOLYGON
  if (trimmed.toUpperCase().startsWith("MULTIPOLYGON")) {
    const match = trimmed.match(/MULTIPOLYGON\s*\(\s*(.+)\s*\)/i)
    if (match) {
      const polys = parsePolygons(match[1])
      if (polys.length > 0) {
        return {
          type: "MultiPolygon",
          coordinates: polys,
        }
      }
    }
  }

  return null
}

/**
 * Parse a coordinate list like "1 2, 3 4, 5 6"
 */
function parseCoordinateList(str: string): number[][] {
  const coords: number[][] = []
  const pairs = str.split(",")

  for (const pair of pairs) {
    const parts = pair.trim().split(/\s+/)
    if (parts.length >= 2) {
      const x = parseFloat(parts[0])
      const y = parseFloat(parts[1])
      if (!isNaN(x) && !isNaN(y)) {
        coords.push([x, y])
      }
    }
  }

  return coords
}

/**
 * Parse polygon rings like "(1 2, 3 4, 5 6, 1 2), (7 8, 9 10, 11 12, 7 8)"
 */
function parseRings(str: string): number[][][] {
  const rings: number[][][] = []
  let depth = 0
  let current = ""

  for (const char of str) {
    if (char === "(") {
      depth++
      if (depth > 1) current += char
    } else if (char === ")") {
      depth--
      if (depth > 0) current += char
      if (depth === 0 && current) {
        const coords = parseCoordinateList(current)
        if (coords.length > 0) rings.push(coords)
        current = ""
      }
    } else if (depth > 0) {
      current += char
    }
  }

  return rings
}

/**
 * Parse linestrings like "(1 2, 3 4), (5 6, 7 8)"
 */
function parseLinestrings(str: string): number[][][] {
  const lines: number[][][] = []
  let depth = 0
  let current = ""

  for (const char of str) {
    if (char === "(") {
      depth++
      if (depth > 1) current += char
    } else if (char === ")") {
      depth--
      if (depth > 0) current += char
      if (depth === 0 && current) {
        const coords = parseCoordinateList(current)
        if (coords.length > 0) lines.push(coords)
        current = ""
      }
    } else if (depth > 0) {
      current += char
    }
  }

  return lines
}

/**
 * Parse polygons like "((1 2, 3 4, 5 6, 1 2)), ((7 8, 9 10, 11 12, 7 8))"
 */
function parsePolygons(str: string): number[][][][] {
  const polys: number[][][][] = []
  let depth = 0
  let current = ""

  for (const char of str) {
    if (char === "(") {
      depth++
      current += char
    } else if (char === ")") {
      current += char
      depth--
      if (depth === 0 && current) {
        const rings = parseRings(current.slice(1, -1))
        if (rings.length > 0) polys.push(rings)
        current = ""
      }
    } else if (depth > 0) {
      current += char
    }
  }

  return polys
}
