import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@workspace/ui/components/select"
import { useMapStore } from "@/store/useMapStore"
import { useGeoprocessingStore } from "@/store/useGeoprocessingStore"
import * as turf from "@turf/turf"
import { toast } from "sonner"
import { TbLoader2, TbPlayerPlay } from "react-icons/tb"

interface ToolModalProps {
  toolId: string | null
  onClose: () => void
}

// ToolModal component for geoprocessing tools
export const ToolModal: React.FC<ToolModalProps> = ({ toolId, onClose }) => {
  const { projectFeatures } = useMapStore()
  const { addAnalysisLayer, analysisLayers } = useGeoprocessingStore()
  const [isRunning, setIsRunning] = useState(false)
  
  // Tool-specific parameters
  const [selectedLayerId, setSelectedLayerId] = useState<string>("")
  const [overlayLayerId, setOverlayLayerId] = useState<string>("")
  const [exportFormat, setExportFormat] = useState<string>("geojson")
  const [bufferDistance, setBufferDistance] = useState<number>(100)
  const [bufferUnits, setBufferUnits] = useState<string>("meters")
  const [simplifyTolerance, setSimplifyTolerance] = useState<number>(0.01)

  if (!toolId) return null

  const allAvailableLayers = [...projectFeatures, ...analysisLayers]

  const handleRun = async () => {
    setIsRunning(true)
    
    try {
      // Coordinate converter doesn't necessarily need a layer
      if (toolId === "coord-convert") {
         toast.info("Coordinate Conversion: Select a point on the map to see details.", { duration: 5000 })
         onClose()
         return
      }

      const layer = projectFeatures.find(f => f.id === selectedLayerId) || 
                   (useGeoprocessingStore.getState().analysisLayers.find(l => l.id === selectedLayerId) as any)

      if (!layer || !layer.geometry) {
        toast.error("Please select a valid input layer")
        return
      }

      if (toolId === "buffer") {
        const distance = bufferUnits === "meters" ? bufferDistance / 1000 : bufferDistance
        const buffered = turf.buffer(layer.geometry as any, distance, { units: "kilometers" })
        
        if (!buffered) {
          toast.error("Failed to create buffer")
          return
        }

        addAnalysisLayer({
          name: `Buffer of ${layer.name} (${bufferDistance}${bufferUnits === "meters" ? "m" : "km"})`,
          type: "Buffer",
          geometry: buffered.geometry,
          color: "#3b82f6"
        })
        toast.success("Buffer calculation complete")
      } else if (toolId === "simplify") {
        const simplified = turf.simplify(layer.geometry as any, { tolerance: simplifyTolerance, highQuality: true })
        
        if (!simplified) {
          toast.error("Failed to simplify geometry")
          return
        }

        addAnalysisLayer({
          name: `Simplified ${layer.name} (tol: ${simplifyTolerance})`,
          type: "Simplify",
          geometry: simplified.geometry || (simplified as any),
          color: "#f59e0b"
        })
        toast.success("Geometry simplification complete")
      } else if (toolId === "measure") {
        const area = turf.area(layer.geometry as any)
        const perimeter = turf.length(layer.geometry as any, { units: "meters" })
        
        toast.info(`Results for ${layer.name}: Area: ${(area / 10000).toFixed(2)} ha, Perimeter: ${perimeter.toFixed(2)} m`, {
          duration: 10000
        })
      } else if (toolId === "intersect" || toolId === "clip") {
        const overlayLayer = projectFeatures.find(f => f.id === overlayLayerId)
        if (!overlayLayer || !overlayLayer.geometry) {
          toast.error("Please select an overlay/clip layer")
          return
        }

        let result: any = null
        if (toolId === "intersect") {
          result = turf.intersect(turf.featureCollection([
            turf.feature(layer.geometry as any),
            turf.feature(overlayLayer.geometry as any)
          ]))
        } else {
          result = turf.intersect(turf.featureCollection([
            turf.feature(layer.geometry as any),
            turf.feature(overlayLayer.geometry as any)
          ]))
        }

        if (!result || !result.geometry) {
          toast.warning("No intersection found between selected features")
        } else {
          addAnalysisLayer({
            name: `${toolId === 'clip' ? 'Clipped' : 'Intersection'} of ${layer.name} & ${overlayLayer.name}`,
            type: toolId === 'clip' ? "Clip" : "Intersect",
            geometry: result.geometry,
            color: "#8b5cf6"
          })
          toast.success(`${toolId === 'clip' ? 'Clip' : 'Intersection'} operation complete`)
        }
      } else if (toolId === "export") {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
          type: "Feature",
          geometry: layer.geometry,
          properties: { name: layer.name, exportedAt: new Date().toISOString() }
        }))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href", dataStr)
        downloadAnchorNode.setAttribute("download", `${layer.name.replace(/\s+/g, '_')}.${exportFormat === 'geojson' ? 'json' : exportFormat}`)
        document.body.appendChild(downloadAnchorNode)
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
        toast.success(`Layer exported as ${exportFormat.toUpperCase()}`)
      }
      
      onClose()
    } catch (error) {
      console.error("Tool execution failed:", error)
      toast.error("An error occurred while running the tool")
    } finally {
      setIsRunning(false)
    }
  }

  const showOverlaySelect = toolId === "intersect" || toolId === "clip"

  return (
    <Dialog open={!!toolId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold uppercase tracking-tight text-sm">
            <TbPlayerPlay className="text-primary" />
            {toolId.replace("-", " ")} Tool
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {showOverlaySelect ? "Input Layer (A)" : "Target Layer"}
            </Label>
            <Select value={selectedLayerId} onValueChange={setSelectedLayerId}>
              <SelectTrigger className="bg-accent/20 border-border/40">
                <SelectValue placeholder="Select a feature..." />
              </SelectTrigger>
              <SelectContent>
                {allAvailableLayers.map(f => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showOverlaySelect && (
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {toolId === 'clip' ? "Clip Boundary (B)" : "Overlay Layer (B)"}
              </Label>
              <Select value={overlayLayerId} onValueChange={setOverlayLayerId}>
                <SelectTrigger className="bg-accent/20 border-border/40">
                  <SelectValue placeholder="Select a feature..." />
                </SelectTrigger>
                <SelectContent>
                  {projectFeatures.map(f => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {toolId === "export" && (
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="bg-accent/20 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geojson">GeoJSON</SelectItem>
                  <SelectItem value="kml">KML (XML)</SelectItem>
                  <SelectItem value="wkt">WKT (Text)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {toolId === "buffer" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs">Distance</Label>
                <Input 
                  type="number" 
                  value={bufferDistance} 
                  onChange={(e) => setBufferDistance(Number(e.target.value))} 
                  className="bg-accent/20 border-border/40"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Units</Label>
                <Select value={bufferUnits} onValueChange={setBufferUnits}>
                  <SelectTrigger className="bg-accent/20 border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kilometers">KM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {toolId === "simplify" && (
            <div className="grid gap-2">
              <Label className="text-xs">Tolerance</Label>
              <Input 
                type="number" 
                step="0.001"
                value={simplifyTolerance} 
                onChange={(e) => setSimplifyTolerance(Number(e.target.value))} 
                className="bg-accent/20 border-border/40"
              />
              <p className="text-[10px] text-muted-foreground italic">Lower value = higher detail.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRunning}>Cancel</Button>
          <Button onClick={handleRun} disabled={isRunning} className="gap-2">
            {isRunning ? <TbLoader2 className="animate-spin" /> : <TbPlayerPlay />}
            Run Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
