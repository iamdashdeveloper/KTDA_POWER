import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface DockProps {
  className?: string
  items: {
    icon: LucideIcon
    label: string
    onClick?: () => void
    className?: string
  }[]
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  className?: string
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "group relative flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all hover:bg-secondary",
          className
        )}
      >
        <Icon className="h-5 w-5 text-foreground" />
        <span className="mt-1 text-[9px] font-medium opacity-60">{label}</span>
        <span
          className={cn(
            "absolute -top-10 left-1/2 -translate-x-1/2",
            "rounded-lg px-2 py-1 text-xs font-medium",
            "bg-popover text-popover-foreground shadow-md border",
            "opacity-0 group-hover:opacity-100",
            "pointer-events-none whitespace-nowrap transition-all duration-200"
          )}
        >
          {label}
        </span>
      </motion.button>
    )
  }
)
DockIconButton.displayName = "DockIconButton"

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-card px-6 pb-2 backdrop-blur-lg border-t shadow-lg",
          className
        )}
      >
        {items.map((item) => (
          <DockIconButton 
            key={item.label} 
            {...item} 
          />
        ))}
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock }
