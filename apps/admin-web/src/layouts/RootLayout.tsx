import { useState } from "react"
import { useLocation, Outlet, Link, NavLink } from "react-router-dom"
import { Toaster } from "@workspace/ui/components/sonner"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  ChevronRight,
  LayoutDashboard,
  Users,
  Lock,
  FolderOpen,
  Building,
  Plus,
  Edit,
  Trash2,
  SettingsIcon,
  FileText,
  AlertCircle,
} from "lucide-react"
import { BsGeo } from "react-icons/bs"
import DefaultLoader from "@/components/Logo"
import { LuLandPlot } from "react-icons/lu"
import { TbWavesElectricity } from "react-icons/tb"
import { FaPeopleRobbery } from "react-icons/fa6"
export function RootLayout() {
  const location = useLocation()
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleOpen = (item: string) => {
    setOpenItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  const isActive = (path: string) => location.pathname === path

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      id: "users",
      label: "Users",
      href: "/users",
      icon: Users,
      actions: [{ label: "Add User", href: "/users/add", icon: Plus }],
    },
    {
      id: "permissions",
      label: "Permissions",
      href: "/permissions",
      icon: Lock,
      actions: [
        { label: "Create Permission", href: "/permissions/create", icon: Plus },
      ],
    },
    {
      id: "projects",
      label: "Hydro Projects",
      href: "/projects",
      icon: TbWavesElectricity,
      actions: [
        { label: "Create Project", href: "/projects/create", icon: Plus },
      ],
    },
    {
      id: "companies",
      label: "Companies",
      href: "/companies",
      icon: Building,
      actions: [
        { label: "Create Company", href: "/companies/create", icon: Plus },
      ],
    },
    {
      id: "cadastre",
      label: "Cadastre",
      href: "/cadastre",
      icon: LuLandPlot,
      actions: [
        { label: "Complaints", href: "/complaints", icon: FaPeopleRobbery },
        { label: "Send Feedback", href: "/cadastre/feedback", icon: Edit },
        { label: "Resolve Issue", href: "/cadastre/resolve", icon: Trash2 },
      ],
    },
    {
      id: "features",
      label: "Features",
      href: "/features",
      icon: BsGeo,
      actions: [
        { label: "Upload features", href: "/features/upload", icon: Plus },
      ],
    },
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "20rem",
        } as React.CSSProperties
      }
    >
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="flex flex-row items-center border-b p-4">
            <DefaultLoader className="h-10 w-10" />
            <h1 className="text-xl font-bold">KTPC Admin Panel</h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.actions ? (
                  <Collapsible
                    key={item.id}
                    open={openItems.includes(item.id)}
                    onOpenChange={() => toggleOpen(item.id)}
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <NavLink to={item.href}>
                          <SidebarMenuButton
                            isActive={isActive(item.href)}
                            className="w-full"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                          </SidebarMenuButton>
                        </NavLink>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <div className="px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                              Quick Actions
                            </div>
                          </SidebarMenuSubItem>
                          {item.actions.map((action, idx) => (
                            <SidebarMenuSubItem key={idx}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(action.href)}
                              >
                                <Link
                                  to={action.href}
                                  className="flex items-center gap-2"
                                >
                                  <action.icon className="h-3 w-3" />
                                  {action.label}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="flex items-center gap-4 border-b p-4">
            <SidebarTrigger />
          </div>
          <Outlet />
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}
