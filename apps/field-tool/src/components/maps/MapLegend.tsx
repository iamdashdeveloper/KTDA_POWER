import { Button } from "@workspace/ui/components/button"
import { Eye, EyeOff, X } from "lucide-react"
import type { LegendGroupItem } from "./types"
import { formatLayerCount, getFeatureColor } from "./mapUtils"

interface MapLegendProps {
  isOpen: boolean
  onClose: () => void
  featureCount: number
  legendGroups: LegendGroupItem[]
  hiddenGroupIds: Set<string>
  onToggleGroup: (id: string) => void
  onColorChange: (groupId: string, color: string) => void
}

export function MapLegend({
  isOpen,
  onClose,
  featureCount,
  legendGroups,
  hiddenGroupIds,
  onToggleGroup,
  onColorChange,
}: MapLegendProps) {
  if (!isOpen) return null

  return (
    <div className="absolute bottom-40 left-16 z-20 max-h-[45vh] w-80 overflow-hidden rounded-2xl bg-card/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">
            Feature Legend
          </h3>
          <span className="text-xs text-muted-foreground">
            {formatLayerCount(featureCount, "feature")}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7"
          title="Close legend"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-[35vh] space-y-2 overflow-y-auto pr-1">
        {legendGroups.length === 0 ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            No features loaded for this project.
          </p>
        ) : (
          legendGroups.map((group) => {
            const isHidden = hiddenGroupIds.has(group.id)
            return (
              <div
                key={group.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="relative h-4 w-4">
                      <input
                        type="color"
                        value={getFeatureColor(group.geometryType, group.id)}
                        onChange={(e) => onColorChange(group.id, e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        title="Change layer color"
                      />
                      <span
                        className="pointer-events-none block h-full w-full rounded-sm border border-white/60 shadow-sm"
                        style={{
                          backgroundColor: getFeatureColor(
                            group.geometryType,
                            group.id
                          ),
                        }}
                      />
                    </div>
                    <p className="truncate text-xs font-medium text-foreground">
                      {group.name}
                    </p>
                    <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {group.count}
                    </span>
                  </div>
                  <p className="ml-5 text-[11px] text-muted-foreground">
                    {group.geometryType}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleGroup(group.id)}
                  className="h-7 px-2 text-xs"
                >
                  {isHidden ? (
                    <>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide
                    </>
                  )}
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
