import React from 'react';

interface RibbonSmallButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

export const RibbonSmallButton: React.FC<RibbonSmallButtonProps> = ({ 
  icon, 
  label, 
  onClick,
  disabled,
  active
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      active 
        ? "bg-primary/15 text-primary" 
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`}
  >
    <span className={`${active ? "text-primary" : "text-foreground"} shrink-0`}>{icon}</span>
    <span className="text-[10px] whitespace-nowrap">{label}</span>
  </button>
);

