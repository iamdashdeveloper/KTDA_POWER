import React, { useEffect, useRef } from 'react';
import { cn } from "@workspace/ui/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position if it goes off screen
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 32));

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-card border border-border rounded shadow-xl py-1 animate-in fade-in zoom-in duration-100"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors cursor-pointer",
            item.variant === 'danger' 
              ? "text-destructive hover:bg-destructive/10" 
              : "text-foreground hover:bg-accent"
          )}
        >
          {item.icon && <span className="opacity-70">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
