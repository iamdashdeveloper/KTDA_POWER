import { useState } from "react"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Upload, Trash2, Plus } from "lucide-react"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"

interface CompanyGalleryProps {
  companyId: string
}

export function CompanyGallery({ companyId: _companyId }: CompanyGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target?.files
    if (!files) return

    try {
      setUploading(true)

      // TODO: Implement image upload API endpoint
      // For now, we'll just create local preview URLs
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (loadEvent) => {
          const result = loadEvent.target?.result
          if (result && typeof result === "string") {
            setImages((prev) => [...prev, result])
          }
        }
        reader.readAsDataURL(file)
      })

      handleFormSuccess("upload")
    } catch (err) {
      handleFormError(err)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Company Gallery</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload and manage company photos
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50">
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="space-y-2">
              <p className="font-medium">
                {uploading
                  ? "Uploading..."
                  : "Click to upload or drag and drop"}
              </p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG, GIF up to 10MB each
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Gallery Grid */}
      {images.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">
            Gallery Images ({images.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="group relative h-40 overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-6 w-6 text-white" />
                </button>
              </div>
            ))}
          </div>

          <Button className="mt-6 w-full gap-2" disabled={uploading}>
            <Plus className="h-4 w-4" />
            Save Gallery
          </Button>
        </Card>
      )}

      {images.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No images uploaded yet</p>
        </Card>
      )}
    </div>
  )
}
