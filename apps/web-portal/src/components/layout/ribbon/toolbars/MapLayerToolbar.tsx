import React from 'react';
import { Plus, Settings } from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';

interface MapLayerToolbarProps {
  onToolClick: (toolId: string) => void;
}

export const MapLayerToolbar: React.FC<MapLayerToolbarProps> = ({ onToolClick }) => {
  return (
    <RibbonGroup label="Layer">
      <RibbonButton icon={<Plus size={24} />} label="Add Layer" onClick={() => onToolClick('add-data')} />
      <RibbonButton icon={<Settings size={24} />} label="Properties" onClick={() => onToolClick('layer-properties')} />
    </RibbonGroup>
  );
};
