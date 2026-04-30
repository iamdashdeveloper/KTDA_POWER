import { useState, useEffect } from "react"

interface HydroModelTabItem {
  id: string
  modelId: string
  name?: string
}

const STORAGE_KEY = "ktda_hydro_model_tabs"

export const useHydroModelTabs = () => {
  const [tabs, setTabs] = useState<HydroModelTabItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setTabs(Array.isArray(parsed) ? parsed : [])
      }
    } catch (err) {
      console.error("Error loading hydro model tabs from localStorage:", err)
    }
  }, [])

  // Save to localStorage whenever tabs change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
    } catch (err) {
      console.error("Error saving hydro model tabs to localStorage:", err)
    }
  }, [tabs])

  const addTab = (modelId: string, name?: string) => {
    console.log("[useHydroModelTabs] addTab called:", { modelId, name })
    // Check if tab already exists
    if (tabs.some((tab) => tab.modelId === modelId)) {
      console.log("[useHydroModelTabs] Tab already exists, skipping")
      return
    }

    const newTab: HydroModelTabItem = {
      id: `hydro-model-${modelId}`,
      modelId,
      name,
    }
    console.log("[useHydroModelTabs] Adding new tab:", newTab)
    setTabs((prev) => {
      const updated = [...prev, newTab]
      console.log("[useHydroModelTabs] Tabs updated:", updated)
      return updated
    })
  }

  const removeTab = (modelId: string) => {
    setTabs((prev) => prev.filter((tab) => tab.modelId !== modelId))
  }

  const clearAll = () => {
    setTabs([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    tabs,
    addTab,
    removeTab,
    clearAll,
  }
}
