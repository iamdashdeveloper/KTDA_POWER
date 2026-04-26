import React from 'react';

interface RibbonGroupProps {
  label: string;
  children: React.ReactNode;
}

export const RibbonGroup: React.FC<RibbonGroupProps> = ({ label, children }) => (
  <div className="flex flex-col h-full items-center justify-between py-1 border-r border-border/50 pr-4 last:border-0 shrink-0">
    <div className="flex items-center gap-3 flex-1">
      {children}
    </div>
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{label}</span>
  </div>
);
