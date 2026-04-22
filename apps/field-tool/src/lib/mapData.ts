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

export function parseGeometry(
  geometry: ProjectMapFeature["geometry"]
): GeoJsonGeometry | null {
  if (!geometry) {
    return null
  }

  if (typeof geometry === "string") {
    try {
      return JSON.parse(geometry) as GeoJsonGeometry
    } catch {
      return null
    }
  }

  return geometry
}

export function parseIssueCoordinates(
  issue: ProjectMapIssue
): [number, number] | null {
  const location = issue.location

  if (location && typeof location === "object") {
    const geometry = location as GeoJsonGeometry
    if (
      geometry.type === "Point" &&
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length >= 2
    ) {
      const [longitude, latitude] = geometry.coordinates as [number, number]
      if (
        typeof longitude === "number" &&
        Number.isFinite(longitude) &&
        typeof latitude === "number" &&
        Number.isFinite(latitude)
      ) {
        return [longitude, latitude]
      }
    }
  }

  const metadata = issue.metadata || {}
  const latitude = metadata.latitude
  const longitude = metadata.longitude

  if (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  ) {
    return [longitude, latitude]
  }

  if (typeof latitude === "string" && typeof longitude === "string") {
    const parsedLatitude = Number(latitude)
    const parsedLongitude = Number(longitude)
    if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
      return [parsedLongitude, parsedLatitude]
    }
  }

  return null
}
