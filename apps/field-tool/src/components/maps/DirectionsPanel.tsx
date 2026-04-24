import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  X,
  Navigation,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Clock,
  Footprints,
} from "lucide-react"
import { MdUTurnRight, MdUTurnLeft } from "react-icons/md"
import type { RouteStep } from "./types"
import { generateInstruction, formatDistance, formatDuration } from "./mapUtils"

/* ------------------------------------------------------------------ */
/*  Maneuver icon helper                                               */
/* ------------------------------------------------------------------ */
function ManeuverIcon({ type, modifier }: { type: string; modifier?: string }) {
  const t = type.toLowerCase()
  const m = modifier?.toLowerCase()

  if (t === "uturn") {
    return m === "left" ? (
      <MdUTurnLeft className="h-5 w-5 text-primary" />
    ) : (
      <MdUTurnRight className="h-5 w-5 text-primary" />
    )
  }
  if (t === "roundabout" || t === "rotary") {
    return <RotateCcw className="h-5 w-5 text-primary" />
  }
  if (t === "depart" || t === "straight") {
    return <ArrowUp className="h-5 w-5 text-primary" />
  }
  if (t === "arrive") {
    return <Footprints className="h-5 w-5 text-primary" />
  }
  if (m === "left" || m === "slight left" || m === "sharp left") {
    return <CornerUpLeft className="h-5 w-5 text-primary" />
  }
  if (m === "right" || m === "slight right" || m === "sharp right") {
    return <CornerUpRight className="h-5 w-5 text-primary" />
  }
  if (t === "direct") {
    return <Navigation className="h-5 w-5 text-primary rotate-45" />
  }
  return <Navigation className="h-5 w-5 text-muted-foreground" />
}

/* ------------------------------------------------------------------ */
/*  Resizable Bottom Directions Panel                                  */
/* ------------------------------------------------------------------ */
const MIN_HEIGHT = 80
const DEFAULT_HEIGHT = 260
const MAX_HEIGHT_RATIO = 0.65

interface DirectionsPanelProps {
  isOpen: boolean
  onClose: () => void
  steps: RouteStep[]
  totalDistance: number
  totalDuration: number
  currentStepIndex: number
  navigationMode?: "route" | "direct"
}

export function DirectionsPanel({
  isOpen,
  onClose,
  steps,
  totalDistance,
  totalDuration,
  currentStepIndex,
  navigationMode = "route",
}: DirectionsPanelProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const startHeight = useRef(0)
  const heightRef = useRef(DEFAULT_HEIGHT)

  const maxHeight =
    typeof window !== "undefined"
      ? Math.floor(window.innerHeight * MAX_HEIGHT_RATIO)
      : 600

  const onDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true)
      startY.current = clientY
      startHeight.current = height
    },
    []
  )

  const onDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return
      const delta = startY.current - clientY
      const next = Math.min(
        Math.max(startHeight.current + delta, MIN_HEIGHT),
        maxHeight
      )
      setHeight(next)
    },
    [isDragging, maxHeight]
  )

  const onDragEnd = useCallback(() => {
    setIsDragging(false)
    if (heightRef.current < MIN_HEIGHT + 40) {
      setHeight(MIN_HEIGHT)
    }
  }, [])

  // Keep heightRef in sync with height state
  useEffect(() => {
    heightRef.current = height
  }, [height])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onDragMove(e.clientY)
    const onMouseUp = () => onDragEnd()
    const onTouchMove = (e: TouchEvent) => onDragMove(e.touches[0].clientY)
    const onTouchEnd = () => onDragEnd()

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", onTouchEnd)
      return () => {
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onTouchEnd)
      }
    }
  }, [isDragging, onDragMove, onDragEnd])

  if (!isOpen) return null

  const isMinimized = height <= MIN_HEIGHT + 10
  const currentStep = steps[currentStepIndex]
  const currentInstruction = currentStep ? generateInstruction(currentStep) : ""

  return (
    <div
      className="absolute right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      style={{
        height: `${height}px`,
        transition: isDragging
          ? "none"
          : "height 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex cursor-ns-resize items-center justify-center py-2.5 select-none"
        onMouseDown={(e) => onDragStart(e.clientY)}
        onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
      >
        <div className="h-1.5 w-12 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-card-foreground">
            {isMinimized && currentInstruction
              ? currentInstruction
              : "Directions"}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Footprints className="h-3.5 w-3.5" />
              {formatDistance(totalDistance)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(totalDuration)}
            </span>
            <span className="flex items-center gap-1 text-primary">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            {navigationMode === "direct" && (
              <span className="flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Direct Mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setHeight((h) =>
                h <= MIN_HEIGHT + 20 ? DEFAULT_HEIGHT : MIN_HEIGHT
              )
            }
            className="h-8 w-8"
            title={isMinimized ? "Expand" : "Collapse"}
          >
            {isMinimized ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-3">
        {steps.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No turn-by-turn steps available.
          </p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => {
              const instruction = generateInstruction(step)
              const isActive = index === currentStepIndex
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-xl p-3 ${
                    isActive
                      ? "bg-primary/10"
                      : "bg-muted/50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-sm ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-background"
                    }`}
                  >
                    <ManeuverIcon
                      type={step.maneuver.type}
                      modifier={step.maneuver.modifier}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug font-medium ${
                        isActive
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {instruction}
                    </p>
                    {step.name && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        on {step.name}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {formatDistance(step.distance)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
