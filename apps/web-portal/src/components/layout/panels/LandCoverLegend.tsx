import React, { useEffect, useState } from "react"
import { Eye, EyeOff, RefreshCw, Palette, Calendar, BarChart3, Loader2 } from "lucide-react"
import { useMapStore } from "@/store/useMapStore"
import { useProjectStore } from "@/store/useProjectStore"
import { ApiClient } from "@/lib/api"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"

const LAND_COVER_CLASSES = [
  { value: 10, label: "Tree cover", color: "#006400" },
  { value: 20, label: "Shrubland", color: "#FFBB22" },
  { value: 30, label: "Grassland", color: "#FFFF4C" },
  { value: 40, label: "Cropland", color: "#F096FF" },
  { value: 50, label: "Built-up", color: "#FA0000" },
  { value: 60, label: "Bare / sparse vegetation", color: "#B4B4B4" },
  { value: 70, label: "Snow and ice", color: "#F0F0F0" },
  { value: 80, label: "Permanent water bodies", color: "#0064C8" },
  { value: 90, label: "Herbaceous wetland", color: "#0096A0" },
  { value: 95, label: "Mangroves", color: "#00CF75" },
  { value: 100, label: "Moss and lichen", color: "#FAE6A0" },
]

const SUPPORTED_YEARS = [2020, 2021, 2022, 2023]

export const LandCoverLegend: React.FC = () => {
  const { landCoverConfig, setLandCoverConfig, setLandCoverTileUrl } = useMapStore()
  const { activeProject } = useProjectStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Determine if a class is visible
  const isVisible = (value: number) => 
    landCoverConfig.visibleClasses.length === 0 || landCoverConfig.visibleClasses.includes(value)

  const toggleClass = (value: number) => {
    let next: number[]
    if (landCoverConfig.visibleClasses.length === 0) {
      next = LAND_COVER_CLASSES.filter(c => c.value !== value).map(c => c.value)
    } else if (landCoverConfig.visibleClasses.includes(value)) {
      next = landCoverConfig.visibleClasses.filter(v => v !== value)
    } else {
      next = [...landCoverConfig.visibleClasses, value]
    }
    if (next.length === LAND_COVER_CLASSES.length) next = []
    setLandCoverConfig({ visibleClasses: next })
  }

  const updateColor = (value: number, color: string) => {
    setLandCoverConfig({
      paletteOverrides: { ...landCoverConfig.paletteOverrides, [value]: color }
    })
  }

  const resetAll = () => {
    setLandCoverConfig({
      year: 2021,
      visibleClasses: [],
      paletteOverrides: {}
    })
  }

  const handleYearChange = (values: number[]) => {
    const index = values[0]
    setLandCoverConfig({ year: SUPPORTED_YEARS[index] })
  }

  // Refresh map tiles when config changes
  useEffect(() => {
    const refreshTiles = async () => {
      try {
        setIsUpdating(true)
        
        const params = new URLSearchParams()
        params.append("year", landCoverConfig.year.toString())
        
        if (landCoverConfig.visibleClasses.length > 0) {
          params.append("visibleClasses", landCoverConfig.visibleClasses.join(","))
        }
        if (Object.keys(landCoverConfig.paletteOverrides).length > 0) {
          params.append("paletteOverrides", JSON.stringify(landCoverConfig.paletteOverrides))
        }
        
        const res = await ApiClient.get<{ tileUrl: string }>(`/gee/worldcover/tiles?${params.toString()}`)
        if (res.tileUrl) {
          setLandCoverTileUrl(res.tileUrl)
        }
      } catch (error) {
        console.error("Failed to refresh land cover tiles:", error)
      } finally {
        setIsUpdating(false)
      }
    }

    const timer = setTimeout(refreshTiles, 500)
    return () => clearTimeout(timer)
  }, [landCoverConfig, setLandCoverTileUrl])

  // Fetch stats automatically when year changes (if project is active)
  useEffect(() => {
    const fetchStats = async () => {
      if (!activeProject?.id) return
      
      try {
        setIsLoadingStats(true)
        // Note: In a real scenario, we'd pass the actual project geometry
        // For now we'll fetch stats for the project area
        const res = await ApiClient.get(`/gee/worldcover/stats?year=${landCoverConfig.year}&projectId=${activeProject.id}`)
        setStats(res)
      } catch (error) {
        console.error("Failed to fetch land cover stats:", error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchStats()
  }, [landCoverConfig.year, activeProject?.id])

  const currentYearIndex = SUPPORTED_YEARS.indexOf(landCoverConfig.year)

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      {/* Fixed Header */}
      <div className="flex items-center justify-between px-1 mb-4 shrink-0">
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Classification Layers
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={resetAll}
          title="Reset to defaults"
        >
          <RefreshCw size={12} className={cn(isUpdating && "animate-spin")} />
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
        {/* Class List */}
        <div className="flex flex-col gap-1">
          {LAND_COVER_CLASSES.map((cls) => {
            const activeColor = landCoverConfig.paletteOverrides[cls.value] || cls.color
            const visible = isVisible(cls.value)
            
            return (
              <div 
                key={cls.value}
                className={cn(
                  "group flex items-center gap-3 rounded-md border border-transparent p-2 transition-all hover:bg-accent/50",
                  !visible && "opacity-50 grayscale-[0.5]"
                )}
              >
                <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded shadow-sm border border-border/50">
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(e) => updateColor(cls.value, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div className="h-full w-full" style={{ backgroundColor: activeColor }} />
                </div>

                <div className="flex flex-1 flex-col gap-0.5">
                  <Label 
                    className="cursor-pointer text-[11px] font-medium leading-none select-none"
                    onClick={() => toggleClass(cls.value)}
                  >
                    {cls.label}
                  </Label>
                  <span className="text-[9px] text-muted-foreground">Class {cls.value}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={() => toggleClass(cls.value)}
                  >
                    {visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </Button>
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                      <Palette size={14} />
                    </Button>
                    <input
                      type="color"
                      value={activeColor}
                      onChange={(e) => updateColor(cls.value, e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>
                
                <Checkbox 
                  checked={visible} 
                  onCheckedChange={() => toggleClass(cls.value)}
                  className="h-4 w-4 rounded-sm border-border"
                />
              </div>
            )
          })}
        </div>

        {/* Year Slider Section */}
        <div className="space-y-4 rounded-lg bg-accent/30 p-4 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Observation Year</span>
            </div>
            <span className="rounded bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
              {landCoverConfig.year}
            </span>
          </div>

          <div className="px-2 pt-2">
            <Slider
              defaultValue={[currentYearIndex]}
              value={[currentYearIndex]}
              max={SUPPORTED_YEARS.length - 1}
              step={1}
              onValueChange={handleYearChange}
              className="mb-6"
            />
            
            <div className="flex justify-between px-0.5">
              {SUPPORTED_YEARS.map((year, i) => (
                <div key={year} className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "h-1.5 w-0.5 rounded-full",
                    i === currentYearIndex ? "bg-primary h-2.5" : "bg-muted-foreground/30"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium transition-colors",
                    i === currentYearIndex ? "text-primary font-bold" : "text-muted-foreground/60"
                  )}>
                    {year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Area Statistics</span>
            </div>
            {isLoadingStats && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
          </div>

          {stats ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] mb-2">
                  <span className="text-muted-foreground">Region: {activeProject?.name || "Global"}</span>
                  <span className="font-mono text-primary font-bold">{landCoverConfig.year}</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  {LAND_COVER_CLASSES.filter(c => stats[c.value] > 0).map(c => (
                    <div 
                      key={c.value}
                      style={{ 
                        width: `${(stats[c.value] / stats.totalArea) * 100}%`,
                        backgroundColor: landCoverConfig.paletteOverrides[c.value] || c.color
                      }}
                      title={`${c.label}: ${(stats[c.value] / 10000).toFixed(2)} Ha`}
                    />
                  ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                  {LAND_COVER_CLASSES.filter(c => stats[c.value] > 0).slice(0, 4).map(c => (
                    <div key={c.value} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: landCoverConfig.paletteOverrides[c.value] || c.color }} />
                        <span className="truncate text-muted-foreground">{c.label}</span>
                      </div>
                      <span className="font-mono font-medium">
                        {((stats[c.value] / stats.totalArea) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[10px] text-muted-foreground italic">Select an area to view land cover distribution</p>
            </div>
          )}
        </div>

        {/* Sync Status */}
        <div className="rounded-lg bg-muted/30 p-3 text-[10px] text-muted-foreground border border-border/50 mb-2">
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            {isUpdating ? "Generating raster tiles..." : "Sync status: Live"}
          </p>
          <p>Dynamic Year selection enables temporal analysis. {landCoverConfig.year >= 2022 && "Note: 2022+ datasets use latest available 2021 baseline."}</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border) / 0.5);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.3);
        }
      `}</style>
    </div>
  )
}


