import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { Mail, Lock, AlertCircle } from "lucide-react"
import { apiRequest } from "@/lib/api-config"

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof LoginSchema>

interface SignInFormProps {
  onSuccess?: (token: string, user: any) => void
  onNavigateToSignup?: () => void
}

export function SignInForm({ onSuccess, onNavigateToSignup }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setApiError("")

    try {
      const result = await apiRequest<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      })

      localStorage.setItem("authToken", result.token)
      localStorage.setItem("user", JSON.stringify(result.user))
      toast.success("Signed in successfully!")
      onSuccess?.(result.token, result.user)
    } catch (err: any) {
      const errorMsg = err.message || "An error occurred during login"
      setApiError(errorMsg)
      toast.error("Sign in failed", {
        description: errorMsg,
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">Sign In</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your account to continue
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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="border-t pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              onClick={onNavigateToSignup}
              className="font-medium text-primary hover:opacity-80"
            >
              Sign up
            </button>
          </p>
        </div>
      </Card>
    </div>
  )
}
