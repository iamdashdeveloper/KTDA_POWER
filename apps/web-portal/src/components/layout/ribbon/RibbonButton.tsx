import React from 'react';
import { cn } from "@workspace/ui/lib/utils";

interface RibbonButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const RibbonButton: React.FC<RibbonButtonProps> = ({ 
  icon, 
  label, 
  active, 
  onClick,
  disabled 
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex flex-col items-center justify-center min-w-[56px] h-full rounded px-2 transition-all hover:bg-primary/10 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
      active ? "bg-primary/20 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"
    )}
  >
    <div className="mb-1 group-hover:scale-110 transition-transform text-foreground">
      {icon}
    </div>
    <span className="text-[11px] leading-tight text-center whitespace-nowrap">{label}</span>
  </button>
);
