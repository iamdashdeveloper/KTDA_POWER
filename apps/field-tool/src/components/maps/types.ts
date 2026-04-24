export type Basemap = "osm" | "satellite"

export interface RouteStep {
  maneuver: {
    type: string
    modifier?: string
    location: [number, number]
  }
  name: string
  distance: number
  duration: number
  mode: string
}

export interface RouteLeg {
  steps: RouteStep[]
  distance: number
  duration: number
}

export interface OSRMRoute {
  geometry: any
  legs: RouteLeg[]
  distance: number
  duration: number
}

export interface LegendGroupItem {
  id: string
  name: string
  geometryType: string
  count: number
}
