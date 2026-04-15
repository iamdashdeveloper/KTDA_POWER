import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import {
  IssueFormSchema,
  type IssueFormData,
} from "@workspace/database/validations"
import { JsonMetadataEditor } from "./JsonMetadataEditor"
import { GeometryPicker } from "./GeometryPicker"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"
import axios from "axios"

interface Project {
  id: string
  name: string
}

interface Feature {
  id: string
  name: string
}

export function IssueForm() {
  const [submitting, setSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingFeatures, setLoadingFeatures] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IssueFormData>({
    resolver: zodResolver(IssueFormSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: "",
      featureId: "",
      priority: 0,
      status: "OPEN",
      location: undefined,
      metadata: {},
      images: [],
    },
  })

  const projectId = watch("projectId")
  const location = watch("location")
  const metadata = watch("metadata")

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get("/api/projects")
        setProjects(response.data)
      } catch (err) {
        console.error("Failed to fetch projects:", err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [])

  // Fetch features when project changes (cascading select)
  useEffect(() => {
    if (!projectId) {
      setFeatures([])
      setValue("featureId", "")
      return
    }

    const fetchFeatures = async () => {
      setLoadingFeatures(true)
      try {
        const response = await axios.get(`/api/projects/${projectId}/features`)
        setFeatures(response.data)
      } catch (err) {
        console.error("Failed to fetch features:", err)
        setFeatures([])
      } finally {
        setLoadingFeatures(false)
      }
    }

    fetchFeatures()
  }, [projectId, setValue])

  const onSubmit = async (data: IssueFormData) => {
    try {
      setSubmitting(true)

      // Convert priority string to number if needed
      const submitData = {
        ...data,
        priority: parseInt(data.priority as unknown as string, 10),
      }

      await axios.post("/api/issues", submitData)

      handleFormSuccess("create")

      // Reset form
      setValue("title", "")
      setValue("description", "")
      setValue("projectId", "")
      setValue("featureId", "")
      setValue("priority", 0)
      setValue("status", "OPEN")
      setValue("location", undefined)
      setValue("metadata", {})
      setValue("images", [])
    } catch (err) {
      handleFormError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Report Issue</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Title *</label>
              <Input
                placeholder="Issue title"
                {...register("title")}
                disabled={submitting}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description *
              </label>
              <textarea
                placeholder="Detailed description of the issue"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={4}
                {...register("description")}
                disabled={submitting}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Project & Feature Selection */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Project & Feature</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Project *
              </label>
              {loadingProjects ? (
                <div className="text-gray-500">Loading projects...</div>
              ) : (
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  {...register("projectId")}
                  disabled={submitting}
                  onChange={(e) => {
                    setValue("projectId", e.target.value)
                  }}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.projectId && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.projectId.message}
                </p>
              )}
            </div>

            {projectId && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Feature *
                </label>
                {loadingFeatures ? (
                  <div className="text-gray-500">Loading features...</div>
                ) : (
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    {...register("featureId")}
                    disabled={submitting}
                  >
                    <option value="">Select a feature</option>
                    {features.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.featureId && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.featureId.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Priority & Status */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Status & Priority</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Priority *
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                {...register("priority")}
                disabled={submitting}
              >
                <option value="0">Low (0)</option>
                <option value="1">Medium (1)</option>
                <option value="2">High (2)</option>
                <option value="3">Critical (3)</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.priority.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status *</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                {...register("status")}
                disabled={submitting}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Location */}
        <GeometryPicker
          value={location}
          onChange={(coords) => setValue("location", coords)}
          title="Issue Location"
        />

        {/* Issue Metadata */}
        <JsonMetadataEditor
          value={metadata}
          onChange={(value) => setValue("metadata", value)}
          title="Issue Details"
          fields={[
            {
              key: "weather",
              label: "Weather Conditions",
              type: "text",
            },
            {
              key: "impactLevel",
              label: "Impact Level",
              type: "text",
            },
            {
              key: "rootCause",
              label: "Root Cause Analysis",
              type: "text",
            },
            {
              key: "estimatedRepairCost",
              label: "Estimated Repair Cost (USD)",
              type: "number",
            },
          ]}
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Report Issue"}
          </Button>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
