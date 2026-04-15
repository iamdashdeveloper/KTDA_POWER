import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Loader2 } from "lucide-react"

interface SaveParcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: ParcelFormData) => Promise<void>
  isLoading?: boolean
}

export interface ParcelFormData {
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
  ownerAddress?: string
  parcelName?: string
  parcelDescription?: string
  area?: number
}

export function SaveParcelDialog({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: SaveParcelDialogProps) {
  const [formData, setFormData] = useState<ParcelFormData>({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerAddress: "",
    parcelName: "",
    parcelDescription: "",
  })

  const [step, setStep] = useState<"owner" | "parcel">("owner")
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null)

  const handleInputChange = (
    field: keyof ParcelFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCheckEmail = async () => {
    if (!formData.ownerEmail) return

    try {
      const response = await fetch(
        `http://localhost:3001/owners?email=${formData.ownerEmail}`
      )
      const data = await response.json()
      setOwnerExists(data.owners && data.owners.length > 0)
    } catch (error) {
      console.error("Error checking email:", error)
    }
  }

  const handleNextStep = async () => {
    if (ownerExists === null) {
      await handleCheckEmail()
    }
    if (step === "owner" && formData.ownerEmail) {
      setStep("parcel")
    }
  }

  const handleSave = async () => {
    await onSave(formData)
    setFormData({
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerAddress: "",
      parcelName: "",
      parcelDescription: "",
    })
    setStep("owner")
    setOwnerExists(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Parcel</DialogTitle>
          <DialogDescription>
            {step === "owner"
              ? "Enter owner information"
              : "Enter parcel details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "owner" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name *</Label>
                <Input
                  id="ownerName"
                  placeholder="John Doe"
                  value={formData.ownerName}
                  onChange={(e) =>
                    handleInputChange("ownerName", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email Address *</Label>
                <div className="flex gap-2">
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="owner@example.com"
                    value={formData.ownerEmail}
                    onChange={(e) =>
                      handleInputChange("ownerEmail", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
                {ownerExists !== null && (
                  <p className="text-sm">
                    {ownerExists ? (
                      <span className="text-blue-600">
                        ✓ Owner found in database
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        New owner will be created
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Phone (Optional)</Label>
                <Input
                  id="ownerPhone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.ownerPhone}
                  onChange={(e) =>
                    handleInputChange("ownerPhone", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerAddress">Address (Optional)</Label>
                <Input
                  id="ownerAddress"
                  placeholder="123 Main St, City, Country"
                  value={formData.ownerAddress}
                  onChange={(e) =>
                    handleInputChange("ownerAddress", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {step === "parcel" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="parcelName">Parcel Name (Optional)</Label>
                <Input
                  id="parcelName"
                  placeholder="East Field"
                  value={formData.parcelName}
                  onChange={(e) =>
                    handleInputChange("parcelName", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parcelDescription">
                  Description (Optional)
                </Label>
                <Textarea
                  id="parcelDescription"
                  placeholder="Brief description of the parcel..."
                  value={formData.parcelDescription}
                  onChange={(e) =>
                    handleInputChange("parcelDescription", e.target.value)
                  }
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area (m²) - Optional</Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="5000"
                  value={formData.area || ""}
                  onChange={(e) =>
                    handleInputChange("area", parseFloat(e.target.value) || 0)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Owner: <strong>{formData.ownerName}</strong>
                  <br />
                  Email: <strong>{formData.ownerEmail}</strong>
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "parcel" && (
            <Button
              variant="outline"
              onClick={() => setStep("owner")}
              disabled={isLoading}
            >
              Back
            </Button>
          )}

          {step === "owner" && (
            <Button
              onClick={handleNextStep}
              disabled={
                !formData.ownerName || !formData.ownerEmail || isLoading
              }
            >
              Next
            </Button>
          )}

          {step === "parcel" && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Parcel"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
