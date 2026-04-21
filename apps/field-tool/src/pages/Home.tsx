import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import FeatureMap from "@/components/maps/FeatureMap"
import { Page } from "konsta/react"

export default function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    const authToken = localStorage.getItem("authToken")

    // Redirect to auth if not logged in
    if (!savedUser || !authToken) {
      navigate("/auth", { replace: true })
      return
    }

    try {
      const user = JSON.parse(savedUser)

      // Redirect to auth if not onboarded
      if (!user.isOnboarded) {
        navigate("/auth", { replace: true })
        return
      }
    } catch (error) {
      console.error("Failed to parse user data:", error)
      navigate("/auth", { replace: true })
    }
  }, [navigate])

  return (
    <Page>
      <FeatureMap />
    </Page>
  )
}
