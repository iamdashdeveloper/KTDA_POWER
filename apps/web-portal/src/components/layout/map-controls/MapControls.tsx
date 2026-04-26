import React from 'react';
import { Maximize2, MousePointer2, Layers } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullExtent: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onZoomIn, onZoomOut, onFullExtent }) => {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
      <div className="bg-card/90 backdrop-blur shadow-lg border border-border rounded p-1 flex flex-col gap-1">
        <ControlButton icon={<Maximize2 size={16} />} title="Full Extent" onClick={onFullExtent} />
        <ControlButton icon={<MousePointer2 size={16} />} title="Select" />
        <div className="h-[1px] bg-border my-1" />
        <ControlButton icon={<Layers size={16} />} title="Basemaps" />
      </div>
      
      <div className="bg-card/90 backdrop-blur shadow-lg border border-border rounded p-1 flex flex-col gap-1">
        <div 
          onClick={onZoomIn}
          className="w-8 h-8 flex items-center justify-center text-sm font-bold border-b border-border/50 text-foreground cursor-pointer hover:bg-accent rounded-t transition-colors"
        >
          +
        </div>
        <div 
          onClick={onZoomOut}
          className="w-8 h-8 flex items-center justify-center text-sm font-bold text-foreground cursor-pointer hover:bg-accent rounded-b transition-colors"
        >
          -
        </div>
      </div>
    </div>
  );
};

const ControlButton: React.FC<{ icon: React.ReactNode; title: string; onClick?: () => void }> = ({ icon, title, onClick }) => (
  <button 
    title={title}
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-foreground transition-colors cursor-pointer"
  >
    {icon}
  </button>
);
