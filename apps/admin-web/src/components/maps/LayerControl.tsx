import { useState } from "react"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { Feature } from "../../types/feature"

interface LayerControlProps {
  features: Feature[]
  visibleLayers: Set<string>
  onLayerToggle: (featureId: string) => void
}

export function LayerControl({
  features,
  visibleLayers,
  onLayerToggle,
}: LayerControlProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Only show parent features (those without parentId)
  const parentFeatures = features.filter((f) => !f.parentId)

  const toggleGroup = (featureId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId)
    } else {
      newExpanded.add(featureId)
    }
    setExpandedGroups(newExpanded)
  }

  const getChildFeatures = (parentId: string): Feature[] => {
    return features.filter((f) => f.parentId === parentId)
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
          {parentFeatures.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No feature groups yet
            </p>
          ) : (
            parentFeatures.map((parent) => {
              const children = getChildFeatures(parent.id)
              const isExpanded = expandedGroups.has(parent.id)
              const isVisible = visibleLayers.has(parent.id)

              return (
                <div key={parent.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {children.length > 0 && (
                      <button
                        onClick={() => toggleGroup(parent.id)}
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
                      id={`layer-${parent.id}`}
                      checked={isVisible}
                      onCheckedChange={() => onLayerToggle(parent.id)}
                    />

                    <label
                      htmlFor={`layer-${parent.id}`}
                      className="flex-1 cursor-pointer truncate text-sm font-medium hover:text-primary"
                      title={parent.name}
                    >
                      {parent.name}
                    </label>

                    {children.length > 0 && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {children.length}
                      </span>
                    )}
                  </div>

                  {isExpanded && children.length > 0 && (
                    <div className="ml-6 space-y-2 border-l pl-2">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id={`layer-${child.id}`}
                            checked={visibleLayers.has(child.id)}
                            onCheckedChange={() => onLayerToggle(child.id)}
                          />
                          <label
                            htmlFor={`layer-${child.id}`}
                            className="flex-1 cursor-pointer truncate text-xs text-muted-foreground hover:text-primary"
                            title={child.name}
                          >
                            {child.name}
                          </label>
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
