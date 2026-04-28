import React from "react"
import {
  Clipboard,
  Copy,
  Scissors,
  Pen,
  Circle,
  Square,
  Upload,
  Trash2,
} from "lucide-react"
import { RibbonGroup } from "../RibbonGroup"
import { RibbonButton } from "../RibbonButton"
import { RibbonSmallButton } from "../RibbonSmallButton"

interface MapClipboardToolbarProps {
  onToolClick: (toolId: string) => void
}

export const MapClipboardToolbar: React.FC<MapClipboardToolbarProps> = ({
  onToolClick,
}) => {
  return (
    <RibbonGroup label="Clipboard">
      <RibbonButton
        icon={<Clipboard size={20} />}
        label="Paste"
        onClick={() => onToolClick("paste")}
      />
      <div className="flex flex-col gap-1">
        <RibbonSmallButton
          icon={<Copy size={14} />}
          label="Copy"
          onClick={() => onToolClick("copy")}
        />
        <RibbonSmallButton
          icon={<Scissors size={14} />}
          label="Cut"
          onClick={() => onToolClick("cut")}
        />
      </div>

      <div className="ml-1 flex items-center gap-3 border-l border-border/50 pl-3">
        <div className="flex flex-col justify-center gap-1">
          <RibbonSmallButton
            icon={<Pen size={14} />}
            label="Draw Line"
            onClick={() => onToolClick("draw-LineString")}
          />
          <RibbonSmallButton
            icon={<Circle size={14} />}
            label="Draw Point"
            onClick={() => onToolClick("draw-Point")}
          />
          <RibbonSmallButton
            icon={<Square size={14} />}
            label="Draw Polygon"
            onClick={() => onToolClick("draw-Polygon")}
          />
        </div>
        <div className="flex flex-col justify-center gap-1">
          <RibbonSmallButton
            icon={<Upload size={14} />}
            label="Save & Upload"
            onClick={() => onToolClick("save-drawing")}
          />
          <RibbonSmallButton
            icon={<Trash2 size={14} />}
            label="Clear"
            onClick={() => onToolClick("clear-drawing")}
          />
        </div>
      </div>
    </RibbonGroup>
  )
}
