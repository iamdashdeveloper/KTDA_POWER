import React, { useState, useEffect, useRef } from "react"
import { useMapStore } from "@/store/useMapStore"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
// Badge not available in workspace UI — using styled spans instead
import { Separator } from "@workspace/ui/components/separator"
import { 
  TbPlayerPlay, 
  TbPlayerPause, 
  TbPlayerStop, 
  TbPlayerSkipBack, 
  TbPlayerSkipForward,
  TbHistory,
  TbCalendarTime,
  TbRefresh
} from "react-icons/tb"
import { ApiClient } from "@/lib/api"
import { cn } from "@workspace/ui/lib/utils"

export const TimeAnimationPanel: React.FC = () => {
  const { 
    animationConfig, 
    setAnimationConfig, 
    dynamicWorldConfig,
    setLayerVisibility
  } = useMapStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch Timeline Frames
  const loadTimeline = async () => {
    setIsLoading(true)
    try {
      const { startDate, endDate } = dynamicWorldConfig
      const res = await ApiClient.get<{ frames: { date: string; tileUrl: string }[] }>(`/gee/dynamic-world/timeline?startDate=${startDate}&endDate=${endDate}`)
      if (res.frames) {
        setAnimationConfig({ 
          frames: res.frames, 
          currentFrameIndex: 0,
          active: true 
        })
        // Hide standard layers to avoid overlap
        setLayerVisibility("dynamicworld", false)
      }
    } catch (err) {
      console.error("[Animation] Failed to load timeline:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Playback Logic
  useEffect(() => {
    if (animationConfig.playing && animationConfig.frames.length > 0) {
      const interval = animationConfig.speed === "slow" ? 2000 : animationConfig.speed === "medium" ? 800 : 300
      
      timerRef.current = setInterval(() => {
        setAnimationConfig({
          currentFrameIndex: (animationConfig.currentFrameIndex + 1) % animationConfig.frames.length
        })
      }, interval)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [animationConfig.playing, animationConfig.frames.length, animationConfig.speed, animationConfig.currentFrameIndex])

  const togglePlay = () => setAnimationConfig({ playing: !animationConfig.playing })
  const stop = () => setAnimationConfig({ playing: false, currentFrameIndex: 0 })
  
  const currentFrame = animationConfig.frames[animationConfig.currentFrameIndex]

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border/50 bg-accent/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <TbHistory className="text-primary" />
            Time Animation
          </h2>
          <span className="text-[9px] font-mono uppercase border border-border rounded px-2 py-0.5">
            Dynamic World
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Animate temporal changes using Sentinel-2 near real-time land cover.
        </p>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Load/Source Section */}
        {!animationConfig.active || animationConfig.frames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TbCalendarTime size={24} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold">Initialize Timeline</h3>
              <p className="text-[10px] text-muted-foreground max-w-[200px]">
                Fetch frames for the period: <br/>
                <span className="font-mono text-primary">{dynamicWorldConfig.startDate}</span> to <span className="font-mono text-primary">{dynamicWorldConfig.endDate}</span>
              </p>
            </div>
            <Button 
              size="sm" 
              className="h-8 text-[11px] font-bold"
              onClick={loadTimeline}
              disabled={isLoading}
            >
              {isLoading ? <TbRefresh className="animate-spin mr-2" /> : <TbPlayerPlay className="mr-2" />}
              Generate Animation
            </Button>
          </div>
        ) : (
          <>
            {/* Display / Monitor */}
            <div className="rounded-xl border border-border/40 bg-accent/5 p-4 space-y-4 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-20">
                 <TbHistory size={40} />
               </div>
               
               <div className="space-y-1 relative">
                 <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-tighter">Current Date</Label>
                 <div className="text-2xl font-mono font-black tracking-tight text-primary">
                   {currentFrame?.date || "YYYY-MM-DD"}
                 </div>
               </div>

               <div className="flex items-center justify-between relative">
                 <span className="text-[9px] font-mono bg-accent rounded px-2 py-0.5">
                   Frame {animationConfig.currentFrameIndex + 1} / {animationConfig.frames.length}
                 </span>
                 <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAnimationConfig({ currentFrameIndex: Math.max(0, animationConfig.currentFrameIndex - 1) })}>
                      <TbPlayerSkipBack size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAnimationConfig({ currentFrameIndex: (animationConfig.currentFrameIndex + 1) % animationConfig.frames.length })}>
                      <TbPlayerSkipForward size={12} />
                    </Button>
                 </div>
               </div>
            </div>

            {/* Playback Controls */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Playback Control</Label>
                <div className="flex items-center gap-2">
                   <Button 
                     variant={animationConfig.speed === "slow" ? "secondary" : "ghost"} 
                     size="sm" className="h-6 text-[9px] px-2"
                     onClick={() => setAnimationConfig({ speed: "slow" })}
                   >S</Button>
                   <Button 
                     variant={animationConfig.speed === "medium" ? "secondary" : "ghost"} 
                     size="sm" className="h-6 text-[9px] px-2"
                     onClick={() => setAnimationConfig({ speed: "medium" })}
                   >M</Button>
                   <Button 
                     variant={animationConfig.speed === "fast" ? "secondary" : "ghost"} 
                     size="sm" className="h-6 text-[9px] px-2"
                     onClick={() => setAnimationConfig({ speed: "fast" })}
                   >F</Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className={cn("flex-1 h-10 font-bold", animationConfig.playing ? "bg-amber-500 hover:bg-amber-600" : "bg-primary")}
                  onClick={togglePlay}
                >
                  {animationConfig.playing ? (
                    <><TbPlayerPause size={18} className="mr-2" /> PAUSE</>
                  ) : (
                    <><TbPlayerPlay size={18} className="mr-2" /> PLAY</>
                  )}
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={stop}>
                  <TbPlayerStop size={18} />
                </Button>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Timeline Slider */}
            <div className="space-y-3">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Timeline Navigation</Label>
               <Slider
                 value={[animationConfig.currentFrameIndex]}
                 min={0}
                 max={animationConfig.frames.length - 1}
                 step={1}
                 onValueChange={([val]) => setAnimationConfig({ currentFrameIndex: val, playing: false })}
               />
               <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
                 <span>{animationConfig.frames[0].date}</span>
                 <span>{animationConfig.frames[animationConfig.frames.length - 1].date}</span>
               </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-border/50 bg-accent/5 space-y-3">
        <Button 
          variant="outline" 
          className="w-full text-xs h-8 border-dashed"
          onClick={loadTimeline}
          disabled={isLoading || !animationConfig.active}
        >
          <TbRefresh size={14} className={cn("mr-2", isLoading && "animate-spin")} />
          Refresh Timeline
        </Button>
        <Button
          variant="ghost"
          className="w-full text-xs h-8 text-muted-foreground hover:text-destructive"
          onClick={() => {
            setAnimationConfig({ active: false, playing: false })
            setLayerVisibility("dynamicworld", true)
          }}
        >
          Close Animator
        </Button>
      </div>
    </div>
  )
}
