import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { X, Loader, MapPin, Navigation } from "lucide-react"
import { ApiClient } from "@/lib/api"
import { useProjectStore } from "@/store/useProjectStore"

// Validation schema for map-triggered issue form
const MapIssueFormSchema = z.object({
  title: z.string().min(1, "Issue title is required").max(255),
  description: z.string().max(2000).nullish(),
  priority: z.number().int().min(0).max(3),
  notes: z.string().max(1000).nullish(),
  images: z.array(z.string()),
})

type MapIssueFormData = z.infer<typeof MapIssueFormSchema>

interface MapTriggeredIssueFormProps {
  onClose: () => void
  onSuccess?: () => void
  mapCoordinates?: { latitude: number; longitude: number }
}

export function MapTriggeredIssueForm({
  onClose,
  onSuccess,
  mapCoordinates,
}: MapTriggeredIssueFormProps) {
  const { activeProject } = useProjectStore()
  const [submitting, setSubmitting] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(mapCoordinates || null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MapIssueFormData>({
    resolver: zodResolver(MapIssueFormSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      priority: 1,
      notes: "",
      images: [],
    },
  })

  // Auto-capture current location on mount
  useEffect(() => {
    if (!currentLocation && navigator.geolocation) {
      setGeoLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setGeoLoading(false)
        },
        (error) => {
          console.error("Geolocation error:", error)
          setGeoLoading(false)
          // Continue without location
        }
      )
    }
  }, [])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const remainingSlots = 5 - uploadedImages.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    setIsUploading(true)

    for (const file of filesToProcess) {
      if (file.type.startsWith("image/")) {
        try {
          const API_BASE_URL =
            import.meta.env.VITE_API_URL || "http://localhost:3001"
          const token = localStorage.getItem("authToken")

          const headers: Record<string, string> = {
            "Content-Type": file.type,
          }

          if (token) {
            headers.Authorization = `Bearer ${token}`
          }

          const response = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            body: file,
            headers,
            credentials: "include",
          })

          if (!response.ok) {
            throw new Error(
              `Upload failed: ${response.status} ${response.statusText}`
            )
          }

          const data = await response.json()
          if (data.url) {
            const imageUrl = `${API_BASE_URL}${data.url}`
            setUploadedImages((prev) => [...prev, imageUrl])
          }
        } catch (error) {
          console.error("Failed to upload image:", error)
        }
      }
    }

    setIsUploading(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTakePhotos = () => {
    if (uploadedImages.length >= 5 || isUploading || submitting) {
      return
    }

    cameraInputRef.current?.click()
  }

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files)
    event.currentTarget.value = ""
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported")
      return
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setGeoLoading(false)
      },
      () => {
        console.error("Failed to get current location")
        setGeoLoading(false)
      }
    )
  }

  const onSubmit = async (data: MapIssueFormData) => {
    try {
      if (!activeProject?.id) {
        console.error("No active project selected")
        alert("No active project selected")
        return
      }

      if (!currentLocation) {
        alert("Location not captured. Please try again.")
        return
      }

      setSubmitting(true)

      // Create issue payload
      const issuePayload = {
        title: data.title,
        description: data.description || null,
        projectId: activeProject.id,
        priority: data.priority,
        status: "OPEN",
        location: currentLocation,
        images: uploadedImages,
        metadata: {
          fieldNotes: data.notes || null,
          capturedAt: new Date().toISOString(),
          source: "field-tool",
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
      }

      console.log("Creating issue with payload:", issuePayload)

      const response = await ApiClient.post("/issues", issuePayload)

      // Success - show toast and close
      console.log("Issue created:", response)
      alert("Issue reported successfully!")
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Failed to create issue:", error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert(`Failed to create issue: ${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="relative m-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-1 transition-colors hover:bg-muted"
          disabled={submitting}
          aria-label="Close dialog"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6">
          <h2 className="mb-6 text-2xl font-bold">Report Issue on Field</h2>

          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Issue Title *
              </label>
              <Input
                placeholder="Brief description of the issue (e.g., 'Leaking pipe at canal junction')"
                {...register("title")}
                disabled={submitting}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Detailed Description
              </label>
              <textarea
                placeholder="Detailed description of what you observed"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                rows={3}
                {...register("description")}
                disabled={submitting}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Priority *
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                {...register("priority", { valueAsNumber: true })}
                disabled={submitting}
              >
                <option value="0">Low - Can wait</option>
                <option value="1">Medium - Should address soon</option>
                <option value="2">High - Urgent</option>
                <option value="3">Critical - Emergency</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.priority.message}
                </p>
              )}
            </div>

            {/* Location */}
            <Card className="border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-start gap-4">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex-grow">
                  <h4 className="mb-2 text-sm font-semibold">Location</h4>
                  {currentLocation ? (
                    <div>
                      <p className="text-sm text-foreground">
                        📍 {currentLocation.latitude.toFixed(6)},
                        {currentLocation.longitude.toFixed(6)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Captured at {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {geoLoading
                        ? "Getting your location..."
                        : "Location not captured yet"}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    disabled={submitting || geoLoading}
                    className="mt-2 gap-2"
                  >
                    {geoLoading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    {geoLoading ? "Getting location..." : "Update Location"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Images */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium">
                  Attach Photos ({uploadedImages.length}/5)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTakePhotos}
                  disabled={
                    uploadedImages.length >= 5 || isUploading || submitting
                  }
                >
                  Take Photos
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCameraChange}
                className="hidden"
                disabled={
                  uploadedImages.length >= 5 || isUploading || submitting
                }
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`block cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-input bg-muted/30 hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={
                    uploadedImages.length >= 5 || isUploading || submitting
                  }
                />
                <label htmlFor="image-upload" className="block cursor-pointer">
                  {isUploading ? (
                    <Loader className="mx-auto h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div>
                      <svg
                        className="mx-auto h-8 w-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isUploading
                          ? "Uploading..."
                          : "Drag photos here or click to select"}
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Image Previews */}
              {uploadedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {uploadedImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-lg border border-border"
                    >
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="h-20 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-destructive-foreground absolute top-1 right-1 rounded-full bg-destructive p-1 text-xs transition-colors hover:bg-destructive/90"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Field Notes
              </label>
              <textarea
                placeholder="Any additional observations or context..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                rows={2}
                {...register("notes")}
                disabled={submitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={submitting || !currentLocation}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Report Issue"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
