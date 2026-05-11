import React from "react"
import { useMapStore } from "@/store/useMapStore"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Separator } from "@workspace/ui/components/separator"
import { TbColumns, TbArrowLeftRight, TbInfoCircle } from "react-icons/tb"

const COMPARABLE_LAYERS = [
  { id: "satellite", name: "Esri Satellite" },
  { id: "landcover", name: "ESA WorldCover" },
  { id: "dynamicworld", name: "Dynamic World" },
  { id: "osm", name: "OpenStreetMap" },
]

export const CompareLayersPanel: React.FC = () => {
  const { compareConfig, setCompareConfig, setLayerVisibility } = useMapStore()

  const toggleCompare = (checked: boolean) => {
    setCompareConfig({ active: checked })
    
    if (checked) {
      // Ensure compared layers are visible
      setLayerVisibility(compareConfig.leftLayer, true)
      setLayerVisibility(compareConfig.rightLayer, true)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border/50 bg-accent/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <TbColumns className="text-primary" />
            Compare Layers
          </h2>
          <Checkbox
            checked={compareConfig.active}
            onCheckedChange={(checked: boolean) => toggleCompare(!!checked)}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Swipe between two raster layers for visual change detection and analysis.
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Left Layer Selection */}
        <div className="space-y-3">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Left Side Layer
          </Label>
          <Select
            value={compareConfig.leftLayer}
            onValueChange={(val) => {
              setCompareConfig({ leftLayer: val })
              if (compareConfig.active) setLayerVisibility(val, true)
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select left layer" />
            </SelectTrigger>
            <SelectContent>
              {COMPARABLE_LAYERS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center py-1">
          <TbArrowLeftRight className="text-muted-foreground opacity-30" size={20} />
        </div>

        {/* Right Layer Selection */}
        <div className="space-y-3">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Right Side Layer
          </Label>
          <Select
            value={compareConfig.rightLayer}
            onValueChange={(val) => {
              setCompareConfig({ rightLayer: val })
              if (compareConfig.active) setLayerVisibility(val, true)
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select right layer" />
            </SelectTrigger>
            <SelectContent>
              {COMPARABLE_LAYERS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-4" />

        {/* Swipe Position Slider (Panel Control) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Swipe Position
            </Label>
            <span className="text-[10px] font-mono text-primary">
              {compareConfig.swipePosition}%
            </span>
          </div>
          <Slider
            value={[compareConfig.swipePosition]}
            min={0}
            max={100}
            step={1}
            onValueChange={([val]) => setCompareConfig({ swipePosition: val })}
            disabled={!compareConfig.active}
          />
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <TbInfoCircle size={14} />
            <span className="text-[10px] font-bold uppercase">Pro Tip</span>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            You can also drag the vertical divider directly on the map to compare layers in real-time.
          </p>
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-border/50 bg-accent/5">
        <Button
          variant="outline"
          className="w-full text-xs h-8"
          onClick={() => setCompareConfig({ active: false })}
        >
          Exit Compare Mode
        </Button>
      </div>
    </div>
  )
}
