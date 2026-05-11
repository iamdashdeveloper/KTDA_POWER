import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AnalysisLayer {
  id: string
  name: string
  type: string
  geometry: any
  color: string
  visible: boolean
  createdAt: number
}

interface GeoprocessingState {
  analysisLayers: AnalysisLayer[]
  addAnalysisLayer: (layer: Omit<AnalysisLayer, "id" | "createdAt" | "visible">) => void
  removeAnalysisLayer: (id: string) => void
  toggleVisibility: (id: string) => void
  clearLayers: () => void
}

export const useGeoprocessingStore = create<GeoprocessingState>()(
  persist(
    (set) => ({
      analysisLayers: [],
      
      addAnalysisLayer: (layer) => set((state) => ({
        analysisLayers: [
          ...state.analysisLayers,
          {
            ...layer,
            id: `analysis-${Date.now()}`,
            createdAt: Date.now(),
            visible: true
          }
        ]
      })),

      removeAnalysisLayer: (id) => set((state) => ({
        analysisLayers: state.analysisLayers.filter(l => l.id !== id)
      })),

      toggleVisibility: (id) => set((state) => ({
        analysisLayers: state.analysisLayers.map(l => 
          l.id === id ? { ...l, visible: !l.visible } : l
        )
      })),

      clearLayers: () => set({ analysisLayers: [] })
    }),
    {
      name: "ktda-geoprocessing-storage"
    }
  )
)
