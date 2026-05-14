import React from "react"
import {
  Search,
  Info,
  Ruler,
  Square,
  Trash2,
  LineChartIcon,
} from "lucide-react"
import { RibbonGroup } from "../RibbonGroup"
import { RibbonButton } from "../RibbonButton"
import { SiOpen3D } from "react-icons/si";
import { LocateModal } from "@/components/modals/LocateModal"


interface MapInquiryToolbarProps {
  activeTool: string | null
  onToolClick: (toolId: string) => void
}

import { RibbonSmallButton } from "../RibbonSmallButton"

export const MapInquiryToolbar: React.FC<MapInquiryToolbarProps> = ({
  activeTool,
  onToolClick,
}) => {
  const [locateModalOpen, setLocateModalOpen] = React.useState(false)

  return (
    <>
      <RibbonGroup label="Inquiry">
        <RibbonButton
          icon={<Search size={24} />}
          label="Locate"
          onClick={() => setLocateModalOpen(true)}
        />

      <RibbonButton
        icon={<Info size={24} />}
        label="Identify"
        active={activeTool === "identify"}
        onClick={() => onToolClick("identify")}
      />

      <div className="ml-1 flex items-center gap-3 border-l border-border/50 pl-3">
        <div className="flex flex-col justify-center gap-1">
          <RibbonSmallButton
            icon={<Ruler size={14} />}
            label="Distance"
            onClick={() => onToolClick("measure-distance")}
          />
          <RibbonSmallButton
            icon={<Square size={14} />}
            label="Area"
            onClick={() => onToolClick("measure-area")}
          />
          <RibbonSmallButton
            icon={<Trash2 size={14} />}
            label="Clear"
            onClick={() => onToolClick("clear-measurements")}
          />
        </div>
        <div className="">
          <RibbonSmallButton
            icon={<LineChartIcon size={14} />}
            label="Generate chainage markers"
            onClick={() => onToolClick("generate-chainage")}
          />
          <RibbonSmallButton
            icon={<SiOpen3D size={14} />}
            label="Sync 3D"
            onClick={() => onToolClick("sync-3d")}
          />
        </div>
      </div>
      </RibbonGroup>
      <LocateModal
        isOpen={locateModalOpen}
        onClose={() => setLocateModalOpen(false)}
      />
    </>

  )
}
