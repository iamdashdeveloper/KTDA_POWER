import React from "react"
import {
  Mountain,
  Cpu,
  Target,
  Network,
  Radio,
  AlertTriangle,
  Layers,
  Activity,
  Zap,
  Globe,
  Map as MapIcon,
  ChevronRight,
} from "lucide-react"
import { RibbonGroup } from "../RibbonGroup"
import { RibbonButton } from "../RibbonButton"
import { RibbonSmallButton } from "../RibbonSmallButton"
import { useMapStore } from "@/store/useMapStore"
import { RibbonSeparator } from "../RibbonSeparator"

interface AnalysisToolbarProps {
  onToolClick: (toolId: string) => void
}

export const AnalysisToolbar: React.FC<AnalysisToolbarProps> = ({
  onToolClick,
}) => {
  const { viewMode, setViewMode, executeTerrainCommand } = useMapStore()

  const is3D = viewMode === "TERRAIN_3D"

  return (
    <div className="flex h-full items-center">
      {/* --- Terrain Group --- */}
      <RibbonGroup label="Terrain">
        <RibbonButton
          icon={<Mountain size={24} />}
          label="3D View"
          active={is3D}
          onClick={() => setViewMode("TERRAIN_3D")}
        />

        <RibbonButton
          icon={<MapIcon size={24} />}
          label="2D View"
          active={!is3D}
          onClick={() => setViewMode("2D")}
        />
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup label="Cross Section">
        <RibbonButton
          icon={<Activity size={24} />}
          label="Two Points"
          disabled={!is3D}
          onClick={() => executeTerrainCommand("start-cross-section")}
        />
        <RibbonButton
          icon={<Zap size={24} />}
          label="Draw Line"
          disabled={!is3D}
          onClick={() => executeTerrainCommand("start-polyline-cross-section")}
        />
        <RibbonButton
          icon={<Target size={24} />}
          label="By Feature"
          disabled={!is3D}
          onClick={() => executeTerrainCommand("start-feature-cross-section")}
        />

        <div className="ml-1 flex flex-col justify-center gap-1 border-l border-border/50 pl-2">
          <RibbonSmallButton
            icon={<ChevronRight size={14} />}
            label="Show Chart"
            disabled={!is3D}
            onClick={() => executeTerrainCommand("show-profile")}
          />
          <RibbonSmallButton
            icon={<Layers size={14} />}
            label="Slope/Aspect"
            onClick={() => onToolClick("slope-aspect")}
          />
          <RibbonSmallButton
            icon={<Globe size={14} />}
            label="Viewshed"
            onClick={() => onToolClick("viewshed")}
          />
        </div>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup label="Workflows">
        <RibbonButton
          icon={<Cpu size={24} />}
          label="Geoprocessing"
          onClick={() => onToolClick("geoprocessing")}
        />
        <RibbonButton
          icon={<Target size={24} />}
          label="Suitability"
          onClick={() => onToolClick("suitability-modelling")}
        />
      </RibbonGroup>

      <RibbonGroup label="Networks">
        <RibbonButton
          icon={<Network size={24} />}
          label="Network Analysis"
          onClick={() => onToolClick("network-analysis")}
        />
        <div className="ml-1 flex flex-col justify-center gap-1 border-l border-border/50 pl-2">
          <RibbonSmallButton
            icon={<Zap size={14} />}
            label="Power Flow"
            onClick={() => onToolClick("power-flow")}
          />
          <RibbonSmallButton
            icon={<Activity size={14} />}
            label="Load Forecast"
            onClick={() => onToolClick("load-forecast")}
          />
        </div>
      </RibbonGroup>

      <RibbonGroup label="Intelligence">
        <RibbonButton
          icon={<Radio size={24} />}
          label="Sensors"
          onClick={() => onToolClick("sensors")}
        />
        <RibbonSmallButton
          icon={<AlertTriangle size={14} />}
          label="Flood Prediction"
          onClick={() => onToolClick("flood-prediction")}
        />
      </RibbonGroup>
    </div>
  )
}
