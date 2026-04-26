import React from 'react';
import { X } from 'lucide-react';
import { cn } from "@workspace/ui/lib/utils";

interface PanelHeaderProps {
  title: string;
  onClose: () => void;
  tabs?: { id: string; icon: React.ReactNode; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ 
  title, 
  onClose, 
  tabs, 
  activeTab, 
  onTabChange 
}) => (
  <div className="flex flex-col border-b border-border">
    <div className="h-8 bg-muted flex items-center justify-between px-3">
      <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">{title}</span>
      <button onClick={onClose} className="hover:bg-accent p-0.5 rounded transition-colors cursor-pointer">
        <X size={14} className="text-muted-foreground" />
      </button>
    </div>
    {tabs && (
      <div className="flex px-1 bg-card border-b border-border/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium border-b-2 transition-colors cursor-pointer",
              activeTab === tab.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-accent"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    )}
  </div>
);
