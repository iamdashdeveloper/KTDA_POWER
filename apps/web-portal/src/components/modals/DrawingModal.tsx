import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { AlertCircle, Loader, Upload } from "lucide-react"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"

export interface DrawnFeatureData {
  name: string
  description: string
  groupName: string
}

export interface DrawingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (
    features: Array<{ name: string; description: string; groupName: string }>,
    groupName: string
  ) => Promise<void>
  isSaving: boolean
  drawnFeatureCount: number
}

export function DrawingModal({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  drawnFeatureCount = 0,
}: DrawingModalProps) {
  const [name, setName] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const [autoName, setAutoName] = useState<boolean>(true)

  const [error, setError] = useState<string | null>(null)

  // Generate file name from current timestamp
  const generateFileName = () => {
    const now = new Date()
    return `Drawing_${now.toISOString().split("T")[0]}_${now.getHours()}-${now.getMinutes()}`
  }


  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a name for the feature")
      return
    }

    if (drawnFeatureCount === 0) {
      setError("No features drawn. Please draw something on the map first.")
      return
    }

    setError(null)

    if (onSave) {
      const finalFileName = autoName ? generateFileName() : fileName
      onSave(
        [
          {
            name: name.trim(),
            description: description.trim(),
            groupName: finalFileName,
          },
        ],
        finalFileName
      )
    }


    // Reset form
    setName("")
    setDescription("")
    setFileName("")


    // Close after a short delay
    setTimeout(() => {
      onClose()
    }, 500)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null)
      onClose()
    }
  }

  useEffect(() => {
    if (isOpen) {
      setError(null)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <DialogTitle>Save Drawn Features</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Features Count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Features Drawn</Label>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-sm font-semibold">
                {drawnFeatureCount} feature(s) ready to save
              </p>
            </div>
          </div>

          {/* Feature Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Feature Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g., Pipeline Route A, Boundary Line"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name for this feature
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Optional notes about this feature..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 text-sm"
            />
          </div>

          {/* File Name */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="autoName"
                checked={autoName}
                onCheckedChange={(checked) => setAutoName(!!checked)}
              />
              <Label
                htmlFor="autoName"
                className="cursor-pointer text-sm font-medium"
              >
                Auto-generate file name
              </Label>
            </div>
            {!autoName && (
              <Input
                placeholder="Custom file name..."
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="h-10"
              />
            )}
            {autoName && (
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="font-mono text-xs text-muted-foreground">
                  {generateFileName()}.geojson
                </p>
              </div>
            )}
          </div>


          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || drawnFeatureCount === 0}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Save & Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
