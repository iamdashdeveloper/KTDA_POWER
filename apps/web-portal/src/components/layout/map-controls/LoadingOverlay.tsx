import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message = "Synchronizing Map Layers" }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] z-50">
      <div className="flex flex-col items-center gap-3 bg-card border border-border p-6 rounded-xl shadow-2xl">
        <Loader2 size={32} className="text-primary animate-spin" />
        <div className="flex flex-col items-center">
           <span className="text-sm font-bold tracking-tight">{message}</span>
           <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 animate-pulse">Downloading Assets...</span>
        </div>
      </div>
    </div>
  );
};
