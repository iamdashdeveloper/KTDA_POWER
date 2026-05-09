import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { ApiClient } from "@/lib/api"
import { CheckCircle } from "lucide-react"
import {
  RegistrationStepper,
  type StepProps,
} from "@/components/ui/registration-stepper"

const OnboardingSchema = z.object({
  position: z.string().min(1, "Position is required").max(255),
  bio: z.string().max(500).optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
})

type OnboardingFormData = z.infer<typeof OnboardingSchema>

interface OnboardingStepperProps {
  user: any
  onComplete?: (userData: any) => void
  onSkip?: () => void
}

export function OnboardingStepper({
  user,
  onComplete,
  onSkip,
}: OnboardingStepperProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingSchema),
  })

  const position = watch("position")
  const bio = watch("bio")

  const canProceedStep1 = position && position.length > 0
  const canProceedStep2 = true // Bio is optional

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true)

    try {
      const result = await ApiClient.post<{ user: any }>("/auth/onboarding", data)
      localStorage.setItem("user", JSON.stringify(result.user))
      toast.success("Profile completed successfully!")
      onComplete?.(result.user)
    } catch (err: any) {
      toast.error(err.message || "An error occurred during onboarding")
    } finally {
      setIsLoading(false)
    }
  }

  // Step content renderers
  const stepContent: StepProps[] = [
    {
      step: 1,
      title: "Position",
      description: "Tell us your role",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">What's your position?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Let us know your role in the organization
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Position</label>
            <Input
              {...register("position")}
              placeholder="e.g., Field Manager, Data Collector, etc."
              disabled={isLoading}
              className="text-base"
            />
            {errors.position && (
              <p className="text-sm text-red-600">{errors.position.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceedStep1 || isLoading}
              className="flex-1"
            >
              Next
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isLoading}
            className="w-full"
          >
            Skip for now
          </Button>
        </div>
      ),
    },
    {
      step: 2,
      title: "Bio",
      description: "Add a short bio",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Tell us about yourself</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a short bio (optional, max 500 characters)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              {...register("bio")}
              placeholder="Share a bit about your experience and interests..."
              disabled={isLoading}
              className="min-h-32 text-base"
            />
            {bio && (
              <p className="text-xs text-muted-foreground">
                {bio.length}/500 characters
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceedStep2 || isLoading}
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </div>
      ),
    },
    {
      step: 3,
      title: "Complete",
      description: "You're all set",
      content: (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Welcome, {user?.firstName}!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your profile is now complete. You can now access all features of
              Field Tool.
            </p>
          </div>

          {user && (
            <div className="rounded-lg bg-muted p-4 text-left">
              <p className="text-sm">
                <span className="font-medium">Name:</span> {user.firstName}{" "}
                {user.lastName}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Position:</span>{" "}
                {getValues("position")}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Completing..." : "Complete Onboarding"}
            </Button>
          </form>
        </div>
      ),
    },
  ]

  return (
    <div className="flex min-h-screen px-4 py-12">
      <RegistrationStepper
        currentStep={currentStep}
        steps={stepContent}
        headerTitle="Complete Your Profile"
        headerStatus="Profile Setup"
      />
    </div>
  )
}
