import { useState } from "react"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@workspace/ui/components/context-menu"

interface LayerControlProps {
  featureGroups: any[]
  visibleLayers: Set<string>
  onLayerToggle: (featureId: string) => void
  onFeatureDelete?: (featureId: string) => void
}

export function LayerControl({
  featureGroups,
  visibleLayers,
  onLayerToggle,
  onFeatureDelete,
}: LayerControlProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (featureId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId)
    } else {
      newExpanded.add(featureId)
    }
    setExpandedGroups(newExpanded)
  }

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">Layers</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Toggle visibility of feature groups
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {featureGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No feature groups yet
            </p>
          ) : (
            featureGroups.map((group) => {
              const children = group.children || []
              const isExpanded = expandedGroups.has(group.id)
              const isVisible = visibleLayers.has(group.id)
              const childrenWithGeometry = children.filter(
                (c: any) => c.geometry
              )

              return (
                <div key={group.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {children.length > 0 && (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="rounded p-0 hover:bg-muted"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {children.length === 0 && <div className="w-4" />}

                    <Checkbox
                      id={`layer-${group.id}`}
                      checked={isVisible}
                      onCheckedChange={() => onLayerToggle(group.id)}
                    />

                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <label
                          htmlFor={`layer-${group.id}`}
                          className="flex-1 cursor-pointer truncate text-sm font-medium hover:text-primary"
                          title={group.name}
                        >
                          {group.name}
                        </label>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => onLayerToggle(group.id)}
                        >
                          {isVisible ? "Hide" : "Show"}
                        </ContextMenuItem>
                        {onFeatureDelete && (
                          <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => onFeatureDelete(group.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete{" "}
                              {children.length > 0
                                ? `(${children.length} features)`
                                : ""}
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>

                    {childrenWithGeometry.length > 0 && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {childrenWithGeometry.length}
                      </span>
                    )}
                  </div>

                  {isExpanded && children.length > 0 && (
                    <div className="ml-6 space-y-2 border-l pl-2">
                      {children.map((child: any) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className={`h-3 w-3 rounded-full ${
                              child.geometry ? "bg-blue-500" : "bg-gray-300"
                            }`}
                            title={
                              child.geometry ? "Has geometry" : "No geometry"
                            }
                          />
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <label
                                htmlFor={`layer-${child.id}`}
                                className="flex-1 cursor-pointer truncate text-xs text-muted-foreground hover:text-primary"
                                title={child.name}
                              >
                                {child.name}
                              </label>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              {onFeatureDelete && (
                                <ContextMenuItem
                                  variant="destructive"
                                  onClick={() => onFeatureDelete(child.id)}
                                >
                                  <Trash2 className="mr-2 h-3 w-3" />
                                  Delete
                                </ContextMenuItem>
                              )}
                            </ContextMenuContent>
                          </ContextMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
