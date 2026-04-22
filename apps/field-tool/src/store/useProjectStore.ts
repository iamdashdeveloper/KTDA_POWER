import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Project {
  id: string
  name: string
  companyId: string
  description?: string
  location?:
    | {
        latitude: number
        longitude: number
      }
    | string
    | null
}

export interface ProjectStoreState {
  activeProject: Project | null
  setActiveProject: (project: Project) => void
  clearActiveProject: () => void
  isInitialized: boolean
  setIsInitialized: (initialized: boolean) => void
}

export const useProjectStore = create<ProjectStoreState>()(
  persist(
    (set) => ({
      activeProject: null,
      isInitialized: false,

      setActiveProject: (project: Project) => {
        set({ activeProject: project })
      },

      clearActiveProject: () => {
        set({ activeProject: null })
      },

      setIsInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized })
      },
    }),
    {
      name: "project-store", // localStorage key
      version: 1,
    }
  )
)
