import React, { useState, useEffect, useCallback } from "react"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Slider } from "@workspace/ui/components/slider"
import { Input } from "@workspace/ui/components/input"
import { useMapStore } from "@/store/useMapStore"
import { ApiClient } from "@/lib/api"
import { cn } from "@workspace/ui/lib/utils"
import {
  TbMapBolt,
  TbLoader2,
  TbRefresh,
  TbEye,
  TbEyeOff,
  TbCalendar,
  TbAdjustments,
} from "react-icons/tb"

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic World Legend Data
// ─────────────────────────────────────────────────────────────────────────────

const DW_CLASSES = [
  { value: 0, label: "Water",              color: "#419bdf" },
  { value: 1, label: "Trees",              color: "#397d49" },
  { value: 2, label: "Grass",              color: "#88b053" },
  { value: 3, label: "Flooded Vegetation", color: "#7a87c6" },
  { value: 4, label: "Crops",              color: "#e49635" },
  { value: 5, label: "Shrub & Scrub",      color: "#dfc35a" },
  { value: 6, label: "Built Area",         color: "#c4281b" },
  { value: 7, label: "Bare Ground",        color: "#a59b8f" },
  { value: 8, label: "Snow & Ice",         color: "#b39fe1" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const DynamicWorldPanel: React.FC = () => {
  const {
    dynamicWorldTileUrl,
    setDynamicWorldTileUrl,
    dynamicWorldConfig,
    setDynamicWorldConfig,
    setLayerVisibility,
    layers,
  } = useMapStore()

  const isLayerVisible = layers.find(l => l.id === "dynamicworld")?.visible ?? false

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  // Local state for date inputs
  const [startDate, setStartDate] = useState(dynamicWorldConfig.startDate)
  const [endDate, setEndDate] = useState(dynamicWorldConfig.endDate)
  const [opacity, setOpacity] = useState(dynamicWorldConfig.opacity)
  const [hiddenClasses, setHiddenClasses] = useState<Set<number>>(new Set())

  // Load tiles
  const loadTiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Build visible classes (invert hidden)
      const visibleClasses = hiddenClasses.size > 0
        ? DW_CLASSES.filter(c => !hiddenClasses.has(c.value)).map(c => c.value)
        : []

      const queryParams = new URLSearchParams()
      queryParams.set("startDate", startDate)
      queryParams.set("endDate", endDate)
      if (opacity !== 1) queryParams.set("opacity", String(opacity))
      if (visibleClasses.length > 0) queryParams.set("visibleClasses", visibleClasses.join(","))

      const res = await ApiClient.get<{
        tileUrl: string
        startDate: string
        endDate: string
      }>(`/gee/dynamic-world/tiles?${queryParams.toString()}`)

      if (res.tileUrl) {
        setDynamicWorldTileUrl(res.tileUrl)
        setDynamicWorldConfig({ startDate, endDate, opacity })
        setLayerVisibility("dynamicworld", true)
        // Refresh available dates for the new range
        loadAvailableDates()
      }
    } catch (err: any) {
      console.error("[DynamicWorld] Failed to load tiles:", err)
      setError(err.message || "Failed to load Dynamic World data")
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, opacity, hiddenClasses])

  // Load available dates
  const loadAvailableDates = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ dates: string[] }>(
        `/gee/dynamic-world/dates?startDate=${startDate}&endDate=${endDate}`
      )
      setAvailableDates(res.dates || [])
    } catch (err) {
      console.error("[DynamicWorld] Failed to load dates:", err)
    } finally {
    }
  }, [startDate, endDate])

  // Auto-load on mount
  useEffect(() => {
    if (!dynamicWorldTileUrl) {
      loadTiles()
    }
    loadAvailableDates()
  }, [])

  const toggleClassVisibility = (classValue: number) => {
    setHiddenClasses(prev => {
      const next = new Set(prev)
      if (next.has(classValue)) next.delete(classValue)
      else next.add(classValue)
      return next
    })
  }

  const toggleLayer = () => {
    if (!dynamicWorldTileUrl) {
      loadTiles()
    } else {
      setLayerVisibility("dynamicworld", !isLayerVisible)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-accent/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <TbMapBolt className="text-primary" />
            Dynamic World
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleLayer}
              title={isLayerVisible ? "Hide Layer" : "Show Layer"}
            >
              {isLayerVisible ? <TbEye size={14} /> : <TbEyeOff size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadTiles}
              disabled={isLoading}
              title="Refresh"
            >
              <TbRefresh size={14} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Near real-time 10m land use/land cover from Sentinel-2. Updated every 2–5 days.
          Please note that this data can be very noisy and incomplete and should be used for monitoring and lightweight temporal analysis
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* ── Temporal Controls ──────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TbCalendar size={12} />
              Date Range
            </Label>
            
            {availableDates.length > 1 && (
              <div className="px-2 pb-2">
                <Slider
                  min={0}
                  max={availableDates.length - 1}
                  step={1}
                  value={[
                    availableDates.indexOf(startDate) !== -1 ? availableDates.indexOf(startDate) : 0,
                    availableDates.indexOf(endDate) !== -1 ? availableDates.indexOf(endDate) : availableDates.length - 1
                  ]}
                  onValueChange={([startIdx, endIdx]) => {
                    if (startIdx !== undefined && availableDates[startIdx]) setStartDate(availableDates[startIdx])
                    if (endIdx !== undefined && availableDates[endIdx]) setEndDate(availableDates[endIdx])
                  }}
                  className="mt-4 mb-2"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                  <span>{availableDates[0]}</span>
                  <span>{availableDates[availableDates.length - 1]}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-muted-foreground">Start</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs bg-accent/20 border-border/40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-muted-foreground">End</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs bg-accent/20 border-border/40"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={loadTiles}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <TbLoader2 className="mr-2 animate-spin" size={14} />
                  Loading Imagery...
                </>
              ) : (
                <>
                  <TbRefresh className="mr-2" size={14} />
                  Apply Date Range
                </>
              )}
            </Button>

            {/* Available dates info */}
            {availableDates.length > 0 && (
              <p className="text-[9px] text-muted-foreground">
                {availableDates.length} scenes available in range
              </p>
            )}
          </div>

          {/* ── Opacity Control ────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TbAdjustments size={12} />
              Opacity
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[opacity * 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => setOpacity(v / 100)}
                className="flex-1"
              />
              <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          </div>

          {/* ── Legend / Class Toggles ─────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Land Cover Classes
              </Label>
              <button
                className="text-[9px] text-primary hover:underline"
                onClick={() => setHiddenClasses(new Set())}
              >
                Show All
              </button>
            </div>

            <div className="space-y-1">
              {DW_CLASSES.map((cls) => {
                const isHidden = hiddenClasses.has(cls.value)
                return (
                  <div
                    key={cls.value}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md transition-all cursor-pointer group",
                      isHidden ? "opacity-40" : "hover:bg-accent/50"
                    )}
                    onClick={() => toggleClassVisibility(cls.value)}
                  >
                    <Checkbox
                      checked={!isHidden}
                      onCheckedChange={() => toggleClassVisibility(cls.value)}
                      className="h-3.5 w-3.5"
                    />
                    <div
                      className="h-3 w-5 rounded-sm border border-border/30 shadow-sm shrink-0"
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="text-[11px] font-medium flex-1">{cls.label}</span>
                    <span className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {cls.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Quick Presets ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Quick Ranges
            </Label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: "1M", months: 1 },
                { label: "3M", months: 3 },
                { label: "6M", months: 6 },
                { label: "1Y", months: 12 },
                { label: "2Y", months: 24 },
                { label: "All", months: 60 },
              ].map((preset) => {
                const end = new Date()
                const start = new Date()
                start.setMonth(start.getMonth() - preset.months)
                const s = start.toISOString().split("T")[0]
                const e = end.toISOString().split("T")[0]
                const isActive = startDate === s && endDate === e
                return (
                  <button
                    key={preset.label}
                    className={cn(
                      "text-[10px] font-bold py-1.5 rounded-md border transition-all",
                      isActive
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-accent/20 border-border/30 text-muted-foreground hover:bg-accent/40"
                    )}
                    onClick={() => {
                      setStartDate(s)
                      setEndDate(e)
                    }}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-[10px] text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-accent/10 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>GOOGLE/DYNAMICWORLD/V1</span>
        <span className={cn(
          "font-bold",
          dynamicWorldTileUrl ? "text-green-500" : "text-muted-foreground"
        )}>
          {isLoading ? "LOADING" : dynamicWorldTileUrl ? "ACTIVE" : "IDLE"}
        </span>
      </div>
    </div>
  )
}
