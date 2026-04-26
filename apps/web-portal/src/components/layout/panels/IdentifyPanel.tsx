import React, { useState } from 'react';
import { cn } from "@workspace/ui/lib/utils";
import { ApiClient } from '@/lib/api';
import { 
  MapPin, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Tag,
  Hash,
  Send,
  Loader2
} from "lucide-react";

interface IdentifyPanelProps {
  data: any;
  type: 'feature' | 'issue';
}

export const IdentifyPanel: React.FC<IdentifyPanelProps> = ({ data: initialData, type }) => {
  const [data, setData] = useState(initialData);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN': return 'bg-blue-500/20 text-blue-600 border-blue-500/20';
      case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/20';
      case 'RESOLVED': return 'bg-green-500/20 text-green-600 border-green-500/20';
      case 'CLOSED': return 'bg-gray-500/20 text-gray-600 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || type !== 'issue') return;

    try {
      setIsSubmitting(true);
      await ApiClient.post(`/issues/${data.id}/updates`, {
        content: newNote,
      });

      // Update local state to show the new note immediately
      const newUpdate = {
        id: `temp-${Date.now()}`,
        content: newNote,
        createdAt: new Date().toISOString(),
      };
      
      setData({
        ...data,
        updates: [newUpdate, ...(data.updates || [])]
      });
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const images = data.images || [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-5 pb-8 flex flex-col gap-6 custom-scrollbar">
        {/* Header Info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground leading-tight">
              {data.title || data.name || 'Unnamed Object'}
            </h2>
            {type === 'issue' && (
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase shrink-0", getStatusColor(data.status))}>
                {data.status}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hash size={10} />
              <span>{data.id?.substring(0, 8)}</span>
            </div>
            {data.createdAt && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>{formatDate(data.createdAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="relative group aspect-video rounded-lg overflow-hidden bg-muted border border-border">
              <img
                src={images[currentImageIndex]}
                alt="Feature detail"
                className="w-full h-full object-cover"
              />
              
              {images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
                    className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
                    className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          </div>
        )}

        {/* Add Note Section (Issues only) */}
        {type === 'issue' && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add Field Note</h3>
            <div className="relative">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type your observations..."
                className="w-full text-xs p-2 pr-10 border border-border bg-background rounded min-h-[60px] outline-none focus:ring-1 focus:ring-primary resize-none"
                disabled={isSubmitting}
              />
              <button 
                onClick={handleAddNote}
                disabled={isSubmitting || !newNote.trim()}
                className="absolute right-2 bottom-2 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </div>
        )}

        {/* Updates Timeline (Issues only) */}
        {type === 'issue' && data.updates && data.updates.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Clock size={10} />
              Updates & Notes
            </h3>
            <div className="flex flex-col gap-2">
              {data.updates.map((update: any) => (
                <div key={update.id} className="p-2 rounded border border-border/50 bg-muted/20 text-[11px]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[9px] text-primary uppercase">
                      {update.statusChange ? `Status: ${update.statusChange}` : 'Note'}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{formatDate(update.createdAt)}</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{update.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata section */}
        {data.metadata && Object.keys(data.metadata).length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Hash size={10} />
              Metadata
            </h3>
            <div className="grid grid-cols-1 gap-2 bg-muted/30 p-3 rounded-lg border border-border/50">
              {Object.entries(data.metadata).map(([key, value]) => (
                <div key={key} className="flex flex-col border-b border-border/20 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-[11px] font-medium break-all">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attributes Section */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Tag size={10} />
            Attributes
          </h3>
          
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(data)
              .filter(([key, val]) => 
                key !== 'geometry' && 
                key !== 'location' && 
                key !== 'images' && 
                key !== 'updates' &&
                key !== 'metadata' &&
                key !== 'id' &&
                key !== 'title' &&
                key !== 'name' &&
                key !== 'status' &&
                key !== 'createdAt' &&
                val !== null && 
                val !== undefined &&
                typeof val !== 'object'
              )
              .map(([key, value]) => (
                <div key={key} className="flex flex-col border-b border-border/30 pb-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-[11px] font-medium truncate">
                    {String(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Geographic Context Panel */}
        {(data.location || data.metadata?.latitude) && (
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex flex-col gap-2 mt-auto">
             <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase">
                <MapPin size={12} />
                Geographic Context
             </div>
             {(data.metadata?.latitude || data.location?.latitude) && (
               <div className="text-[11px] font-mono text-foreground flex flex-col">
                  <span>Lat: {Number(data.metadata?.latitude || data.location?.latitude).toFixed(6)}</span>
                  <span>Lon: {Number(data.metadata?.longitude || data.location?.longitude).toFixed(6)}</span>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-muted border-t border-border flex gap-2 shrink-0">
        <button className="flex-1 py-1.5 px-3 bg-card hover:bg-accent rounded text-[11px] font-medium transition-colors border border-border">
          Create Report
        </button>
        <button className="flex-1 py-1.5 px-3 bg-primary text-primary-foreground rounded text-[11px] font-medium transition-colors">
          Edit Attributes
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
};
