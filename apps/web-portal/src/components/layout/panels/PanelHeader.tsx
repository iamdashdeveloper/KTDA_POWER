import React from "react"
import { X, Trash2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface PanelHeaderProps {
  title: string
  onClose: () => void
  tabs?: { id: string; icon: React.ReactNode; label: string }[]
  activeTab?: string
  onTabChange?: (id: string) => void
  onClearHydroTabs?: () => void
  hasHydroTabs?: boolean
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  onClose,
  tabs,
  activeTab,
  onTabChange,
  onClearHydroTabs,
  hasHydroTabs = false,
}) => (
  <div className="flex flex-col border-b border-border">
    <div className="flex h-8 items-center justify-between bg-muted px-3">
      <span className="text-[11px] font-bold tracking-tight text-muted-foreground uppercase">
        {title}
      </span>
      <div className="flex items-center gap-1">
        {hasHydroTabs && onClearHydroTabs && (
          <button
            onClick={onClearHydroTabs}
            className="cursor-pointer rounded p-0.5 transition-colors hover:bg-destructive/20"
            title="Clear all hydro model tabs"
          >
            <Trash2
              size={14}
              className="text-muted-foreground hover:text-destructive"
            />
          </button>
        )}
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-0.5 transition-colors hover:bg-accent"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
    {tabs && (
      <div className="flex border-b border-border/50 bg-card px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-1.5 text-[10px] font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-accent"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    )}
  </div>
)
