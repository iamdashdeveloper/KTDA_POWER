import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { useProjectStore, type Project } from "@/store/useProjectStore"
import { ApiClient } from "@/lib/api"
import {
  MapPin,
  Building2,
  Loader2,
  ArrowLeft,
  Search,
  Plus,
  Clock,
  FolderOpen,
  Info,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { CreateProjectCompanyModal } from "@/components/modals/CreateProjectCompanyModal"


interface ProjectWithAccess extends Project {
  hasAccess: boolean
  canRequest?: boolean
}

export default function Projects() {
  const navigate = useNavigate()
  const { setActiveProject, activeProject } = useProjectStore()
  const [projects, setProjects] = useState<ProjectWithAccess[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      // Use ApiClient for proper error handling and retry logic
      const data = await ApiClient.get<Project[]>("/projects")
      const projectsData = Array.isArray(data)
        ? data
        : (data as any)?.data || data

      const projectsWithAccess = projectsData.map((project: Project) => ({
        ...project,
        hasAccess: true, // For now, assume access in web-portal
      }))
      setProjects(projectsWithAccess)
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])


  const handleOpenProject = (project: Project) => {
    setActiveProject(project)
    navigate("/")
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      {/* ArcGIS Pro Backstage Sidebar */}
      <div className="flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ArrowLeft size={20} />
          </Button>
          <span className="text-sm font-bold tracking-wider text-sidebar-foreground uppercase">
            Projects
          </span>
        </div>

        <div className="flex-1 py-4">
          <SidebarItem 
            icon={<FolderOpen size={18} />} 
            label="Open" 
            active 
            onClick={() => {}} // Already on Open tab
          />
          <SidebarItem 
            icon={<Plus size={18} />} 
            label="New" 
            onClick={() => setIsCreateModalOpen(true)}
          />
          <SidebarItem icon={<Clock size={18} />} label="Recent" />
          <div className="mx-4 my-4 border-t border-border" />
          <SidebarItem icon={<Info size={18} />} label="About" />
        </div>


        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sidebar-foreground">
                John Doe
              </span>
              <span className="text-[10px] text-sidebar-foreground/50">
                Sign out
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col bg-background">
        <div className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Open Project
          </h1>
          <div className="relative w-72">
            <Search
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pr-4 pl-10 text-sm transition-all outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Fetching projects from API...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FolderOpen size={48} className="opacity-20" />
              <span>No projects found matching your search.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isActive={activeProject?.id === project.id}
                  onOpen={() => handleOpenProject(project)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>

  )
}

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: any
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
        active
          ? "border-l-4 border-primary bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      {icon}
      {label}
    </div>
  )
}


function ProjectCard({
  project,
  isActive,
  onOpen,
}: {
  project: Project
  isActive: boolean
  onOpen: () => void
}) {
  return (
    <Card
      onClick={onOpen}
      className={cn(
        "group cursor-pointer border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-xl",
        isActive
          ? "border-primary shadow-lg ring-2 shadow-primary/5 ring-primary"
          : "hover:border-primary/50"
      )}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Building2 size={20} />
          </div>
          {isActive && (
            <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
              Current
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <h3 className="line-clamp-1 font-bold text-foreground transition-colors group-hover:text-primary">
            {project.name}
          </h3>
          <p className="line-clamp-2 min-h-[32px] text-xs text-muted-foreground">
            {project.description ||
              "No description provided for this hydropower project."}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <MapPin size={12} />
            <span>
              {typeof project.location === "string"
                ? project.location
                : "Standard Location"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Clock size={12} />
            <span>Modified 2 days ago</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
