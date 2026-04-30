import { create } from "zustand"
import { persist } from "zustand/middleware"

interface HydroModelTab {
  id: string
  modelId: string
  name?: string
}

interface HydroModelStore {
  tabs: HydroModelTab[]
  addTab: (modelId: string, name?: string) => void
  removeTab: (modelId: string) => void
  clearAll: () => void
}

export const useHydroModelStore = create<HydroModelStore>()(
  persist(
    (set) => ({
      tabs: [],
      addTab: (modelId: string, name?: string) => {
        console.log("[useHydroModelStore] addTab called:", { modelId, name })
        set((state) => {
          // Check if tab already exists
          if (state.tabs.some((tab) => tab.modelId === modelId)) {
            console.log("[useHydroModelStore] Tab already exists, skipping")
            return state
          }

          const newTab: HydroModelTab = {
            id: `hydro-model-${modelId}`,
            modelId,
            name,
          }
          console.log("[useHydroModelStore] Adding new tab:", newTab)
          const updated = [...state.tabs, newTab]
          console.log("[useHydroModelStore] Tabs updated:", updated)
          return { tabs: updated }
        })
      },
      removeTab: (modelId: string) => {
        console.log("[useHydroModelStore] removeTab called:", { modelId })
        set((state) => ({
          tabs: state.tabs.filter((tab) => tab.modelId !== modelId),
        }))
      },
      clearAll: () => {
        console.log("[useHydroModelStore] clearAll called")
        set({ tabs: [] })
      },
    }),
    {
      name: "ktda_hydro_model_tabs",
    }
  )
)
