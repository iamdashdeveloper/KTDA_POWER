import * as React from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Header } from "./Header"
import { Ribbon } from "./Ribbon"
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  FileText,
  Box,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

import { useLayout } from "@/context/LayoutContext"
import { useMapStore } from "@/store/useMapStore"
import { useHydroModelStore } from "@/store/useHydroModelStore"
import { useProjectStore } from "@/store/useProjectStore"

// Modular Components
import { PanelHeader } from "./panels/PanelHeader"
import { ContentsTab } from "./panels/ContentsTab"
import { BottomPanelTabs } from "./panels/BottomPanelTabs"
import { HydroModelTab } from "./panels/HydroModelTab"
import { WeatherPanel } from "./panels/WeatherPanel"

interface RootLayoutProps {
  children: React.ReactNode
  title?: string
}

export const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  const { panels, setCollapsed } = useLayout()
  const {
    featureCount,
    issueCount,
    weatherPanelOpen,
    setWeatherPanelOpen,
    viewCenter,
  } = useMapStore()
  const { tabs: hydroModelTabs, clearAll } = useHydroModelStore()
  const { activeProject } = useProjectStore()
  const [activeTabId, setActiveTabId] = React.useState<string>("contents")
  const bottomPanelRef = React.useRef<any>(null)

  // Extract project coordinates with fallback to map center
  const getWeatherCoordinates = () => {
    if (
      activeProject?.location &&
      typeof activeProject.location === "object" &&
      "latitude" in activeProject.location &&
      "longitude" in activeProject.location
    ) {
      return {
        latitude: activeProject.location.latitude,
        longitude: activeProject.location.longitude,
      }
    }
    // Fallback to map center if project location is not available
    return {
      latitude: viewCenter[1],
      longitude: viewCenter[0],
    }
  }

  const weatherCoords = getWeatherCoordinates()

  // Build combined tabs array
  const headerTabs = React.useMemo(() => {
    console.log(
      "[RootLayout] Building headerTabs, hydroModelTabs:",
      hydroModelTabs
    )
    const baseTabs = [
      {
        id: "contents",
        icon: <Layers size={14} />,
        label: "Contents",
      },
      ...hydroModelTabs.map((tab) => ({
        id: tab.modelId,
        icon: <Box size={14} />,
        label: tab.name || `Model ${tab.modelId.slice(0, 8)}`,
      })),
    ]

    console.log("[RootLayout] headerTabs built:", baseTabs)
    return baseTabs
  }, [hydroModelTabs])

  // Auto-activate newly added tabs
  React.useEffect(() => {
    console.log("[RootLayout] Auto-activate effect triggered:", {
      hydroModelTabsCount: hydroModelTabs.length,
      activeTabId,
      tabs: hydroModelTabs,
    })
    if (hydroModelTabs.length > 0) {
      // If the currently active tab is not in the list, switch to the last added tab
      const activeTabExists = hydroModelTabs.some(
        (tab) => tab.modelId === activeTabId
      )
      console.log("[RootLayout] Active tab exists:", activeTabExists)
      if (!activeTabExists && activeTabId !== "contents") {
        // Switch to the most recently added tab (last one)
        const lastTab = hydroModelTabs[hydroModelTabs.length - 1]
        console.log("[RootLayout] Switching to last tab:", lastTab)
        setActiveTabId(lastTab.modelId)
      }
    }
  }, [hydroModelTabs, activeTabId])

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    console.log("[RootLayout] Tab changed to:", tabId)
    setActiveTabId(tabId)
  }

  // Imperatively expand the bottom panel when isCollapsed flips to false
  // (CSS alone can't restore a ResizablePanel that was physically collapsed)
  React.useEffect(() => {
    if (!panels.bottom.isCollapsed) {
      bottomPanelRef.current?.expand()
    } else {
      bottomPanelRef.current?.collapse()
    }
  }, [panels.bottom.isCollapsed])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground">
      <Header />
      <Ribbon />

      <div className="relative flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={40}
            collapsible
            onCollapse={() => setCollapsed("left", true)}
            onExpand={() => setCollapsed("left", false)}
            className={cn(
              "bg-card transition-all duration-300 ease-in-out",
              panels.left.isCollapsed ? "max-w-[32px] min-w-[32px]" : ""
            )}
          >
            {panels.left.isCollapsed ? (
              <div className="flex h-full flex-col items-center gap-4 border-r border-border bg-muted pt-4">
                <button
                  onClick={() => setCollapsed("left", false)}
                  className="cursor-pointer rounded p-1 transition-colors hover:bg-accent"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="vertical-text border-b border-border py-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Contents
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col border-r border-border">
                <PanelHeader
                  title={panels.left.title}
                  onClose={() => setCollapsed("left", true)}
                  tabs={headerTabs}
                  activeTab={activeTabId}
                  onTabChange={handleTabChange}
                  onClearHydroTabs={() => {
                    clearAll()
                    setActiveTabId("contents")
                  }}
                  hasHydroTabs={hydroModelTabs.length > 0}
                />

                <div className="flex-1 overflow-auto p-4">
                  {activeTabId === "contents" ? (
                    panels.left.content ? (
                      panels.left.content
                    ) : (
                      <ContentsTab />
                    )
                  ) : (
                    <HydroModelTab modelId={activeTabId} />
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
                {weatherPanelOpen ? (
                  <div className="flex h-full w-full flex-col bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <h2 className="text-sm font-semibold text-foreground">
                        Weather Station
                      </h2>
                      <button
                        onClick={() => {
                          setWeatherPanelOpen(false)
                        }}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <WeatherPanel
                        stationName={activeProject?.name || "Weather Station"}
                        latitude={weatherCoords.latitude}
                        longitude={weatherCoords.longitude}
                      />
                    </div>
                  </div>
                ) : (
                  children
                )}
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
                onCollapse={() => setCollapsed("bottom", true)}
                onExpand={() => setCollapsed("bottom", false)}
                className="bg-card transition-all duration-300"
              >
                <div className="flex h-full flex-col border-t border-border">
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
            onCollapse={() => setCollapsed("right", true)}
            onExpand={() => setCollapsed("right", false)}
            className={cn(
              "bg-card transition-all duration-300",
              panels.right.isCollapsed ? "max-w-[32px] min-w-[32px]" : ""
            )}
          >
            {panels.right.isCollapsed ? (
              <div className="flex h-full flex-col items-center gap-4 border-l border-border bg-muted pt-4">
                <button
                  onClick={() => setCollapsed("right", false)}
                  className="cursor-pointer rounded p-1 transition-colors hover:bg-accent"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="vertical-text py-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Search
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col border-l border-border">
                <PanelHeader
                  title={panels.right.title}
                  onClose={() => setCollapsed("right", true)}
                />
                {panels.right.content ? (
                  panels.right.content
                ) : (
                  <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
                    <div className="rounded border border-primary/20 bg-primary/10 p-3 text-[11px] text-primary">
                      Select a feature on the map to view and edit its
                      attributes.
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        Search Portal
                      </span>
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="text"
                          placeholder="Search layers..."
                          className="w-full rounded border border-border bg-background py-1.5 pr-2 pl-8 text-xs text-foreground transition-all outline-none focus:ring-1 focus:ring-primary"
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
      <div className="z-50 flex h-6 items-center justify-between bg-primary px-3 text-[10px] text-primary-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <FileText size={10} /> Ready
          </span>
          <span className="opacity-70">|</span>
          <span>Features: {featureCount}</span>
          <span className="opacity-70">|</span>
          <span>Issues: {issueCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="cursor-pointer hover:underline">
            English (United States)
          </span>
          <span className="opacity-70">|</span>
          <span className="rounded bg-primary-foreground/20 px-1">
            V4.1.18-BETA
          </span>
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
  )
}
