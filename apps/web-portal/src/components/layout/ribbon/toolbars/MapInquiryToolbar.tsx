import React from 'react';
import { Search, Info, Ruler, Square, Trash2 } from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';

interface MapInquiryToolbarProps {
  activeTool: string | null;
  onToolClick: (toolId: string) => void;
}

import { RibbonSmallButton } from '../RibbonSmallButton';

export const MapInquiryToolbar: React.FC<MapInquiryToolbarProps> = ({ 
  activeTool, 
  onToolClick 
}) => {
  return (
    <RibbonGroup label="Inquiry">
      <RibbonButton icon={<Search size={24} />} label="Locate" onClick={() => onToolClick('locate')} />
      <RibbonButton 
        icon={<Info size={24} />} 
        label="Identify" 
        active={activeTool === 'identify'}
        onClick={() => onToolClick('identify')} 
      />

      <div className="flex items-center gap-3 border-l border-border/50 pl-3 ml-1">
        <div className="flex flex-col gap-1 justify-center">
          <RibbonSmallButton 
            icon={<Ruler size={14} />} 
            label="Distance" 
            onClick={() => onToolClick('measure-distance')} 
          />
          <RibbonSmallButton 
            icon={<Square size={14} />} 
            label="Area" 
            onClick={() => onToolClick('measure-area')} 
          />
          <RibbonSmallButton 
            icon={<Trash2 size={14} />} 
            label="Clear" 
            onClick={() => onToolClick('clear-measurements')} 
          />
        </div>
      </div>
    </RibbonGroup>
  );
};
