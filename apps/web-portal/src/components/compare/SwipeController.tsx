import React, { useState, useEffect, useRef } from "react"
import { useMapStore } from "@/store/useMapStore"
import { cn } from "@workspace/ui/lib/utils"
import { TbGripVertical } from "react-icons/tb"

export const SwipeController: React.FC = () => {
  const { compareConfig, setCompareConfig } = useMapStore()
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!compareConfig.active) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    const width = window.innerWidth
    const x = e.clientX
    const percentage = Math.max(0, Math.min(100, (x / width) * 100))
    setCompareConfig({ swipePosition: percentage })
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-[100]"
      ref={containerRef}
    >
      {/* The Swipe Line */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-primary/80 shadow-[0_0_10px_rgba(var(--primary),0.5)] pointer-events-auto cursor-col-resize group"
        style={{ left: `${compareConfig.swipePosition}%` }}
        onMouseDown={handleMouseDown}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 bg-background border-2 border-primary rounded-lg flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <TbGripVertical className="text-primary" size={20} />
        </div>

        {/* Labels */}
        <div className="absolute top-20 left-4 whitespace-nowrap bg-background/80 backdrop-blur px-2 py-1 rounded border border-border text-[10px] font-bold uppercase tracking-tighter shadow-sm">
          Right Layer
        </div>
        <div className="absolute top-20 right-4 whitespace-nowrap bg-background/80 backdrop-blur px-2 py-1 rounded border border-border text-[10px] font-bold uppercase tracking-tighter shadow-sm">
          Left Layer
        </div>
      </div>
    </div>
  )
}
