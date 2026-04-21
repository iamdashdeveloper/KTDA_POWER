import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useProjectStore } from "@/store/useProjectStore"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: ReactNode
  requireProject?: boolean
}

export function ProtectedRoute({
  children,
  requireProject = false,
}: ProtectedRouteProps) {
  const navigate = useNavigate()
  const { activeProject, isInitialized, setIsInitialized } = useProjectStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("authToken")
    const user = localStorage.getItem("user")

    if (!token || !user) {
      navigate("/auth", { replace: true })
      return
    }

    // If route requires a project and none is selected, redirect to project manager
    if (requireProject && !activeProject) {
      navigate("/projects", { replace: true })
      return
    }

    // Mark as initialized and ready to render
    if (!isInitialized) {
      setIsInitialized(true)
    }
    setIsReady(true)
  }, [activeProject, requireProject, navigate, isInitialized, setIsInitialized])

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
