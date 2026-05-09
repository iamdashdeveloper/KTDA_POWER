import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  ProjectFormSchema,
  type ProjectFormData,
} from "@workspace/ui/validations"
import { JsonMetadataEditor } from "./JsonMetadataEditor"
import { ImageUploader } from "../ImageUploader"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"
import apiClient from "@/lib/api"

interface Company {
  id: string
  name: string
}

interface ProjectFormProps {
  projectId?: string
  initialData?: ProjectFormData & {
    id: string
    location?: { latitude: number; longitude: number }
    status?: string
    images?: string[]
  }
}

export function ProjectForm({ projectId, initialData }: ProjectFormProps) {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const isEditMode = !!projectId && !!initialData

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(ProjectFormSchema as any),
    defaultValues: initialData || {
      companyId: "",
      name: "",
      description: "",
      status: "",
      metadata: {},
      images: [],
    },
  })

  const metadata = watch("metadata")
  const status = watch("status")

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await apiClient.get("/companies")
        // API returns array directly, not wrapped in data object
        setCompanies(
          Array.isArray(response.data)
            ? response.data
            : response.data.companies || []
        )
      } catch (err) {
        handleFormError(err)
      } finally {
        setLoadingCompanies(false)
      }
    }

    fetchCompanies()
  }, [])

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setSubmitting(true)

      const payload = {
        name: data.name,
        description: data.description,
        companyId: data.companyId,
        location: location,
        metadata: metadata,
        status: status,
        images: images,
      }

      if (isEditMode) {
        // Update existing project
        await apiClient.patch(`/projects/${projectId}`, payload)
        handleFormSuccess("update")
        // Navigate back to project list or detail
        setTimeout(() => navigate("/projects"), 1500)
      } else {
        // Create new project
        await apiClient.post("/projects", payload)
        handleFormSuccess("create")
        // Navigate to projects list
        setTimeout(() => navigate("/projects"), 1500)
        // Reset form
        setValue("companyId", "")
        setValue("name", "")
        setValue("description", "")
        setValue("metadata", {})
        setValue("status", "")
        setImages([])
      }
    } catch (err) {
      handleFormError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isEditMode) {
      navigate("/projects")
    } else {
      navigate("/projects")
    }
  }

  return (
    <div className={isEditMode ? "" : "p-6"}>
      <h1 className="mb-6 text-3xl font-bold">
        {isEditMode ? "Edit Project" : "Create Project"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Company *
              </label>
              {loadingCompanies ? (
                <div className="text-gray-500">Loading companies...</div>
              ) : (
                <Select
                  value={watch("companyId") as string}
                  onValueChange={(value) => setValue("companyId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.companyId && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.companyId.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Project Name *
              </label>
              <Input
                placeholder="Enter project name"
                {...register("name")}
                disabled={submitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                placeholder="Enter project description"
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

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <Select
                value={status || ""}
                onValueChange={(value) => setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Image Upload */}
        <Card className="p-6">
          <ImageUploader
            onUpload={setImages}
            currentImages={images}
            maxImages={10}
          />
        </Card>

        {/* Project Metadata */}
        <JsonMetadataEditor
          value={metadata}
          onChange={(val) => setValue("metadata", val)}
          title="Project Properties"
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Project"
                : "Create Project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
