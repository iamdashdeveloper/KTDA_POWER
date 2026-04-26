import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { useProjectStore, type Project } from "@/store/useProjectStore"
import { 
  MapPin, 
  Building2, 
  Loader2, 
  ArrowLeft, 
  Search, 
  Plus, 
  Clock, 
  FolderOpen,
  Info
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

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
  const [apiBaseUrl] = useState(
    import.meta.env.VITE_API_URL || "http://localhost:3001"
  )

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true)
      try {
        // In a real app, we'd check for a token
        const response = await fetch(`${apiBaseUrl}/projects`, {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          const projectsData = data.data || data
          
          const projectsWithAccess = projectsData.map((project: Project) => ({
            ...project,
            hasAccess: true, // For now, assume access in web-portal
          }))
          setProjects(projectsWithAccess)
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [apiBaseUrl])

  const handleOpenProject = (project: Project) => {
    setActiveProject(project)
    navigate("/")
  }

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* ArcGIS Pro Backstage Sidebar */}
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-border">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ArrowLeft size={20} />
          </Button>
          <span className="font-bold text-sidebar-foreground uppercase tracking-wider text-sm">Projects</span>
        </div>

        <div className="flex-1 py-4">
          <SidebarItem icon={<FolderOpen size={18} />} label="Open" active />
          <SidebarItem icon={<Plus size={18} />} label="New" />
          <SidebarItem icon={<Clock size={18} />} label="Recent" />
          <div className="my-4 border-t border-border mx-4" />
          <SidebarItem icon={<Info size={18} />} label="About" />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sidebar-foreground">John Doe</span>
              <span className="text-[10px] text-sidebar-foreground/50">Sign out</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50">
          <h1 className="text-2xl font-semibold tracking-tight">Open Project</h1>
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-md py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span>Fetching projects from API...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <FolderOpen size={48} className="opacity-20" />
              <span>No projects found matching your search.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
    </div>
  )
}

function SidebarItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors text-sm font-medium",
      active 
        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary" 
        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
    )}>
      {icon}
      {label}
    </div>
  )
}

function ProjectCard({ project, isActive, onOpen }: { project: Project, isActive: boolean, onOpen: () => void }) {
  return (
    <Card 
      onClick={onOpen}
      className={cn(
        "group cursor-pointer border p-5 transition-all hover:shadow-xl hover:-translate-y-1 bg-card",
        isActive ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/5" : "hover:border-primary/50"
      )}
    >
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Building2 size={20} />
          </div>
          {isActive && (
            <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Current
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-1 flex-1">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
            {project.description || "No description provided for this hydropower project."}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-border mt-auto">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <MapPin size={12} />
            <span>{typeof project.location === 'string' ? project.location : 'Standard Location'}</span>
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
