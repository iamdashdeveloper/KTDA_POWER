import React from 'react';
import { Pointer, Maximize } from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';
import { RibbonSmallButton } from '../RibbonSmallButton';

// Modular Tools
import { ZoomToHome } from '../tools/navigation/ZoomToHome';
import { ZoomToLocation } from '../tools/navigation/ZoomToLocation';
import { ResetNorth } from '../tools/navigation/ResetNorth';
import { ZoomBox } from '../tools/navigation/ZoomBox';

interface MapNavigateToolbarProps {
  activeTool: string | null;
  onToolClick: (toolId: string) => void;
}

export const MapNavigateToolbar: React.FC<MapNavigateToolbarProps> = ({ 
  activeTool, 
  onToolClick 
}) => {
  return (
    <RibbonGroup label="Navigate">
      <RibbonButton 
        icon={<Pointer size={24} />} 
        label="Explore" 
        active={activeTool === 'explore'} 
        onClick={() => onToolClick('explore')} 
      />
      
      <div className="flex items-center gap-3 border-l border-border/50 pl-3 ml-1">
        <div className="flex flex-col gap-1">
          <ZoomToHome onClick={onToolClick} />
          <ZoomToLocation onClick={onToolClick} />
        </div>

        <div className="flex flex-col gap-1">
          <ResetNorth onClick={onToolClick} />
          <ZoomBox onClick={onToolClick} />
        </div>

        <div className="flex flex-col gap-1">
          <RibbonSmallButton icon={<Maximize size={14} />} label="Full Extent" onClick={() => onToolClick('full-extent')} />
        </div>
      </div>
    </RibbonGroup>
  );
};
