import * as React from 'react';
import * as Cesium from 'cesium';
import { interpolatePoints, densifyPath, computeProfile } from './terrainProfileUtils';
import type { ProfilePoint } from './terrainProfileUtils';

export function useTerrainProfile(viewer: Cesium.Viewer | null) {
  const [profileData, setProfileData] = React.useState<ProfilePoint[]>([]);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const handlerRef = React.useRef<Cesium.ScreenSpaceEventHandler | null>(null);

  const clearProfile = React.useCallback(() => {
    setProfileData([]);
    if (viewer) {
      viewer.entities.removeById('profile-line');
      viewer.entities.removeById('profile-start');
      viewer.entities.removeById('profile-end');
      // Remove any polyline points
      const toRemove = viewer.entities.values.filter(e => e.id && String(e.id).startsWith('profile-pt-'));
      toRemove.forEach(e => viewer.entities.remove(e));
    }
  }, [viewer]);

  /**
   * UNIFIED PIPELINE (Core Logic)
   * All modes eventually call this.
   */
  const generateProfileFromPath = React.useCallback(async (inputPositions: Cesium.Cartesian3[]) => {
    if (!viewer || inputPositions.length < 2) return;

    setIsLoading(true);
    setIsDrawing(false); // Stop drawing mode once we start processing

    try {
      // Densify path if it's more than 2 points (or even for 2 points to ensure quality)
      const path = inputPositions.length > 2 
        ? densifyPath(inputPositions, 300)
        : interpolatePoints(inputPositions[0], inputPositions[1], 250);

      const cartographic = path.map(p => Cesium.Cartographic.fromCartesian(p));

      // ⛰️ TERRAIN SAMPLING (Reuse existing working logic)
      const sampled = await Cesium.sampleTerrainMostDetailed(
        viewer.terrainProvider,
        cartographic
      );

      const profile = computeProfile(path, sampled);
      setProfileData(profile);
      
      // Draw the final line on the map for visual feedback
      viewer.entities.removeById('profile-line');
      viewer.entities.add({
        id: 'profile-line',
        polyline: {
          positions: path,
          width: 4,
          material: Cesium.Color.YELLOW,
          clampToGround: true
        }
      });

    } catch (error) {
      console.error('Failed to generate terrain profile:', error);
    } finally {
      setIsLoading(false);
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    }
  }, [viewer]);

  /**
   * LEGACY/EXISTING: 2-Point Mode
   * Kept functional exactly as before.
   */
  const startDrawing = React.useCallback(() => {
    if (!viewer) return;

    handlerRef.current?.destroy();
    clearProfile();
    setIsDrawing(true);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handlerRef.current = handler;
    let positions: Cesium.Cartesian3[] = [];

    handler.setInputAction((click: any) => {
      const cartesian = viewer.scene.pickPosition(click.position);
      if (!cartesian) return;

      positions.push(cartesian);
      
      viewer.entities.add({
        id: positions.length === 1 ? 'profile-start' : 'profile-end',
        position: cartesian,
        point: {
          pixelSize: 8,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });

      if (positions.length === 2) {
        generateProfileFromPath(positions);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      setIsDrawing(false);
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      clearProfile();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  }, [viewer, generateProfileFromPath, clearProfile]);

  /**
   * NEW: Polyline Mode
   * Supports multiple vertices, ends on Right Click or Double Click.
   */
  const startPolylineDrawing = React.useCallback(() => {
    if (!viewer) return;

    handlerRef.current?.destroy();
    clearProfile();
    setIsDrawing(true);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handlerRef.current = handler;
    let positions: Cesium.Cartesian3[] = [];
    let isDrawingLine = false;

    // Live preview line using CallbackProperty for rubber-banding
    const previewEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => positions, false),
        width: 3,
        material: Cesium.Color.YELLOW.withAlpha(0.6),
        clampToGround: true
      }
    });

    // 🖱️ Start/Add Vertex
    handler.setInputAction((click: any) => {
      const cartesian = viewer.scene.pickPosition(click.position);
      if (!cartesian) return;

      if (!isDrawingLine) {
        isDrawingLine = true;
        positions.push(cartesian);
        positions.push(cartesian.clone()); // floating endpoint
      } else {
        positions.push(cartesian.clone()); // new floating endpoint
      }
      
      viewer.entities.add({
        id: `profile-pt-${positions.length}`,
        position: cartesian,
        point: {
          pixelSize: 6,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 🌫️ Rubber-band effect
    handler.setInputAction((movement: any) => {
      if (!isDrawingLine || positions.length < 2) return;

      const cartesian = viewer.scene.pickPosition(movement.endPosition);
      if (!cartesian) return;

      // Update the floating endpoint to the current mouse position
      positions[positions.length - 1] = cartesian;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 🏁 Finish drawing (Double Click)
    handler.setInputAction(() => {
      if (positions.length >= 2) {
        isDrawingLine = false;
        const finalLine = positions.slice(0, -1); // remove floating point
        
        viewer.entities.remove(previewEntity);
        generateProfileFromPath(finalLine);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Cancel on Right Click
    handler.setInputAction(() => {
      setIsDrawing(false);
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      viewer.entities.remove(previewEntity);
      clearProfile();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  }, [viewer, generateProfileFromPath, clearProfile]);

  /**
   * NEW: Feature Selection Mode
   * User clicks an existing polyline feature.
   */
  const startFeatureSelection = React.useCallback(() => {
    if (!viewer) return;

    handlerRef.current?.destroy();
    clearProfile();
    setIsDrawing(true);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handlerRef.current = handler;

    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.polyline) {
        const entity = pickedObject.id;
        const polyline = entity.polyline;
        
        // Extract positions from the polyline
        const positions = polyline.positions.getValue(viewer.clock.currentTime);
        
        if (positions && positions.length >= 2) {
          generateProfileFromPath(positions);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      setIsDrawing(false);
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  }, [viewer, generateProfileFromPath, clearProfile]);

  return {
    profileData,
    isDrawing,
    isLoading,
    startDrawing,           // Mode 1: Two Points
    startPolylineDrawing,   // Mode 2: Draw Line
    startFeatureSelection,  // Mode 3: Select Feature
    clearProfile
  };
}
