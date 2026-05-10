import { Outlet, useNavigate } from "react-router-dom"

import { Dock } from "@/components/ui/dock-two"
import { Home, Activity, CheckCircle2, Settings, Plus } from "lucide-react"
import Navbar from "@/components/ui/navbar"
import { useUIStore } from "@/store/useUIStore"

export default function RootLayout() {
  const navigate = useNavigate()
  const { setIsIssueFormOpen } = useUIStore()

  const dockItems = [
    {
      path: "/home",
      label: "Home",
      icon: Home,
    },
    {
      path: "/sensors",
      label: "Sensors",
      icon: Activity,
    },
    {
      path: "#",
      label: "Create Issue",
      icon: Plus,
      onClick: () => setIsIssueFormOpen(true),
    },
    {
      path: "/tasks",
      label: "Tasks",
      icon: CheckCircle2,
    },
    {
      path: "/auth",
      label: "Auth",
      icon: Settings,
    },
  ]

  return (
    <div className="app fixed inset-0 flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden pb-16">
        <Outlet />
      </div>

      {/* Bottom Dock */}
      <Dock
        items={dockItems.map((item) => ({
          icon: item.icon,
          label: item.label,
          onClick: item.onClick || (() => navigate(item.path)),
        }))}
      />
    </div>
  )
}
