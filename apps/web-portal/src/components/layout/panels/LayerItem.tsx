import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from "@workspace/ui/lib/utils";

interface LayerItemProps {
  label: string;
  active?: boolean;
  expanded?: boolean;
  children?: React.ReactNode;
  onChange?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const LayerItem: React.FC<LayerItemProps> = ({ 
  label, 
  active, 
  expanded, 
  children, 
  onChange,
  onContextMenu
}) => (
  <div className="flex flex-col" onContextMenu={onContextMenu}>
    <div className="flex items-center gap-2 group py-0.5">
      <input 
        type="checkbox" 
        checked={active} 
        className="w-3 h-3 accent-primary cursor-pointer" 
        onChange={(e) => {
          e.stopPropagation();
          onChange?.();
        }} 
      />
      <div 
        className="flex items-center gap-1.5 flex-1 cursor-pointer" 
        onClick={onChange}
      >
        {children ? (expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : <div className="w-[10px]" />}
        <span className={cn(
          "text-[11px] group-hover:text-primary transition-colors truncate", 
          active ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </span>
      </div>
    </div>
    {expanded && children}
  </div>
);
