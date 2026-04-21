import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SignInForm } from "@/components/auth/SignInForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { OnboardingStepper } from "@/components/auth/OnboardingStepper"

export default function AuthPage() {
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "onboarding">(
    "signin"
  )
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Check if user is already authenticated
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    const authToken = localStorage.getItem("authToken")

    if (savedUser && authToken) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)

        // If user is not onboarded, show onboarding
        if (!user.isOnboarded) {
          setAuthMode("onboarding")
        } else {
          // Redirect to home if fully authenticated and onboarded
          navigate("/home", { replace: true })
          return
        }
      } catch (error) {
        console.error("Failed to parse user data:", error)
        localStorage.removeItem("user")
        localStorage.removeItem("authToken")
      }
    }
  }, [navigate])

  const handleSignInSuccess = (_token: string, user: any) => {
    setCurrentUser(user)

    if (user.isOnboarded) {
      navigate("/home")
    } else {
      setAuthMode("onboarding")
    }
  }

  const handleSignUpSuccess = (_token: string, user: any) => {
    setCurrentUser(user)
    setAuthMode("onboarding")
  }

  const handleOnboardingComplete = (userData: any) => {
    setCurrentUser({ ...currentUser, ...userData })
    navigate("/home")
  }

  const handleOnboardingSkip = () => {
    navigate("/home")
  }

  return (
    <div>
      {authMode === "signin" && (
        <SignInForm
          onSuccess={handleSignInSuccess}
          onNavigateToSignup={() => setAuthMode("signup")}
        />
      )}

      {authMode === "signup" && (
        <SignUpForm
          onSuccess={handleSignUpSuccess}
          onNavigateToSignin={() => setAuthMode("signin")}
        />
      )}

      {authMode === "onboarding" && currentUser && (
        <OnboardingStepper
          user={currentUser}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  )
}
