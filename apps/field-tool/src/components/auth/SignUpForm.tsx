import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Mail, Lock, User, Building2, AlertCircle } from "lucide-react"
import { ApiClient } from "@/lib/api"

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  companyId: z.string().min(1, "Company is required"),
})

type SignupFormData = z.infer<typeof SignupSchema>

interface SignUpFormProps {
  onSuccess?: (token: string, user: any) => void
  onNavigateToSignin?: () => void
}

interface Company {
  id: string
  name: string
}

export function SignUpForm({ onSuccess, onNavigateToSignin }: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [apiError, setApiError] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
  })

  const companyId = watch("companyId")

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setApiError("")
        const data = await ApiClient.get<Company[]>("/companies")
        setCompanies(Array.isArray(data) ? data : [])
      } catch (err: any) {
        const errorMsg = err.message || "Failed to fetch companies"
        setApiError(errorMsg)
        console.error("Failed to fetch companies:", err)
        toast.error("Failed to load companies", {
          description: errorMsg,
        })
      }
    }

    fetchCompanies()
  }, [])

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    setApiError("")

    try {
      const result = await ApiClient.post<{ token: string; user: any }>(
        "/auth/register",
        data
      )

      localStorage.setItem("authToken", result.token)
      localStorage.setItem("user", JSON.stringify(result.user))
      toast.success("Account created successfully!")
      onSuccess?.(result.token, result.user)
    } catch (err: any) {
      const errorMsg = err.message || "An error occurred during registration"
      setApiError(errorMsg)
      toast.error("Registration failed", {
        description: errorMsg,
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">Create Account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up to get started with Field Tool
          </p>
        </div>

        {apiError && (
          <div className="flex gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Connection Error</p>
              <p className="mt-1 text-xs">{apiError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                First Name
              </label>
              <Input
                {...register("firstName")}
                placeholder="John"
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 text-sm font-medium">Last Name</label>
              <Input
                {...register("lastName")}
                placeholder="Doe"
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <Input
              {...register("email")}
              type="email"
              placeholder="your@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" />
              Password
            </label>
            <Input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              Company
            </label>
            <Select
              value={companyId}
              onValueChange={(value) => setValue("companyId", value)}
            >
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.companyId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.companyId.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="border-t pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={onNavigateToSignin}
              className="font-medium text-primary hover:opacity-80"
            >
              Sign in
            </button>
          </p>
        </div>
      </Card>
    </div>
  )
}
