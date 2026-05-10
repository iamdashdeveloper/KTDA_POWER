import { create } from "zustand"

interface UIStoreState {
  isIssueFormOpen: boolean
  setIsIssueFormOpen: (open: boolean) => void
  isLegendOpen: boolean
  setIsLegendOpen: (open: boolean) => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  isIssueFormOpen: false,
  setIsIssueFormOpen: (open) => set({ isIssueFormOpen: open }),
  isLegendOpen: false,
  setIsLegendOpen: (open) => set({ isLegendOpen: open }),
}))
