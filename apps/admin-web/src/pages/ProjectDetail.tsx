"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import apiClient from "@/lib/api"
import { ArticleView } from "@/components/ArticleView"
import { ProjectForm } from "@/components/forms/ProjectForm"
import { Button } from "@workspace/ui/components/button"
import { handleFormError } from "@/lib/errorHandler"
import { ArrowLeft } from "lucide-react"

interface Project {
  id: string
  name: string
  companyId: string
  description?: string
  location?: {
    latitude: number
    longitude: number
  }
  metadata?: Record<string, any>
  status?: string
  images?: string[]
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return

      try {
        setLoading(true)
        const response = await apiClient.get(`/projects/${id}`)
        setProject(response.data)
        setError(null)
      } catch (err) {
        handleFormError(err)
        setError("Failed to fetch project")
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-200">
          {error || "Project not found"}
        </div>
        <Button onClick={() => navigate("/projects")} className="mt-4">
          Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <Button
        onClick={() => navigate("/projects")}
        variant="ghost"
        className="mb-6 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Button>

      {/* View or Edit Mode */}
      {!isEditMode ? (
        <ArticleView
          title={project.name}
          description={project.description || ""}
          images={project.images || []}
          location={project.location}
          metadata={project.metadata}
          status={project.status}
          onEdit={() => setIsEditMode(true)}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Edit Project</h1>
            <Button onClick={() => setIsEditMode(false)} variant="outline">
              Cancel
            </Button>
          </div>
          <ProjectForm
            projectId={id}
            initialData={
              project
                ? {
                    id: project.id,
                    name: project.name,
                    companyId: project.companyId,
                    description: project.description || "",
                    metadata: project.metadata || {},
                    status: project.status || "",
                    images: project.images || [],
                    location: project.location,
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  )
}
