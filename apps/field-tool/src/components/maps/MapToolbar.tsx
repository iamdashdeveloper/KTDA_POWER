import { Button } from "@workspace/ui/components/button"
import {
  Layers3,
  Map as MapIcon,
  Navigation,
  LocateFixed,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { Basemap } from "./types"

interface MapToolbarProps {
  basemap: Basemap
  onBasemapChange: (b: Basemap) => void
  isTracking: boolean
  onToggleTracking: () => void
  isVoiceEnabled: boolean
  onToggleVoice: () => void
  onOpenRouting: () => void
}

export function MapToolbar({
  basemap,
  onBasemapChange,
  isTracking,
  onToggleTracking,
  isVoiceEnabled,
  onToggleVoice,
  onOpenRouting,
}: MapToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 rounded-2xl bg-card/90 p-2 shadow-lg backdrop-blur">
      <Button
        type="button"
        variant={basemap === "osm" ? "default" : "outline"}
        size="sm"
        onClick={() => onBasemapChange("osm")}
        className="gap-2"
      >
        <MapIcon className="h-4 w-4" />
        OSM
      </Button>

      <Button
        type="button"
        variant={basemap === "satellite" ? "default" : "outline"}
        size="sm"
        onClick={() => onBasemapChange("satellite")}
        className="gap-2"
      >
        <Layers3 className="h-4 w-4" />
        Satellite
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenRouting}
        className="gap-2"
        title="Plan a route"
      >
        <Navigation className="h-4 w-4" />
        Route
      </Button>

      <Button
        type="button"
        variant={isTracking ? "default" : "outline"}
        size="sm"
        onClick={onToggleTracking}
        className="gap-2"
        title={isTracking ? "Stop tracking" : "Start live tracking"}
      >
        <LocateFixed className="h-4 w-4" />
        {isTracking ? "Tracking" : "Track"}
      </Button>

      <Button
        type="button"
        variant={isVoiceEnabled ? "default" : "outline"}
        size="sm"
        onClick={onToggleVoice}
        className={`gap-2 ${isVoiceEnabled ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
        title={isVoiceEnabled ? "Voice nav on" : "Enable voice navigation"}
      >
        {isVoiceEnabled ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4" />
        )}
        Voice
      </Button>
    </div>
  )
}
