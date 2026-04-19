import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { apiClient } from "../lib/api"
import { FeatureMap } from "../components/maps/FeatureMap"
import { LayerControl } from "../components/maps/LayerControl"
import { DataTablePanel } from "../components/maps/DataTablePanel"
import type { Feature } from "../types/feature"

export function Features() {
  const navigate = useNavigate()
  const [featureGroups, setFeatureGroups] = useState<any[]>([])
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]) // Flattened for table display
  const [loading, setLoading] = useState(true)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchFeatures()
  }, [])

  const fetchFeatures = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get("/features")
      const groups = response.data || []
      setFeatureGroups(groups)

      // Flatten all features for table display
      const flattened: Feature[] = []
      for (const group of groups) {
        flattened.push(group) // Add parent group
        if (group.children) {
          flattened.push(...group.children) // Add all children
        }
      }
      setAllFeatures(flattened)

      // Auto-show all parent groups on first load
      if (groups.length > 0 && visibleLayers.size === 0) {
        const parentIds = new Set<string>(groups.map((g: any) => g.id))
        setVisibleLayers(parentIds)
      }
    } catch (error) {
      console.error("Error fetching features:", error)
      toast.error("Failed to load features")
    } finally {
      setLoading(false)
    }
  }

  const handleLayerToggle = (featureId: string) => {
    const newVisibleLayers = new Set(visibleLayers)
    if (newVisibleLayers.has(featureId)) {
      newVisibleLayers.delete(featureId)
    } else {
      newVisibleLayers.add(featureId)
    }
    setVisibleLayers(newVisibleLayers)
  }

  const handleFeatureDelete = async (featureId: string) => {
    try {
      await apiClient.delete(`/features/${featureId}`)
      toast.success("Feature deleted successfully")
      fetchFeatures()
    } catch (error) {
      console.error("Error deleting feature:", error)
      toast.error("Failed to delete feature")
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading features...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Features</h1>
            <p className="text-muted-foreground">
              Manage geographical features on the map
            </p>
          </div>
          <Button
            onClick={() => navigate("/features/upload")}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload GeoData
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Map area (70%) */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-gray-50">
          {featureGroups.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  No features uploaded yet
                </p>
                <Button
                  onClick={() => navigate("/features/upload")}
                  variant="outline"
                >
                  Upload GeoData to get started
                </Button>
              </div>
            </div>
          ) : (
            <FeatureMap
              featureGroups={featureGroups}
              visibleLayers={visibleLayers}
              onFeatureSelect={(feature) => console.log("Selected:", feature)}
            />
          )}
        </div>

        {/* Sidebar (25%) - Layer Control */}
        <div className="w-80 overflow-hidden rounded-lg border bg-background">
          <LayerControl
            featureGroups={featureGroups}
            visibleLayers={visibleLayers}
            onLayerToggle={handleLayerToggle}
            onFeatureDelete={handleFeatureDelete}
          />
        </div>
      </div>

      {/* Bottom panel - Data Table */}
      <div className="flex-shrink-0 border-t">
        <DataTablePanel
          features={allFeatures}
          onFeatureSelect={(feature) => console.log("Selected:", feature)}
          onFeaturesChange={fetchFeatures}
        />
      </div>
    </div>
  )
}
