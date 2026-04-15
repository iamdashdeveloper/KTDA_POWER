"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import apiClient from "@/lib/api"
import { ProjectCard } from "@/components/ProjectCard"
import { Button } from "@workspace/ui/components/button"
import { handleFormError } from "@/lib/errorHandler"
import { Plus } from "lucide-react"

interface Project {
  id: string
  name: string
  description?: string
  images?: string[]
  status?: string
}

export function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get("/projects")
        setProjects(response.data || [])
        setError(null)
      } catch (err) {
        handleFormError(err)
        setError("Failed to fetch projects")
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="mt-2 text-muted-foreground">
              Manage and view all projects
            </p>
          </div>
          <Button
            onClick={() => navigate("/projects/create")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">No projects found</p>
          <Button onClick={() => navigate("/projects/create")}>
            Create First Project
          </Button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              image={project.images?.[0]}
              status={project.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
