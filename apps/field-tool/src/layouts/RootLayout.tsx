import { Outlet, useNavigate } from "react-router-dom"

import { Dock } from "@/components/ui/dock-two"
import { Home, Activity, BarChart3, CheckCircle2, Settings } from "lucide-react"
import Navbar from "@/components/ui/navbar"

export default function RootLayout() {
  const navigate = useNavigate()
  // const location = useLocation()

  // const isActive = (path: string) => location.pathname === path

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
      path: "/data",
      label: "Data",
      icon: BarChart3,
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
      <div className="">
        <Outlet />
      </div>

      {/* Bottom Dock */}
      <Dock
        items={dockItems.map((item) => ({
          icon: item.icon,
          label: item.label,
          onClick: () => navigate(item.path),
        }))}
      />
    </div>
  )
}
