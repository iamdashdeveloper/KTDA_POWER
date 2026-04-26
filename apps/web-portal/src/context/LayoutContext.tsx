import React, { createContext, useContext, useState, type ReactNode } from 'react';

type PanelSide = 'left' | 'right' | 'bottom';

interface PanelState {
  content: ReactNode | null;
  title: string;
  isCollapsed: boolean;
  activeTab?: string;
}

interface LayoutContextType {
  panels: Record<PanelSide, PanelState>;
  openPanel: (side: PanelSide, content: ReactNode, title?: string) => void;
  closePanel: (side: PanelSide) => void;
  setCollapsed: (side: PanelSide, collapsed: boolean) => void;
  setActiveTab: (side: PanelSide, tabId: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [panels, setPanels] = useState<Record<PanelSide, PanelState>>({
    left: { content: null, title: 'Contents', isCollapsed: false, activeTab: 'contents' },
    right: { content: null, title: 'Attributes', isCollapsed: true },
    bottom: { content: null, title: 'Attribute Table', isCollapsed: true },
  });

  const openPanel = (side: PanelSide, content: ReactNode, title?: string) => {
    setPanels(prev => ({
      ...prev,
      [side]: {
        ...prev[side],
        content,
        title: title || prev[side].title,
        isCollapsed: false,
      }
    }));
  };

  const closePanel = (side: PanelSide) => {
    setPanels(prev => ({
      ...prev,
      [side]: { ...prev[side], isCollapsed: true }
    }));
  };

  const setCollapsed = (side: PanelSide, collapsed: boolean) => {
    setPanels(prev => {
      if (prev[side].isCollapsed === collapsed) return prev;
      return {
        ...prev,
        [side]: { ...prev[side], isCollapsed: collapsed }
      };
    });
  };

  const setActiveTab = (side: PanelSide, tabId: string) => {
    setPanels(prev => ({
      ...prev,
      [side]: { ...prev[side], activeTab: tabId }
    }));
  };

  return (
    <LayoutContext.Provider value={{ panels, openPanel, closePanel, setCollapsed, setActiveTab }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
