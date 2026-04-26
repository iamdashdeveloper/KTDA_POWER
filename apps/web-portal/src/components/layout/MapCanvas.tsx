import React from 'react';
import { useMapStore } from '@/store/useMapStore';
import { OpenLayersMap } from './OpenLayersMap';
import { CesiumMap } from './CesiumMap';

export const MapCanvas: React.FC = () => {
  const { viewMode, viewCenter, viewZoom } = useMapStore();

  return (
    <div className="w-full h-full">
      {viewMode === '2D' && <OpenLayersMap />}
      {viewMode === 'TERRAIN_3D' && (
        <CesiumMap 
          center={viewCenter} 
          zoom={viewZoom} 
        />
      )}
    </div>
  );
};
