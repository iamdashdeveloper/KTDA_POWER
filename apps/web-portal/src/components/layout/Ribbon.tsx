import React, { useState } from 'react';
import { 
  Map as MapIcon, 
  PlusCircle, 
  BarChart3, 
  View, 
  Edit3, 
  Share2, 
  Info
} from 'lucide-react';
import { cn } from "@workspace/ui/lib/utils";
import { useNavigate } from 'react-router-dom';
import { useLayout } from '@/context/LayoutContext';
import { useMapStore } from '@/store/useMapStore';
import { AddLayerModal } from '../modals/AddLayerModal';

// Modular Ribbon Components
import { RibbonSeparator } from './ribbon/RibbonSeparator';
import { MapClipboardToolbar } from './ribbon/toolbars/MapClipboardToolbar';
import { MapNavigateToolbar } from './ribbon/toolbars/MapNavigateToolbar';
import { MapLayerToolbar } from './ribbon/toolbars/MapLayerToolbar';
import { MapSelectionToolbar } from './ribbon/toolbars/MapSelectionToolbar';
import { MapInquiryToolbar } from './ribbon/toolbars/MapInquiryToolbar';
import { AnalysisToolbar } from './ribbon/toolbars/AnalysisToolbar';

interface RibbonProps {
  onToolAction?: (toolId: string) => void;
}

const TABS = [
  { id: 'projects', label: 'Projects', icon: <PlusCircle size={16} /> },
  { id: 'map', label: 'Map', icon: <MapIcon size={16} /> },
  { id: 'analysis', label: 'Analysis', icon: <BarChart3 size={16} /> },
  { id: 'view', label: 'View', icon: <View size={16} /> },
  { id: 'tasks', label: 'Tasks', icon: <Edit3 size={16} /> },
  { id: 'share', label: 'Share', icon: <Share2 size={16} /> },
  { id: 'help', label: 'Help', icon: <Info size={16} /> },
];

export const Ribbon: React.FC<RibbonProps> = ({ onToolAction }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('map');
  const { openPanel, setCollapsed } = useLayout();
  const { activeTool, setActiveTool, executeCommand } = useMapStore();
  const [isAddLayerOpen, setIsAddLayerOpen] = useState(false);

  const handleTabClick = (tabId: string) => {
    if (tabId === 'projects') {
      navigate('/projects');
    } else {
      setActiveTab(tabId);
    }
  };

  const handleToolClick = (toolId: string) => {
    onToolAction?.(toolId);

    // Command-based tools (MapCanvas handles these via store subscription)
    const mapCommands = ['zoom-home', 'zoom-to-location', 'reset-north', 'full-extent', 'clear-measurements'];
    if (mapCommands.includes(toolId)) {
      executeCommand(toolId);
      return;
    }

    switch (toolId) {
      case 'add-data':
        setIsAddLayerOpen(true);
        break;
      case 'identify':
        setActiveTool('identify');
        // The MapCanvas handles the actual identification logic and opens the panel
        // but we can ensure the panel is visible here
        setCollapsed('right', false);
        break;
      case 'explore':
        setActiveTool('explore');
        break;
      case 'zoom-box':
        setActiveTool('zoom-box');
        break;
      case 'measure-distance':
        setActiveTool('measure-distance');
        break;
      case 'measure-area':
        setActiveTool('measure-area');
        break;
      case 'select':
        setActiveTool('select');
        break;
      case 'layer-properties':
        openPanel('right', (
          <div className="flex flex-col gap-4 text-foreground">
             <div className="text-xs font-semibold">Layer Settings</div>
             <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px]">
                   <span>Transparency</span>
                   <input type="range" className="w-24 accent-primary" />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <span>Visibility Range</span>
                   <span className="text-[10px] text-muted-foreground">0 - 50,000</span>
                </div>
             </div>
          </div>
        ), 'Layer Properties');
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col bg-card border-b border-border select-none shrink-0">
      {/* Tab Headers */}
      <div className="flex items-end px-2 pt-1 gap-1 bg-muted">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "px-4 py-1 text-xs font-medium transition-colors border-t-2 border-transparent cursor-pointer",
              activeTab === tab.id 
                ? "bg-card border-t-primary text-primary shadow-[0_-2px_5px_rgba(0,0,0,0.05)]" 
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {React.cloneElement(tab.icon as React.ReactElement<any>, { size: 12 })}
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* Ribbon Content */}
      <div className="h-24 bg-card flex items-center px-4 gap-0 overflow-x-auto text-foreground custom-scrollbar">
        {activeTab === 'map' && (
          <div className="flex items-center h-full">
            <MapClipboardToolbar onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapNavigateToolbar activeTool={activeTool} onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapLayerToolbar onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapSelectionToolbar onToolClick={handleToolClick} />
            <RibbonSeparator />
            <MapInquiryToolbar activeTool={activeTool} onToolClick={handleToolClick} />
          </div>
        )}

        {activeTab === 'analysis' && (
          <AnalysisToolbar onToolClick={handleToolClick} />
        )}

        {activeTab !== 'map' && activeTab !== 'analysis' && (
          <div className="flex items-center justify-center w-full text-muted-foreground italic text-sm">
             {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tools coming soon...
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
      `}</style>
      {/* Modals */}
      <AddLayerModal open={isAddLayerOpen} onOpenChange={setIsAddLayerOpen} />
    </div>
  );
};
