import React, { useEffect, useState } from "react"
import { ApiClient } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface HydroModelTabProps {
  modelId: string
}

interface HydroModelData {
  id: string
  name: string
  description?: string | null
}

export const HydroModelTab: React.FC<HydroModelTabProps> = ({ modelId }) => {
  const [model, setModel] = useState<HydroModelData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await ApiClient.get<HydroModelData>(
          `/hydro-models/${modelId}`
        )
        setModel(data)
      } catch (err) {
        console.error("Error fetching hydro model:", err)
        setError("Failed to load hydro model")
      } finally {
        setIsLoading(false)
      }
    }

    fetchModel()
  }, [modelId])

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !model) {
    return (
      <div className="p-4 text-sm text-destructive">
        {error || "Failed to load model"}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {model.name}
        </h3>
        {model.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {model.description}
          </p>
        )}
      </div>

      {/* Placeholder for future content */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground italic">
          Model objects and analysis tools will appear here.
        </p>
      </div>
    </div>
  )
}
