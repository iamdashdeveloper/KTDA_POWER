import React from 'react';

interface CoordinateBarProps {
  resolution: number;
}

export const CoordinateBar: React.FC<CoordinateBarProps> = ({ resolution }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-6 bg-card/80 backdrop-blur border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground z-20">
      <div className="flex items-center gap-4">
        <div id="mouse-position" className="min-w-[120px] font-mono"></div>
        <span className="opacity-50">|</span>
        <span>Elev: ---</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium">Scale: 1:{Math.round(resolution * 1000000) || '---'}</span>
        <span className="opacity-50">|</span>
        <span>WGS 1984</span>
      </div>
    </div>
  );
};
