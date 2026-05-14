import * as React from "react"
import * as Cesium from "cesium"
import { useMapStore } from "@/store/useMapStore"
import { getHeightFromZoom } from "@/tools/terrainProfile/terrainProfileUtils"
import { useTerrainProfile } from "@/tools/terrainProfile/useTerrainProfile"
import { TerrainProfileChart } from "@/tools/terrainProfile/TerrainProfileChart"
import { useLayout } from "@/context/LayoutContext"
import { Loader2, MousePointer2 } from "lucide-react"

interface CesiumMapProps {
  center: [number, number] // [lon, lat]
  zoom: number
}

export const CesiumMap: React.FC<CesiumMapProps> = ({ center, zoom }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewerRef = React.useRef<Cesium.Viewer | null>(null)
  const { openPanel } = useLayout()
  const terrainCommand = useMapStore((s) => s.terrainCommand)

  // Stable viewer state so hooks can subscribe
  const [viewer, setViewer] = React.useState<Cesium.Viewer | null>(null)
  const {
    profileData,
    isDrawing,
    isLoading,
    startDrawing,
    startPolylineDrawing,
    startFeatureSelection,
    clearProfile,
  } = useTerrainProfile(viewer)

  // ── Initialize Cesium ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    const v = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: true,
      scene3DOnly: true,
      fullscreenButton: false,
    })

    // Enable all camera interactions
    v.scene.screenSpaceCameraController.enableRotate = true
    v.scene.screenSpaceCameraController.enableTilt = true
    v.scene.screenSpaceCameraController.enableZoom = true
    v.scene.screenSpaceCameraController.enableTranslate = true
    // Remove icon
    v.creditDisplay.container.style.display = "none"
    // Add high-res imagery
    Cesium.IonImageryProvider.fromAssetId(2)
      .then((provider) => {
        v.imageryLayers.addImageryProvider(provider)
      })
      .catch(() => {})

    // Globe settings
    v.scene.globe.enableLighting = true
    v.scene.globe.depthTestAgainstTerrain = true
    v.scene.verticalExaggeration = 1.3

    viewerRef.current = v
    setViewer(v)

    // Fly in with Nairobi Nairobi
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        center[0],
        center[1],
        getHeightFromZoom(zoom)
      ),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
      duration: 1.2,
    })

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
        setViewer(null)
      }
    }
  }, [])

  // ── React to ribbon terrain commands ────────────────────────────────────────
  React.useEffect(() => {
    if (!terrainCommand) return

    if (terrainCommand.id === "start-cross-section") {
      clearProfile()
      startDrawing()
    } else if (terrainCommand.id === "start-polyline-cross-section") {
      clearProfile()
      startPolylineDrawing()
    } else if (terrainCommand.id === "start-feature-cross-section") {
      clearProfile()
      startFeatureSelection()
    }
  }, [terrainCommand])

  // ── Push chart into bottom panel when profile data arrives ──────────────────
  React.useEffect(() => {
    if (profileData.length === 0) return

    openPanel(
      "bottom",
      <TerrainProfileChart data={profileData} />,
      "Elevation Profile"
    )
  }, [profileData])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Drawing instructions — centered overlay */}
      {isDrawing && (
        <div className="pointer-events-none absolute top-5 right-1/2 z-20">
          <div className="flex animate-in flex-col items-center gap-1 border border-primary/20 bg-background/80 px-6 py-3 text-foreground shadow-2xl backdrop-blur-md duration-300 fade-in zoom-in">
            <div className="flex items-center gap-3">
              <MousePointer2 size={18} className="animate-pulse text-primary" />
              <span className="text-sm font-semibold tracking-tight">
                Cross Section Drawing Mode
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Click two points on the terrain to generate a profile •{" "}
              <span className="text-primary/70">Right-click to cancel</span>
            </p>
          </div>
        </div>
      )}

      {/* Sampling loader */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background/90 p-6 shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Sampling terrain data…</p>
          </div>
        </div>
      )}
    </div>
  )
}
