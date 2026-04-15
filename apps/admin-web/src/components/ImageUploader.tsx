import { useState, useEffect } from "react"
import { Upload, X, Loader } from "lucide-react"
import apiClient from "@/lib/api"

interface ImageUploaderProps {
  onUpload: (images: string[]) => void
  currentImages?: string[]
  maxImages?: number
}

export function ImageUploader({
  onUpload,
  currentImages = [],
  maxImages = 10,
}: ImageUploaderProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>(currentImages)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Notify parent when uploadedImages changes
  useEffect(() => {
    onUpload(uploadedImages)
  }, [uploadedImages, onUpload])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const remainingSlots = maxImages - uploadedImages.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    setIsUploading(true)

    for (const file of filesToProcess) {
      if (file.type.startsWith("image/")) {
        try {
          const response = await apiClient.post("/upload", file, {
            headers: {
              "Content-Type": file.type,
            },
          })

          if (response.data.url) {
            setUploadedImages((prev) => [
              ...prev,
              `http://localhost:3001${response.data.url}`,
            ])
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
    const updated = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(updated)
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">Upload Images</label>

      {/* Upload Area */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={uploadedImages.length >= maxImages || isUploading}
        />
        {isUploading ? (
          <Loader className="mx-auto h-8 w-8 animate-spin text-blue-500" />
        ) : (
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
        )}
        <p className="mt-2 text-sm text-gray-600">
          {isUploading
            ? "Uploading..."
            : "Drag and drop images here, or click to select"}
        </p>
        <p className="text-xs text-gray-500">
          {uploadedImages.length} / {maxImages} images
        </p>
      </label>

      {/* Image Previews */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {uploadedImages.map((image, index) => (
            <div key={index} className="relative overflow-hidden rounded-lg">
              <img
                src={image}
                alt={`Upload preview ${index + 1}`}
                className="h-24 w-full object-cover"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white transition-all hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
