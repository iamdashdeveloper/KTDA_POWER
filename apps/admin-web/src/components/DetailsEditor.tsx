import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { X } from "lucide-react"

interface DetailsEditorProps {
  content: string
  images: string[]
  onChange: (details: { content: string; images: string[] }) => void
}

export function DetailsEditor({
  content,
  images,
  onChange,
}: DetailsEditorProps) {
  const [newImageUrl, setNewImageUrl] = useState("")

  const addImage = () => {
    if (newImageUrl.trim()) {
      onChange({
        content,
        images: [...images, newImageUrl],
      })
      setNewImageUrl("")
    }
  }

  const removeImage = (index: number) => {
    onChange({
      content,
      images: images.filter((_, i) => i !== index),
    })
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      content: e.target.value,
      images,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="content" className="mb-2 block text-sm font-medium">
          Content / Description
        </label>
        <textarea
          id="content"
          value={content}
          onChange={handleContentChange}
          placeholder="Write detailed content, use markdown formatting if needed..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          rows={6}
        />
      </div>

      <Card className="p-4">
        <h3 className="mb-4 text-sm font-semibold">Images</h3>

        <div className="mb-4 flex gap-2">
          <Input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Enter image URL"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addImage()
              }
            }}
          />
          <Button onClick={addImage} type="button">
            Add Image
          </Button>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((imageUrl, idx) => (
              <div key={idx} className="group relative">
                <img
                  src={imageUrl}
                  alt={`Gallery ${idx + 1}`}
                  className="aspect-square w-full rounded-md border border-border object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' text-anchor='middle' dominant-baseline='middle' fill='%236b7280'%3EImage Error%3C/text%3E%3C/svg%3E"
                  }}
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <p className="text-xs text-muted-foreground">No images added yet</p>
        )}
      </Card>
    </div>
  )
}
