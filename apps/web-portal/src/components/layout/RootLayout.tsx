import * as React from 'react';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup,
  type ImperativePanelHandle
} from "@workspace/ui/components/resizable";
import { Header } from './Header';
import { Ribbon } from './Ribbon';
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers,
  Database,
  Search,
  History,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { cn } from "@workspace/ui/lib/utils";

import { useLayout } from '@/context/LayoutContext';
import { useMapStore } from '@/store/useMapStore';

// Modular Components
import { PanelHeader } from './panels/PanelHeader';
import { ContentsTab } from './panels/ContentsTab';
import { CatalogTab } from './panels/CatalogTab';
import { BottomPanelTabs } from './panels/BottomPanelTabs';

interface RootLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const RootLayout: React.FC<RootLayoutProps> = ({ 
  children, 
  title = "web-portal"
}) => {
  const { panels, setCollapsed, setActiveTab } = useLayout();
  const { featureCount, issueCount } = useMapStore();
  const bottomPanelRef = React.useRef<ImperativePanelHandle>(null);

  // Imperatively expand the bottom panel when isCollapsed flips to false
  // (CSS alone can't restore a ResizablePanel that was physically collapsed)
  React.useEffect(() => {
    if (!panels.bottom.isCollapsed) {
      bottomPanelRef.current?.expand();
    } else {
      bottomPanelRef.current?.collapse();
    }
  }, [panels.bottom.isCollapsed]);


  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground font-sans">
      <Header />
      <Ribbon />
      
      <div className="flex-1 relative overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel */}
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={40} 
            collapsible 
            onCollapse={() => setCollapsed('left', true)}
            onExpand={() => setCollapsed('left', false)}
            className={cn(
              "bg-card transition-all duration-300 ease-in-out",
              panels.left.isCollapsed ? "min-w-[32px] max-w-[32px]" : ""
            )}
          >
            {panels.left.isCollapsed ? (
              <div className="flex flex-col items-center pt-4 gap-4 h-full bg-muted border-r border-border">
                <button onClick={() => setCollapsed('left', false)} className="p-1 hover:bg-accent rounded cursor-pointer transition-colors">
                  <ChevronRight size={16} />
                </button>
                <div className="vertical-text text-[10px] font-bold text-muted-foreground tracking-widest uppercase py-4 border-b border-border">Contents</div>
                <div className="vertical-text text-[10px] font-bold text-muted-foreground tracking-widest uppercase py-4">Catalog</div>
              </div>
            ) : (
              <div className="flex flex-col h-full border-r border-border">
                <PanelHeader 
                  title={panels.left.title} 
                  onClose={() => setCollapsed('left', true)} 
                  tabs={[
                    { id: 'contents', icon: <Layers size={14} />, label: 'Contents' },
                    { id: 'catalog', icon: <Database size={14} />, label: 'Catalog' }
                  ]}
                  activeTab={panels.left.activeTab}
                  onTabChange={(id) => setActiveTab('left', id)}
                />
                <div className="flex-1 overflow-auto p-4">
                  {panels.left.content ? panels.left.content : (
                    panels.left.activeTab === 'contents' ? (
                      <ContentsTab />
                    ) : (
                      <CatalogTab />
                    )
                  )}
                </div>
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50" />

          {/* Center Area (Children + Bottom Panel) */}
          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={75}>
                {children}
              </ResizablePanel>
              
              <ResizableHandle 
                withHandle 
                className={cn(
                  "bg-border/50",
                  panels.bottom.isCollapsed && "hidden"
                )} 
              />
              
              <ResizablePanel 
                ref={bottomPanelRef}
                defaultSize={40} 
                minSize={0} 
                collapsible
                onCollapse={() => setCollapsed('bottom', true)}
                onExpand={() => setCollapsed('bottom', false)}
                className="bg-card transition-all duration-300"
              >
                <div className="flex flex-col h-full border-t border-border">
                  <div className="flex-1 overflow-hidden">
                    <BottomPanelTabs />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50" />

          {/* Right Panel */}
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            collapsible 
            onCollapse={() => setCollapsed('right', true)}
            onExpand={() => setCollapsed('right', false)}
            className={cn(
              "bg-card transition-all duration-300",
              panels.right.isCollapsed ? "min-w-[32px] max-w-[32px]" : ""
            )}
          >
             {panels.right.isCollapsed ? (
              <div className="flex flex-col items-center pt-4 gap-4 h-full bg-muted border-l border-border">
                <button onClick={() => setCollapsed('right', false)} className="p-1 hover:bg-accent rounded cursor-pointer transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <div className="vertical-text text-[10px] font-bold text-muted-foreground tracking-widest uppercase py-4">Search</div>
              </div>
            ) : (
              <div className="flex flex-col h-full border-l border-border">
                <PanelHeader title={panels.right.title} onClose={() => setCollapsed('right', true)} />
                {panels.right.content ? panels.right.content : (
                  <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded text-[11px] text-primary">
                      Select a feature on the map to view and edit its attributes.
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Search Portal</span>
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          type="text" 
                          placeholder="Search layers..." 
                          className="w-full text-xs py-1.5 pl-8 pr-2 border border-border bg-background rounded focus:ring-1 focus:ring-primary outline-none text-foreground transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-3 text-[10px] z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><FileText size={10} /> Ready</span>
          <span className="opacity-70">|</span>
          <span>Features: {featureCount}</span>
          <span className="opacity-70">|</span>
          <span>Issues: {issueCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hover:underline cursor-pointer">English (United States)</span>
          <span className="opacity-70">|</span>
          <span className="bg-primary-foreground/20 px-1 rounded">V4.1.18-BETA</span>
        </div>
      </div>

      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
};
