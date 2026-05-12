import React, { useEffect, useRef, useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { useMapStore } from "@/store/useMapStore"
import { OpenLayersMap, getMapInstance } from "../layout/OpenLayersMap"
import { CesiumSyncManager } from "./CesiumSyncManager"
import { Button } from "@workspace/ui/components/button"
import { TbX } from "react-icons/tb"
import { Loader2 } from "lucide-react"

export const SplitGISWorkspace: React.FC = () => {
  const { set3DSyncActive } = useMapStore()
  const cesiumContainerRef = useRef<HTMLDivElement>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const syncManagerRef = useRef<CesiumSyncManager | null>(null)

  useEffect(() => {
    let retryCount = 0
    const MAX_RETRIES = 20

    const initCesium = () => {
      const olMap = getMapInstance()

      if (!olMap || !cesiumContainerRef.current) {
        retryCount++
        if (retryCount < MAX_RETRIES) {
          setTimeout(initCesium, 300)
        } else {
          console.error("[SplitGISWorkspace] OL Map not available after retries")
          setIsInitializing(false)
        }
        return
      }

      try {
        const manager = new CesiumSyncManager(olMap)
        manager.initialize(cesiumContainerRef.current)
        syncManagerRef.current = manager
        setIsInitializing(false)
      } catch (error) {
        console.error("[SplitGISWorkspace] Failed to initialize Cesium Sync:", error)
        setIsInitializing(false)
      }
    }

    // Small delay to let OpenLayersMap mount and register its instance
    setTimeout(initCesium, 500)

    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.destroy()
        syncManagerRef.current = null
      }
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Sync Status Bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/50 bg-primary/5 px-4">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isInitializing ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isInitializing ? "Initializing Synchronized 3D Workspace..." : "Synchronized 3D Workspace Active"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive"
          onClick={() => set3DSyncActive(false)}
        >
          <TbX size={12} />
          EXIT 3D SYNC
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* 2D Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="relative h-full w-full overflow-hidden">
            <OpenLayersMap />
            <div className="pointer-events-none absolute top-2 left-2 z-10 rounded border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-sm">
              2D — OpenLayers
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-border/50 data-[resize-handle-state=drag]:bg-primary/50"
        />

        {/* 3D Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="relative h-full w-full overflow-hidden bg-black">
            <div id="map3d" ref={cesiumContainerRef} className="h-full w-full" />

            <div className="pointer-events-none absolute top-2 left-2 z-10 rounded border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-sm">
              3D — CesiumJS
            </div>

            {isInitializing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/30 bg-background/20 p-8 shadow-2xl backdrop-blur-md">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Initializing Cesium Engine</p>
                    <p className="mt-1 text-[10px] text-white/50">Synchronizing with 2D viewport...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Attribution */}
            <div className="pointer-events-none absolute right-2 bottom-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/40">
              CesiumJS · ol-cesium
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
