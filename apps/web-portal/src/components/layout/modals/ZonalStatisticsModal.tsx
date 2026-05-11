import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { ApiClient } from "@/lib/api"
import { useMapStore } from "@/store/useMapStore"
import { 
  TbGraph, 
  TbLoader2, 
  TbPolygon, 
  TbAlertCircle,
  TbChartBar,
  TbDownload
} from "react-icons/tb"
import { cn } from "@workspace/ui/lib/utils"

interface ZonalStatisticsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
}

interface Feature {
  id: string
  name: string
  type: string
  geometry: any
}

interface StatsResult {
  stats: Record<string, number>
  legend: any[]
  totalArea: number
}

export function ZonalStatisticsModal({
  isOpen,
  onClose,
  projectId,
}: ZonalStatisticsModalProps) {
  const [features, setFeatures] = useState<Feature[]>([])
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [results, setResults] = useState<StatsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const landCoverConfig = useMapStore((state) => state.landCoverConfig)

  useEffect(() => {
    if (isOpen && projectId) {
      loadFeatures()
    } else {
      // Reset state when closing
      setResults(null)
      setError(null)
      setSelectedFeatureIds([])
    }
  }, [isOpen, projectId])

  const loadFeatures = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await ApiClient.get<any[]>(`/projects/${projectId}/features`)
      
      // Filter for Polygon / MultiPolygon features
      const polygonFeatures = data.filter((f: any) => {
        const geom = typeof f.geometry === 'string' ? JSON.parse(f.geometry) : f.geometry
        return geom?.type === "Polygon" || geom?.type === "MultiPolygon"
      })
      
      setFeatures(polygonFeatures)
    } catch (err) {
      console.error("Failed to load features:", err)
      setError("Failed to load project features. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleCalculate = async () => {
    if (selectedFeatureIds.length === 0) return

    setIsCalculating(true)
    setError(null)
    try {
      // Combine selected geometries into a single MultiPolygon if multiple selected
      const selectedFeatures = features.filter(f => selectedFeatureIds.includes(f.id))
      const targetFeature = selectedFeatures[0]
      const geometry = typeof targetFeature.geometry === 'string' 
        ? JSON.parse(targetFeature.geometry) 
        : targetFeature.geometry

      const response = await ApiClient.post<any>("/gee/worldcover/stats", {
        geometry,
        year: landCoverConfig.year
      })

      // Calculate total area for percentages
      const stats = response.stats
      const totalArea = Object.values(stats).reduce((a: any, b: any) => a + b, 0) as number

      setResults({
        stats,
        legend: response.legend,
        totalArea
      })
    } catch (err) {
      console.error("Calculation failed:", err)
      setError("Analysis failed. Earth Engine might be busy or the geometry is too complex.")
    } finally {
      setIsCalculating(false)
    }
  }

  const downloadResults = () => {
    if (!results) return
    const content = JSON.stringify(results.stats, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zonal_stats_${projectId}_${landCoverConfig.year}.json`
    a.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TbGraph className="text-primary" />
            Zonal Statistics Analysis
          </DialogTitle>
          <DialogDescription>
            Select polygon features from your project to compute land cover distribution for {landCoverConfig.year}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Feature Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Boundary Features
              </Label>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                {features.length} Polygons
              </span>
            </div>

            <ScrollArea className="h-[300px] rounded-lg border border-border/50 bg-accent/20 p-2">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <TbLoader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : features.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-50">
                  <TbPolygon size={32} className="mb-2" />
                  <p className="text-xs">No polygon features found in this project.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {features.map((feature) => (
                    <div
                      key={feature.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md transition-all cursor-pointer border border-transparent",
                        selectedFeatureIds.includes(feature.id) 
                          ? "bg-primary/10 border-primary/20" 
                          : "hover:bg-accent/50"
                      )}
                      onClick={() => toggleFeature(feature.id)}
                    >
                      <Checkbox
                        checked={selectedFeatureIds.includes(feature.id)}
                        onCheckedChange={() => toggleFeature(feature.id)}
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-semibold truncate">
                          {feature.name || "Unnamed Feature"}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">
                          {feature.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Results Area */}
          <div className="space-y-4">
             <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Analysis Results
             </Label>
             
             <div className={cn(
               "h-[300px] rounded-lg border border-border/50 flex flex-col items-center justify-center text-center p-6 transition-all",
               results ? "bg-background shadow-inner" : "bg-accent/10 border-dashed"
             )}>
                {isCalculating ? (
                  <div className="space-y-4 flex flex-col items-center">
                    <TbLoader2 className="animate-spin text-primary" size={40} />
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Earth Engine Analyzing...</p>
                      <p className="text-xs text-muted-foreground">Computing spatial intersection & area totals</p>
                    </div>
                  </div>
                ) : results ? (
                  <ScrollArea className="w-full h-full pr-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="text-left">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Area Analyzed</p>
                            <p className="text-lg font-mono font-bold">{(results.totalArea / 10000).toFixed(2)} <span className="text-xs text-muted-foreground">Ha</span></p>
                         </div>
                         <Button variant="ghost" size="icon" onClick={downloadResults} title="Export JSON">
                            <TbDownload size={18} />
                         </Button>
                      </div>

                      <div className="space-y-3">
                         {results.legend
                          .filter(l => results.stats[l.label] > 0)
                          .sort((a, b) => results.stats[b.label] - results.stats[a.label])
                          .map((item) => {
                            const percentage = (results.stats[item.label] / results.totalArea) * 100
                            return (
                              <div key={item.value} className="space-y-1.5">
                                <div className="flex justify-between text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="font-medium">{item.label}</span>
                                  </div>
                                  <span className="font-mono font-bold text-primary">{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                                  <div 
                                    className="h-full transition-all duration-1000 ease-out" 
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: item.color 
                                    }} 
                                  />
                                </div>
                              </div>
                            )
                         })}
                      </div>
                    </div>
                  </ScrollArea>
                ) : error ? (
                  <div className="space-y-3 text-destructive">
                    <TbAlertCircle size={40} className="mx-auto" />
                    <p className="text-xs font-medium">{error}</p>
                    <Button variant="outline" size="sm" onClick={loadFeatures}>Retry</Button>
                  </div>
                ) : (
                  <div className="space-y-3 opacity-40">
                    <TbChartBar size={48} className="mx-auto" />
                    <div className="space-y-1">
                       <p className="text-sm font-bold">No Data Yet</p>
                       <p className="text-[10px]">Select a boundary feature and click calculate</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCalculate} 
            disabled={selectedFeatureIds.length === 0 || isCalculating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
          >
            {isCalculating ? (
              <>
                <TbLoader2 className="mr-2 animate-spin" size={16} />
                Analyzing...
              </>
            ) : (
              <>
                <TbGraph className="mr-2" size={16} />
                Run Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
