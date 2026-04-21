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
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "group relative p-3",
          "transition-colors hover:bg-secondary",
          className
        )}
      >
        <Icon className="h-5 w-5 text-foreground" />
        <span
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2",
            "rounded px-2 py-1 text-xs",
            "bg-popover text-popover-foreground",
            "opacity-0 group-hover:opacity-100",
            "pointer-events-none whitespace-nowrap transition-opacity"
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
          "fixed right-0 bottom-0 left-0 flex w-full justify-between border-2 bg-card p-4 text-foreground",
          className
        )}
      >
        {items.map((item) => (
          <DockIconButton key={item.label} {...item} />
        ))}
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock }
