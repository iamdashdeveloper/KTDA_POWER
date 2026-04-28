import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { AlertCircle, Loader, Zap } from "lucide-react"
import { Label } from "@workspace/ui/components/label"

export interface LineFeature {
  id: string
  name: string
  geometry?: any
  parentName?: string | null
  groupName?: string | null
}

export interface GenerateChainnageModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate?: (options: {
    interval: number
    startValue: number
    featureId: string
  }) => void
  isGenerating?: boolean
  lineFeatures?: LineFeature[]
}

export function GenerateChainnageModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
  lineFeatures = [],
}: GenerateChainnageModalProps) {
  const [interval, setInterval] = useState<string>("100")
  const [startValue, setStartValue] = useState<string>("0")
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Validation
  const isValid = () => {
    const intervalNum = parseFloat(interval)
    const startNum = parseFloat(startValue)

    if (isNaN(intervalNum) || intervalNum <= 0) {
      setError("Interval must be a positive number")
      return false
    }
    if (isNaN(startNum) || startNum < 0) {
      setError("Start value must be a non-negative number")
      return false
    }
    if (!selectedFeatureId) {
      setError("Please select a line feature")
      return false
    }
    return true
  }

  const handleGenerate = () => {
    if (!isValid()) {
      return
    }

    setError(null)

    if (onGenerate) {
      onGenerate({
        interval: parseFloat(interval),
        startValue: parseFloat(startValue),
        featureId: selectedFeatureId,
      })
    }

    // Close modal after a short delay
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

  const selectedFeature = lineFeatures.find((f) => f.id === selectedFeatureId)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <DialogTitle>Generate Chainage Markers</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feature Selection */}
          <div className="space-y-2">
            <Label htmlFor="feature-select" className="text-sm font-medium">
              Select Line Feature
            </Label>
            <Select
              value={selectedFeatureId}
              onValueChange={setSelectedFeatureId}
            >
              <SelectTrigger id="feature-select">
                <SelectValue placeholder="Choose a line feature..." />
              </SelectTrigger>
              <SelectContent>
                {lineFeatures.filter(
                  (f) =>
                    f.geometry?.type === "LineString" ||
                    f.geometry?.type === "MultiLineString"
                ).length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No line features available
                  </div>
                ) : (
                  lineFeatures
                    .filter(
                      (f) =>
                        f.geometry?.type === "LineString" ||
                        f.geometry?.type === "MultiLineString"
                    )
                    .map((feature) => {
                      const parentInfo = feature.parentName || feature.groupName
                      const displayName = parentInfo
                        ? `${feature.name} (${parentInfo})`
                        : feature.name
                      return (
                        <SelectItem key={feature.id} value={feature.id}>
                          {displayName}
                        </SelectItem>
                      )
                    })
                )}
              </SelectContent>
            </Select>
            {selectedFeature && (
              <p className="text-xs text-muted-foreground">
                ID: {selectedFeature.id}
              </p>
            )}
          </div>

          {/* Chainage Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval" className="text-sm font-medium">
              Chainage Interval (meters)
            </Label>
            <Input
              id="interval"
              type="number"
              placeholder="100"
              value={interval}
              onChange={(e) => {
                setInterval(e.target.value)
                setError(null)
              }}
              min="1"
              step="1"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Distance between chainage markers along the line feature
            </p>
          </div>

          {/* Start Value */}
          <div className="space-y-2">
            <Label htmlFor="startValue" className="text-sm font-medium">
              Start Chainage Value (meters)
            </Label>
            <Input
              id="startValue"
              type="number"
              placeholder="0"
              value={startValue}
              onChange={(e) => {
                setStartValue(e.target.value)
                setError(null)
              }}
              min="0"
              step="1"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              The chainage value at the start of the line (e.g., 0, 100, 500)
            </p>
          </div>

          {/* Format Preview */}
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Format Preview
            </p>
            <p className="font-mono text-sm">
              {(() => {
                const start = parseFloat(startValue) || 0
                const int = parseFloat(interval) || 100
                const example = start + int
                const km = Math.floor(example / 1000)
                const m = example % 1000
                return `${km}+${m.toString().padStart(3, "0")}`
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              Format: kilometers+meters (e.g., 2+345 = 2345m)
            </p>
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
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedFeatureId}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate Markers
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
