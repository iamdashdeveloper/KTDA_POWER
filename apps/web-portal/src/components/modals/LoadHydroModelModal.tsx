import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { ApiClient } from "@/lib/api"

interface LoadHydroModelModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (modelId: string, modelName?: string) => void
}

interface HydroModel {
  id: string
  name: string
  description?: string | null
}

export const LoadHydroModelModal: React.FC<LoadHydroModelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [models, setModels] = useState<HydroModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      console.log("[LoadHydroModelModal] Modal closed")
      return
    }

    console.log("[LoadHydroModelModal] Modal opened, fetching models...")

    const fetchModels = async () => {
      try {
        setIsLoading(true)
        console.log("[LoadHydroModelModal] Calling GET /hydro-models")
        const data = await ApiClient.get<HydroModel[]>("/hydro-models")
        console.log("[LoadHydroModelModal] Models fetched:", {
          count: data.length,
          models: data,
        })
        setModels(data)
      } catch (error) {
        console.error(
          "[LoadHydroModelModal] Error fetching hydro models:",
          error
        )
        toast.error("Failed to load hydro models")
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [isOpen])

  const handleSubmit = () => {
    if (!selectedModelId) {
      console.log("[LoadHydroModelModal] No model selected")
      toast.error("Please select a model")
      return
    }

    const selectedModel = models.find((m) => m.id === selectedModelId)
    const modelName = selectedModel?.name || selectedModelId

    console.log("[LoadHydroModelModal] Submitting model:", {
      modelId: selectedModelId,
      modelName,
      selectedModel,
    })

    onSuccess?.(selectedModelId, modelName)
    console.log("[LoadHydroModelModal] onSuccess callback fired")
    setSelectedModelId("")
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedModelId("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Load Hydro Model</DialogTitle>
          <DialogDescription>
            Select a hydro model to open in the analysis panel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="model-select" className="text-sm font-medium">
              Select Model to Open *
            </label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger id="model-select" disabled={isLoading}>
                <SelectValue placeholder="Choose a hydro model..." />
              </SelectTrigger>
              <SelectContent>
                {models.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {isLoading ? "Loading models..." : "No models available"}
                  </div>
                ) : (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground">
                            {model.description.substring(0, 50)}
                            {model.description.length > 50 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedModelId}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load Model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
