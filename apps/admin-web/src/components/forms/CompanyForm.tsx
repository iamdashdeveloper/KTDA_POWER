import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import {
  CompanyFormSchema,
  type CompanyFormData,
} from "@workspace/ui/validations"
import { JsonMetadataEditor } from "./JsonMetadataEditor"
import { GeometryPicker } from "./GeometryPicker"
import { ImageUploader } from "../ImageUploader"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"
import apiClient from "@/lib/api"

interface CompanyFormProps {
  companyId?: string
  initialData?: CompanyFormData & { id: string; images?: string[] }
}

export function CompanyForm({ companyId, initialData }: CompanyFormProps) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const isEditMode = !!companyId && !!initialData

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      location: { latitude: -1.283611, longitude: 36.818611 },
      metadata: {},
    },
  })

  const location = watch("location")
  const metadata = watch("metadata")

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setSubmitting(true)

      const payload = {
        name: data.name,
        description: data.description,
        location: location,
        metadata: metadata,
        images: images,
      }

      if (isEditMode) {
        // Update existing company
        await apiClient.patch(`/companies/${companyId}`, payload)
        handleFormSuccess("update")
        // Navigate back to company detail page
        setTimeout(() => navigate(`/companies/${companyId}`), 1500)
      } else {
        // Create new company
        await apiClient.post("/companies", payload)
        handleFormSuccess("create")
        // Navigate to companies list
        setTimeout(() => navigate("/companies"), 1500)
        // Reset form
        setValue("name", "")
        setValue("description", "")
        setValue("location", { latitude: -1.283611, longitude: 36.818611 })
        setValue("metadata", {})
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
      navigate(`/companies/${companyId}`)
    } else {
      navigate("/companies")
    }
  }

  return (
    <div className={isEditMode ? "" : "p-6"}>
      <h1 className="mb-6 text-3xl font-bold">
        {isEditMode ? "Edit Company" : "Create Company"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Company Name *
              </label>
              <Input
                placeholder="Enter company name"
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
                placeholder="Enter company description"
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

        {/* Image Upload */}
        <Card className="p-6">
          <ImageUploader
            onUpload={setImages}
            currentImages={images}
            maxImages={10}
          />
        </Card>

        {/* Location */}
        <GeometryPicker
          value={location}
          onChange={(coords) => setValue("location", coords)}
          title="Company Headquarters Location"
        />

        {/* Company Metadata */}
        <JsonMetadataEditor
          value={metadata}
          onChange={(val) => setValue("metadata", val)}
          title="Company Properties"
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Company"
                : "Create Company"}
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
