import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { useProjectStore, type Project } from "@/store/useProjectStore"
import { ApiClient } from "@/lib/api"
import { MapPin, Building2, Loader2 } from "lucide-react"

interface ProjectWithAccess extends Project {
  hasAccess: boolean
  canRequest?: boolean
}

export default function ProjectManager() {
  const navigate = useNavigate()
  const { setActiveProject } = useProjectStore()
  const [projects, setProjects] = useState<ProjectWithAccess[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  // Fetch user and projects on mount
  useEffect(() => {
    const fetchUserAndProjects = async () => {
      setIsLoading(true)
      try {
        // Get user from localStorage
        const savedUser = localStorage.getItem("user")
        if (!savedUser) {
          navigate("/auth", { replace: true })
          return
        }

        const userData = JSON.parse(savedUser)
        setUser(userData)
        console.log(userData)
        // Use ApiClient for proper error handling and retry logic
        const data = await ApiClient.get<Project[]>("/projects")
        const projectsData = Array.isArray(data) ? data : (data as any)?.data || data
        const projectsWithAccess: ProjectWithAccess[] = projectsData.map(
          (project: Project) => ({
            ...project,
            hasAccess:
              userData.companyId === project.companyId ||
              userData.companyId === "cmo739d5b0003fwuh63xk88pg",
            canRequest: userData.companyId !== project.companyId,
          })
        )
        setProjects(projectsWithAccess)
      } catch (error) {
        console.error("Error fetching projects:", error)
        toast.error("Failed to load projects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndProjects()
  }, [navigate])

  const handleOpenProject = (project: ProjectWithAccess) => {
    if (!project.hasAccess) {
      toast.error("You don't have access to this project")
      return
    }

    setSelectedProject(project.id)
    setActiveProject(project)
    setTimeout(() => {
      navigate("/home", { replace: true })
    }, 300)
  }

  const handleRequestAccess = () => {
    // TODO: Implement access request modal/functionality
    toast.info("Access request feature coming soon")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            Loading projects...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Select a Project
          </h1>
          <p className="text-muted-foreground">
            Choose a project to access the hydropower management dashboard
          </p>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Logged in as <span className="font-semibold">{user.email}</span>
            </p>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No projects available. Please contact your administrator.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`flex flex-col gap-4 border p-6 transition-all hover:shadow-md ${
                  project.hasAccess
                    ? "cursor-pointer border-border hover:border-primary"
                    : "border-border opacity-75"
                }`}
              >
                {/* Project Header */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Project Details */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Company ID: {project.companyId}
                    </span>
                  </div>
                  {project.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {typeof project.location === "string"
                          ? project.location
                          : `${project.location.latitude.toFixed(5)}, ${project.location.longitude.toFixed(5)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Access Status */}
                <div className="border-t border-border pt-4">
                  {project.hasAccess ? (
                    <div className="rounded-md bg-green-500/10 p-2 text-xs font-medium text-green-700">
                      ✓ You have access to this project
                    </div>
                  ) : (
                    <div className="rounded-md bg-amber-500/10 p-2 text-xs font-medium text-amber-700">
                      ⊘ Access request required
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={() =>
                    project.hasAccess
                      ? handleOpenProject(project)
                      : handleRequestAccess()
                  }
                  disabled={
                    !project.hasAccess || selectedProject === project.id
                  }
                  className="w-full"
                  variant={project.hasAccess ? "default" : "outline"}
                >
                  {selectedProject === project.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : project.hasAccess ? (
                    "Open Project"
                  ) : (
                    "Request Access"
                  )}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
