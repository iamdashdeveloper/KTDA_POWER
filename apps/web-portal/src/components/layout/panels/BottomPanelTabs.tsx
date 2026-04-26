import * as React from 'react';
import { useAttributeTableStore } from '@/store/useAttributeTableStore';
import { useLayout } from '@/context/LayoutContext';
import { ProjectDataTable } from './ProjectDataTable';
import { cn } from "@workspace/ui/lib/utils";
import { X, Table as TableIcon, BarChart2 } from 'lucide-react';

export const BottomPanelTabs: React.FC = () => {
  const { openTables, activeTableId, removeTable, setActiveTable } = useAttributeTableStore();
  const { panels, setCollapsed } = useLayout();
  const [activeCustomTab, setActiveCustomTab] = React.useState<string | null>(null);
  const [customTabs, setCustomTabs] = React.useState<Array<{ id: string; title: string; content: React.ReactNode }>>([]);

  // Watch for injected content in panels.bottom.content
  React.useEffect(() => {
    if (panels.bottom.content) {
      const tabId = 'bottom-content';
      const tabTitle = panels.bottom.title || 'Analysis';
      
      // Update custom tabs if different
      setCustomTabs(prev => {
        if (prev.length === 1 && prev[0].content === panels.bottom.content) return prev;
        return [{ id: tabId, title: tabTitle, content: panels.bottom.content }];
      });
      
      setActiveCustomTab(tabId);
      
      // Clear active table tab so the chart shows by default
      if (activeTableId !== '') {
        setActiveTable('');
      }
    }
  }, [panels.bottom.content, panels.bottom.title, activeTableId, setActiveTable]);

  // If all tables and custom tabs are closed, collapse the bottom panel
  React.useEffect(() => {
    if (!panels.bottom.isCollapsed && openTables.length === 0 && customTabs.length === 0) {
      setCollapsed('bottom', true);
    }
  }, [openTables.length, customTabs.length, panels.bottom.isCollapsed, setCollapsed]);

  const hasContent = openTables.length > 0 || customTabs.length > 0;

  if (!hasContent) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
        No active panels.
      </div>
    );
  }

  // Determine what to show in the body
  const isCustomActive = activeCustomTab !== null && customTabs.some(t => t.id === activeCustomTab);
  const activeCustomContent = customTabs.find(t => t.id === activeCustomTab)?.content;
  const activeTable = openTables.find(t => t.id === activeTableId) || openTables[0];

  const handleTableTabClick = (id: string) => {
    setActiveTable(id);
    setActiveCustomTab(null);
  };

  const handleCustomTabClick = (id: string) => {
    setActiveCustomTab(id);
    setActiveTable('');
  };

  const removeCustomTab = (id: string) => {
    setCustomTabs(prev => prev.filter(t => t.id !== id));
    if (activeCustomTab === id) {
      setActiveCustomTab(null);
      // Fall back to first table if any
      if (openTables.length > 0) setActiveTable(openTables[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tab Header — custom tabs + table tabs side by side */}
      <div className="flex items-center bg-muted border-b border-border h-8 overflow-x-auto no-scrollbar">

        {/* Custom content tabs (e.g. Elevation Profile) */}
        {customTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleCustomTabClick(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 h-full cursor-pointer border-r border-border min-w-[140px] max-w-[220px] transition-colors relative group",
              activeCustomTab === tab.id
                ? "bg-card border-b-2 border-b-primary"
                : "hover:bg-accent/50"
            )}
          >
            <BarChart2 size={12} className={cn(activeCustomTab === tab.id ? "text-primary" : "text-muted-foreground")} />
            <span className={cn(
              "text-[11px] truncate select-none",
              activeCustomTab === tab.id ? "font-bold text-foreground" : "text-muted-foreground"
            )}>
              {tab.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeCustomTab(tab.id); }}
              className="ml-auto p-0.5 rounded-sm hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* Separator if both types exist */}
        {customTabs.length > 0 && openTables.length > 0 && (
          <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />
        )}

        {/* Attribute table tabs */}
        {openTables.map((table) => (
          <div
            key={table.id}
            onClick={() => handleTableTabClick(table.id)}
            className={cn(
              "flex items-center gap-2 px-3 h-full cursor-pointer border-r border-border min-w-[120px] max-w-[200px] transition-colors relative group",
              !isCustomActive && activeTableId === table.id
                ? "bg-card border-b-2 border-b-primary"
                : "hover:bg-accent/50"
            )}
          >
            <TableIcon size={12} className={cn(!isCustomActive && activeTableId === table.id ? "text-primary" : "text-muted-foreground")} />
            <span className={cn(
              "text-[11px] truncate select-none",
              !isCustomActive && activeTableId === table.id ? "font-bold text-foreground" : "text-muted-foreground"
            )}>
              {table.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeTable(table.id); }}
              className="ml-auto p-0.5 rounded-sm hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-hidden relative">
        {isCustomActive && activeCustomContent ? (
          <div className="h-full overflow-hidden">
            {activeCustomContent}
          </div>
        ) : activeTable ? (
          <ProjectDataTable
            key={activeTable.id}
            layerId={activeTable.id}
            layerName={activeTable.name}
          />
        ) : null}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
