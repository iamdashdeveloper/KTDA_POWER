import React, { useState } from "react"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Input } from "@workspace/ui/components/input"
import { 
  TbSearch, 
  TbChevronRight, 
  TbChevronDown,
  TbGeometry,
  TbRuler2, 
  TbLayersIntersect, 
  TbScissors, 
  TbArrowAutofitHeight, 
  TbWorldDownload, 
  TbVariable, 
  TbTrash
} from "react-icons/tb"
import { cn } from "@workspace/ui/lib/utils"
import { useGeoprocessingStore } from "@/store/useGeoprocessingStore"
import { ToolModal } from "./ToolModal"

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

interface Category {
  id: string
  name: string
  icon: React.ReactNode
  tools: Tool[]
}

const TOOL_CATEGORIES: Category[] = [
  {
    id: "proximity",
    name: "Proximity Tools",
    icon: <TbVariable className="text-blue-500" />,
    tools: [
      { id: "buffer", name: "Buffer Tool", description: "Create a buffer zone around features at a specified distance.", icon: <TbGeometry /> }
    ]
  },
  {
    id: "measurement",
    name: "Measurement Tools",
    icon: <TbRuler2 className="text-green-500" />,
    tools: [
      { id: "measure", name: "Area & Distance", description: "Measure area, perimeter, and length of features.", icon: <TbRuler2 /> }
    ]
  },
  {
    id: "overlay",
    name: "Overlay Tools",
    icon: <TbLayersIntersect className="text-purple-500" />,
    tools: [
      { id: "intersect", name: "Intersect", description: "Compute the overlap between two layers.", icon: <TbLayersIntersect /> },
      { id: "clip", name: "Clip Layer", description: "Extract features that within a boundary polygon.", icon: <TbScissors /> }
    ]
  },
  {
    id: "geometry",
    name: "Geometry Tools",
    icon: <TbGeometry className="text-orange-500" />,
    tools: [
      { id: "simplify", name: "Simplify", description: "Reduce vertices to improve performance.", icon: <TbArrowAutofitHeight /> },
      { id: "coord-convert", name: "Coordinate Converter", description: "Convert between WGS84, UTM, and DMS.", icon: <TbSearch /> }
    ]
  },
  {
    id: "export",
    name: "Export Tools",
    icon: <TbWorldDownload className="text-rose-500" />,
    tools: [
      { id: "export", name: "Layer Export", description: "Export analysis results to GeoJSON, KML or WKT.", icon: <TbWorldDownload /> }
    ]
  }
]

export const GeoprocessingPanel: React.FC = () => {
  const [searchQuery, setSearchSearchQuery] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["proximity", "measurement"])
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const { analysisLayers, removeAnalysisLayer, toggleVisibility, clearLayers } = useGeoprocessingStore()

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const filteredCategories = TOOL_CATEGORIES.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.tools.length > 0)

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-accent/5">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
          <TbVariable className="text-primary" />
          Geoprocessing Toolbox
        </h2>
        
        <div className="relative">
          <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Search tools..." 
            className="pl-9 bg-accent/20 border-border/40 focus:ring-primary/20 h-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="mb-2">
              <button 
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  {cat.icon}
                  <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground group-hover:text-foreground">
                    {cat.name}
                  </span>
                </div>
                {expandedCategories.includes(cat.id) ? <TbChevronDown size={14} /> : <TbChevronRight size={14} />}
              </button>

              {expandedCategories.includes(cat.id) && (
                <div className="mt-1 ml-4 border-l border-border/30 pl-2 space-y-1">
                  {cat.tools.map(tool => (
                    <button
                      key={tool.id}
                      className="w-full text-left p-2 rounded-md hover:bg-primary/5 hover:text-primary transition-all group border border-transparent hover:border-primary/10"
                      onClick={() => setActiveToolId(tool.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 rounded bg-accent/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {React.cloneElement(tool.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                        </div>
                        <span className="text-xs font-semibold">{tool.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 pl-6">
                        {tool.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Active Analysis Layers Section */}
        {analysisLayers.length > 0 && (
          <div className="mt-6 border-t border-border/50 p-4">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <TbLayersIntersect />
                   Analysis Layers
                </h3>
                <button 
                  onClick={clearLayers}
                  className="text-[10px] text-destructive hover:underline"
                >
                  Clear All
                </button>
             </div>

             <div className="space-y-2">
                {analysisLayers.map(layer => (
                  <div key={layer.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/20 border border-border/40">
                     <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="h-3 w-3 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: layer.color }}
                        />
                        <div className="flex flex-col min-w-0">
                           <span className="text-[11px] font-bold truncate">{layer.name}</span>
                           <span className="text-[9px] text-muted-foreground uppercase font-mono">{layer.type}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => toggleVisibility(layer.id)}
                          className={cn("p-1 rounded hover:bg-accent transition-colors", !layer.visible && "opacity-30")}
                        >
                           <TbSearch size={14} />
                        </button>
                        <button 
                          onClick={() => removeAnalysisLayer(layer.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive/50 hover:text-destructive transition-colors"
                        >
                           <TbTrash size={14} />
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </ScrollArea>

      <ToolModal 
        toolId={activeToolId} 
        onClose={() => setActiveToolId(null)} 
      />

      {/* Footer / Status */}
      <div className="p-3 border-t border-border/50 bg-accent/10 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>TURF.JS ENGINE ACTIVE</span>
        <span className="text-primary font-bold">READY</span>
      </div>
    </div>
  )
}
