import React from 'react';
import { Square, MousePointer2, Circle } from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
// import { RibbonButton } from '../RibbonButton';
import { RibbonSmallButton } from '../RibbonSmallButton';

interface MapSelectionToolbarProps {
  onToolClick: (toolId: string) => void;
}

export const MapSelectionToolbar: React.FC<MapSelectionToolbarProps> = ({ onToolClick }) => {
  return (
    <RibbonGroup label="Selection">
      
      <div className="flex flex-col gap-1">
        <RibbonSmallButton icon={<Square size={14} />} label="Select By Area" onClick={() => onToolClick('select-area')} />
        <RibbonSmallButton icon={<MousePointer2 size={14} />} label="Select By Attr" onClick={() => onToolClick('select-attr')} />
        <RibbonSmallButton icon={<Circle size={14} />} label="Clear" onClick={() => onToolClick('clear-selection')} />
      </div>
    </RibbonGroup>
  );
};
