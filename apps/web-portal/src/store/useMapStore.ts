import { create } from "zustand"

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  type: "base" | "feature" | "issue" | "reference"
}

export interface ProjectFeature {
  parentName: any
  id: string
  name: string
  visible: boolean
  groupId?: string
  groupName?: string
  geometry?: any // GeoJSON geometry object (Point, LineString, Polygon, etc.)
  coordinates?: [number, number] // [lon, lat] representative point for routing
}

interface MapStore {
  layers: MapLayer[]
  toggleLayer: (id: string) => void
  setLayerVisibility: (id: string, visible: boolean) => void
  removeLayer: (id: string) => void
  // Individual Features
  projectFeatures: ProjectFeature[]
  scratchFeatures: ProjectFeature[]
  hiddenFeatureIds: Set<string>
  setProjectFeatures: (features: ProjectFeature[]) => void
  setScratchFeatures: (features: ProjectFeature[]) => void
  addScratchFeature: (feature: ProjectFeature) => void
  removeScratchFeature: (id: string) => void
  toggleFeatureVisibility: (id: string) => void
  toggleGroupVisibility: (groupName: string) => void
  // View Mode
  viewMode: "2D" | "TERRAIN_3D"
  setViewMode: (mode: "2D" | "TERRAIN_3D") => void
  viewCenter: [number, number] // [lon, lat]
  viewZoom: number
  setViewCenterZoom: (center: [number, number], zoom: number) => void
  // Tools
  activeTool: string
  setActiveTool: (tool: string) => void
  // Commands & Actions
  currentCommand: { id: string; timestamp: number; payload?: any } | null
  executeCommand: (commandId: string, payload?: any) => void
  // Terrain commands (used by ribbon → CesiumMap)
  terrainCommand: { id: string; timestamp: number } | null
  executeTerrainCommand: (id: string) => void
  // Stats
  featureCount: number
  issueCount: number
  setStats: (features: number, issues: number) => void
  // Refresh Trigger
  refreshTrigger: number
  triggerRefresh: () => void
  // Weather Panel
  weatherPanelOpen: boolean
  setWeatherPanelOpen: (open: boolean) => void
  // Land Cover
  landCoverTileUrl: string | null
  setLandCoverTileUrl: (url: string | null) => void
  landCoverConfig: {
    year: number
    visibleClasses: number[]
    paletteOverrides: Record<number, string>
  }
  setLandCoverConfig: (config: Partial<MapStore["landCoverConfig"]>) => void
}

export const useMapStore = create<MapStore>((set) => ({
  layers: [
    { id: "osm", name: "OpenStreetMap", visible: true, type: "base" },
    { id: "satellite", name: "World Imagery", visible: false, type: "base" },
    {
      id: "reference",
      name: "Reference Labels",
      visible: true,
      type: "reference",
    },
    {
      id: "project-features",
      name: "Project Features",
      visible: true,
      type: "feature",
    },
    { id: "project-issues", name: "Map Issues", visible: true, type: "issue" },
    { id: "landcover", name: "ESA Land Cover", visible: false, type: "base" },
  ],
  toggleLayer: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),
  setLayerVisibility: (id, visible) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, visible } : l)),
    })),
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
    })),
  activeTool: "explore",
  setActiveTool: (tool) => set({ activeTool: tool }),
  viewMode: "2D",
  setViewMode: (mode) => set({ viewMode: mode }),
  viewCenter: [36.8219, -1.2921], // Default to Nairobi
  viewZoom: 12,
  setViewCenterZoom: (center, zoom) =>
    set({ viewCenter: center, viewZoom: zoom }),
  currentCommand: null,
  executeCommand: (id, payload) =>
    set({ currentCommand: { id, timestamp: Date.now(), payload } }),
  terrainCommand: null,
  executeTerrainCommand: (id) =>
    set({ terrainCommand: { id, timestamp: Date.now() } }),
  projectFeatures: [],
  scratchFeatures: [],
  hiddenFeatureIds: new Set(),
  setProjectFeatures: (features) =>
    set({ projectFeatures: features, hiddenFeatureIds: new Set() }),
  setScratchFeatures: (features) => set({ scratchFeatures: features }),
  addScratchFeature: (feature) =>
    set((state) => ({
      scratchFeatures: [...state.scratchFeatures, feature],
    })),
  removeScratchFeature: (id) =>
    set((state) => ({
      scratchFeatures: state.scratchFeatures.filter((f) => f.id !== id),
    })),
  toggleFeatureVisibility: (id) =>
    set((state) => {
      const next = new Set(state.hiddenFeatureIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { hiddenFeatureIds: next }
    }),
  toggleGroupVisibility: (groupName) =>
    set((state) => {
      const groupFeatures = state.projectFeatures.filter(
        (f) => (f.groupName || "Other Features") === groupName
      )
      const featureIds = groupFeatures.map((f) => f.id)
      const isVisible = featureIds.some((id) => !state.hiddenFeatureIds.has(id))

      const next = new Set(state.hiddenFeatureIds)
      if (isVisible) {
        // Hide all in group
        featureIds.forEach((id) => next.add(id))
      } else {
        // Show all in group
        featureIds.forEach((id) => next.delete(id))
      }
      return { hiddenFeatureIds: next }
    }),
  featureCount: 0,
  issueCount: 0,
  setStats: (features, issues) =>
    set({ featureCount: features, issueCount: issues }),
  refreshTrigger: 0,
  triggerRefresh: () =>
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
  weatherPanelOpen: false,
  setWeatherPanelOpen: (open) => set({ weatherPanelOpen: open }),
  landCoverTileUrl: null,
  setLandCoverTileUrl: (url) => set({ landCoverTileUrl: url }),
  landCoverConfig: {
    year: 2021,
    visibleClasses: [], // empty means all visible
    paletteOverrides: {},
  },
  setLandCoverConfig: (config) =>
    set((state) => ({
      landCoverConfig: { ...state.landCoverConfig, ...config },
    })),
}))
