import React, { useEffect, useMemo } from 'react';
import { DragZoom } from 'ol/interaction';
import { always } from 'ol/events/condition';
import Map from 'ol/Map';
import { useMapStore } from '@/store/useMapStore';

interface ZoomBoxLogicProps {
  map: Map | null;
  active: boolean;
}

export const ZoomBoxLogic: React.FC<ZoomBoxLogicProps> = ({ map, active }) => {
  const dragZoomInteraction = useMemo(() => new DragZoom({
    condition: always,
    className: 'ol-zoom-box'
  }), []);

  useEffect(() => {
    if (!map) return;

    if (active) {
      map.addInteraction(dragZoomInteraction);
      
      const handleBoxEnd = () => {
        // Switch back to explore tool after zoom
        setTimeout(() => {
          useMapStore.getState().setActiveTool('explore');
        }, 100);
      };
      
      dragZoomInteraction.on('boxend', handleBoxEnd);
      
      return () => {
        dragZoomInteraction.un('boxend', handleBoxEnd);
        map.removeInteraction(dragZoomInteraction);
      };
    } else {
      map.removeInteraction(dragZoomInteraction);
    }
  }, [map, active, dragZoomInteraction]);

  return null;
};
