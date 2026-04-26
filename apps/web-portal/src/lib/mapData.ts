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

export async function loadFeatureById(id: string): Promise<ProjectMapFeature & { subFeatures: ProjectMapFeature[] }> {
  return await ApiClient.get<ProjectMapFeature & { subFeatures: ProjectMapFeature[] }>(`/features/${id}`);
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
