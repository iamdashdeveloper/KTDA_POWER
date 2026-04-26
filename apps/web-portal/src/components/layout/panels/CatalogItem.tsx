import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CatalogItemProps {
  label: string;
  expanded?: boolean;
  children?: React.ReactNode;
}

export const CatalogItem: React.FC<CatalogItemProps> = ({ label, expanded, children }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-2 group py-0.5 cursor-pointer">
      {expanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
      <span className="text-[11px] group-hover:text-primary text-foreground transition-colors">{label}</span>
    </div>
    {expanded && children}
  </div>
);
