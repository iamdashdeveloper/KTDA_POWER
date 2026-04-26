import * as React from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '@/store/useMapStore';
import { getHeightFromZoom } from '@/tools/terrainProfile/terrainProfileUtils';
import { useTerrainProfile } from '@/tools/terrainProfile/useTerrainProfile';
import { TerrainProfileChart } from '@/tools/terrainProfile/TerrainProfileChart';
import { useLayout } from '@/context/LayoutContext';
import { Loader2, MousePointer2 } from 'lucide-react';

interface CesiumMapProps {
  center: [number, number]; // [lon, lat]
  zoom: number;
}

export const CesiumMap: React.FC<CesiumMapProps> = ({ center, zoom }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const viewerRef = React.useRef<Cesium.Viewer | null>(null);
  const { openPanel, setCollapsed } = useLayout();
  const terrainCommand = useMapStore((s) => s.terrainCommand);

  // Stable viewer state so hooks can subscribe
  const [viewer, setViewer] = React.useState<Cesium.Viewer | null>(null);
  const { 
    profileData, 
    isDrawing, 
    isLoading, 
    startDrawing, 
    startPolylineDrawing, 
    startFeatureSelection,
    clearProfile 
  } = useTerrainProfile(viewer);

  // ── Initialize Cesium ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

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
    });

    // Enable all camera interactions
    v.scene.screenSpaceCameraController.enableRotate = true;
    v.scene.screenSpaceCameraController.enableTilt = true;
    v.scene.screenSpaceCameraController.enableZoom = true;
    v.scene.screenSpaceCameraController.enableTranslate = true;
    // Remove icon
    v.creditDisplay.container.style.display = "none";
    // Add high-res imagery
    Cesium.IonImageryProvider.fromAssetId(2).then((provider) => {
      v.imageryLayers.addImageryProvider(provider);
    }).catch(() => {});

    // Globe settings
    v.scene.globe.enableLighting = true;
    v.scene.globe.depthTestAgainstTerrain = true;
    v.scene.verticalExaggeration = 1.3;

    viewerRef.current = v;
    setViewer(v);

    // Fly in with Nairobi Nairobi
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], getHeightFromZoom(zoom)),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
      duration: 1.2,
    });

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        setViewer(null);
      }
    };
  }, []);

  // ── React to ribbon terrain commands ────────────────────────────────────────
  React.useEffect(() => {
    if (!terrainCommand) return;
    
    if (terrainCommand.id === 'start-cross-section') {
      clearProfile();
      startDrawing();
    } else if (terrainCommand.id === 'start-polyline-cross-section') {
      clearProfile();
      startPolylineDrawing();
    } else if (terrainCommand.id === 'start-feature-cross-section') {
      clearProfile();
      startFeatureSelection();
    }
  }, [terrainCommand]);

  // ── Push chart into bottom panel when profile data arrives ──────────────────
  React.useEffect(() => {
    if (profileData.length === 0) return;

    openPanel(
      'bottom',
      <TerrainProfileChart data={profileData} />,
      'Elevation Profile'
    );
  }, [profileData]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Drawing instructions — centered overlay */}
      {isDrawing && (
        <div className="absolute top-5 right-1/2  z-20 pointer-events-none">
          <div className="bg-background/80 backdrop-blur-md border border-primary/20 text-foreground px-6 py-3 flex flex-col items-center gap-1 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3">
              <MousePointer2 size={18} className="text-primary animate-pulse" />
              <span className="font-semibold text-sm tracking-tight">Cross Section Drawing Mode</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Click two points on the terrain to generate a profile • <span className="text-primary/70">Right-click to cancel</span>
            </p>
          </div>
        </div>
      )}

      {/* Sampling loader */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] z-30 flex items-center justify-center">
          <div className="bg-background/90 p-6 rounded-2xl shadow-2xl border border-border flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Sampling terrain data…</p>
          </div>
        </div>
      )}

      {/* Cesium attribution */}
      <div className="absolute bottom-1 right-1 z-10 text-[10px] text-white/50 bg-black/30 px-1 rounded">
        CesiumJS | World Terrain
      </div>
    </div>
  );
};
