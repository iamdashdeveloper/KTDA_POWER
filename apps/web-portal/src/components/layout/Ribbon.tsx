import React, { useState } from "react"
import {
  Map as MapIcon,
  PlusCircle,
  BarChart3,
  View,
  Edit3,
  Share2,
  Info,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { useNavigate } from "react-router-dom"
import { useLayout } from "@/context/LayoutContext"
import { useMapStore } from "@/store/useMapStore"
import { AddLayerModal } from "../modals/AddLayerModal"
import { GenerateChainnageModal } from "../modals/GenerateChainnageModal"
import { DrawingModal } from "../modals/DrawingModal"

// Modular Ribbon Components
import { RibbonSeparator } from "./ribbon/RibbonSeparator"
import { MapClipboardToolbar } from "./ribbon/toolbars/MapClipboardToolbar"
import { MapNavigateToolbar } from "./ribbon/toolbars/MapNavigateToolbar"
import { MapLayerToolbar } from "./ribbon/toolbars/MapLayerToolbar"
import { MapSelectionToolbar } from "./ribbon/toolbars/MapSelectionToolbar"
import { MapInquiryToolbar } from "./ribbon/toolbars/MapInquiryToolbar"
import { AnalysisToolbar } from "./ribbon/toolbars/AnalysisToolbar"

interface RibbonProps {
  onToolAction?: (toolId: string) => void
}

const TABS = [
  { id: "projects", label: "Projects", icon: <PlusCircle size={16} /> },
  { id: "map", label: "Map", icon: <MapIcon size={16} /> },
  { id: "analysis", label: "Analysis", icon: <BarChart3 size={16} /> },
  { id: "view", label: "View", icon: <View size={16} /> },
  { id: "tasks", label: "Tasks", icon: <Edit3 size={16} /> },
  { id: "share", label: "Share", icon: <Share2 size={16} /> },
  { id: "help", label: "Help", icon: <Info size={16} /> },
]

export const Ribbon: React.FC<RibbonProps> = ({ onToolAction }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("map")
  const { openPanel, setCollapsed } = useLayout()
  const {
    activeTool,
    setActiveTool,
    executeCommand,
    projectFeatures,
    scratchFeatures,
    setWeatherPanelOpen,
    set3DSyncActive,
  } = useMapStore()
  const [isAddLayerOpen, setIsAddLayerOpen] = useState(false)
  const [isGenerateChainnageOpen, setIsGenerateChainnageOpen] = useState(false)
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false)
  const [drawnFeatureCount, setDrawnFeatureCount] = useState(0)
  const [isSavingDrawing, setIsSavingDrawing] = useState(false)

  const handleTabClick = (tabId: string) => {
    if (tabId === "projects") {
      navigate("/projects")
    } else {
      setActiveTab(tabId)
    }
  }

  const handleToolClick = (toolId: string) => {
    onToolAction?.(toolId)

    // Command-based tools (MapCanvas handles these via store subscription)
    const mapCommands = [
      "zoom-home",
      "zoom-to-location",
      "reset-north",
      "full-extent",
      "clear-measurements",
    ]
    if (mapCommands.includes(toolId)) {
      executeCommand(toolId)
      return
    }

    switch (toolId) {
      case "add-data":
        setIsAddLayerOpen(true)
        break
      case "identify":
        setActiveTool("identify")
        // The MapCanvas handles the actual identification logic and opens the panel
        // but we can ensure the panel is visible here
        setCollapsed("right", false)
        break
      case "explore":
        setActiveTool("explore")
        break
      case "zoom-box":
        setActiveTool("zoom-box")
        break
      case "measure-distance":
        setActiveTool("measure-distance")
        break
      case "measure-area":
        setActiveTool("measure-area")
        break
      case "select":
        setActiveTool("select")
        break
      case "generate-chainage":
        setIsGenerateChainnageOpen(true)
        break
      case "draw-Point":
      case "draw-LineString":
      case "draw-Polygon":
        setActiveTool(toolId)
        break
      case "save-drawing":
        // Get drawn features from map instance
        const mapElement = document.querySelector("[data-map-instance]") as any
        if (mapElement?.__mapInstance) {
          const map = mapElement.__mapInstance
          if (map.__getDrawnFeatures) {
            const drawnFeatures = map.__getDrawnFeatures()
            setDrawnFeatureCount(drawnFeatures.length)
          }
        }
        setIsDrawingModalOpen(true)
        break
      case "clear-drawing":
        const mapElem = document.querySelector("[data-map-instance]") as any
        if (mapElem?.__mapInstance) {
          const map = mapElem.__mapInstance
          if (map.__clearDrawnFeatures) {
            map.__clearDrawnFeatures()
            setDrawnFeatureCount(0)
          }
        }
        break
      case "layer-properties":
        openPanel(
          "right",
          <div className="flex flex-col gap-4 text-foreground">
            <div className="text-xs font-semibold">Layer Settings</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px]">
                <span>Transparency</span>
                <input type="range" className="w-24 accent-primary" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Visibility Range</span>
                <span className="text-[10px] text-muted-foreground">
                  0 - 50,000
                </span>
              </div>
            </div>
          </div>,
          "Layer Properties"
        )
        break
      case "open-weather-station":
        setWeatherPanelOpen(true)
        setCollapsed("right", true)
        break
      case "sync-3d":
        set3DSyncActive(true)
        break
      default:
        break
    }
  }

  const handleDrawingSave = async (
    featureData: Array<{ name: string; description: string; groupName: string }>,
    groupName: string
  ) => {
    setIsSavingDrawing(true)
    try {
      const mapElement = document.querySelector("[data-map-instance]") as any
      if (mapElement?.__mapInstance) {
        const map = mapElement.__mapInstance
        if (map.__getDrawnFeatures) {
          const drawnFeatures = map.__getDrawnFeatures()

          if (drawnFeatures.length === 0) {
            console.warn("No features to save")
            return
          }

          // Convert OL features to GeoJSON
          const { default: GeoJSON } = await import("ol/format/GeoJSON")
          const format = new GeoJSON()
          const geojsonFeatures = drawnFeatures.map((feat: any, index: number) => {
            const data = featureData[0] // Use first name/desc for now or index if multiple
            const json = format.writeFeatureObject(feat, {
              featureProjection: "EPSG:3857",
              dataProjection: "EPSG:4326",
            })

            // Add metadata properties
            json.properties = {
              ...json.properties,
              name: data.name + (drawnFeatures.length > 1 ? ` ${index + 1}` : ""),
              description: data.description,
              groupName: groupName,
              createdAt: new Date().toISOString(),
            }
            return json
          })

          const featureCollection = {
            type: "FeatureCollection",
            features: geojsonFeatures,
          }

          // Trigger download
          const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
            type: "application/json",
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${groupName.replace(/\s+/g, "_")}.geojson`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)


          // Clear the drawing after saving
          if (map.__clearDrawnFeatures) {
            map.__clearDrawnFeatures()
          }
          setDrawnFeatureCount(0)
          setIsDrawingModalOpen(false)
        }
      }
    } catch (error) {
      console.error("Error saving drawn features:", error)
    } finally {
      setIsSavingDrawing(false)
    }
  }


  return (
    <div className="flex shrink-0 flex-col border-b border-border bg-card select-none">
      {/* Tab Headers */}
      <div className="flex items-end gap-1 bg-muted px-2 pt-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "cursor-pointer border-t-2 border-transparent px-4 py-1 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "border-t-primary bg-card text-primary shadow-[0_-2px_5px_rgba(0,0,0,0.05)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {React.cloneElement(tab.icon as React.ReactElement<any>, {
                size: 12,
              })}
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* Ribbon Content */}
      <div className="custom-scrollbar flex h-24 items-center gap-0 overflow-x-auto bg-card px-4 text-foreground">
        {activeTab === "map" && (
          <div className="flex h-full items-center">
            <MapClipboardToolbar onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapNavigateToolbar
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />
            <RibbonSeparator />
            <MapLayerToolbar onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapSelectionToolbar onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapInquiryToolbar
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />
          </div>
        )}

        {activeTab === "analysis" && (
          <AnalysisToolbar onToolClick={handleToolClick} />
        )}

        {activeTab !== "map" && activeTab !== "analysis" && (
          <div className="flex w-full items-center justify-center text-sm text-muted-foreground italic">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tools
            coming soon...
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
      `}</style>
      {/* Modals */}
      <AddLayerModal open={isAddLayerOpen} onOpenChange={setIsAddLayerOpen} />
      <GenerateChainnageModal
        isOpen={isGenerateChainnageOpen}
        onClose={() => setIsGenerateChainnageOpen(false)}
        lineFeatures={[...projectFeatures, ...scratchFeatures].map((f) => ({
          id: f.id,
          name: f.name,
          geometry: f.geometry,
          parentName: f.parentName,
          groupName: f.groupName,
        }))}
        onGenerate={(options) => {
          console.log("[Ribbon] onGenerate called with options:", options)
          const mapElement = document.querySelector(
            "[data-map-instance]"
          ) as any
          console.log("[Ribbon] Map element found:", !!mapElement)
          if (mapElement?.__mapInstance) {
            const map = mapElement.__mapInstance
            console.log("[Ribbon] Map instance found:", !!map)
            console.log(
              "[Ribbon] __generateChainnageMarkers exists:",
              !!map.__generateChainnageMarkers
            )
            if (map.__generateChainnageMarkers) {
              console.log(
                "[Ribbon] Calling __generateChainnageMarkers with:",
                options.interval,
                options.startValue,
                options.featureId
              )
              map.__generateChainnageMarkers(
                options.interval,
                options.startValue,
                options.featureId
              )
            } else {
              console.error(
                "[Ribbon] ERROR: __generateChainnageMarkers not found on map object"
              )
              console.log(
                "[Ribbon] Map object keys:",
                Object.keys(map).filter((k) => k.startsWith("__"))
              )
            }
          } else {
            console.error(
              "[Ribbon] ERROR: Map element or __mapInstance not found"
            )
          }
        }}
      />
      <DrawingModal
        isOpen={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
        onSave={handleDrawingSave}
        isSaving={isSavingDrawing}
        drawnFeatureCount={drawnFeatureCount}
      />
    </div>
  )
}
