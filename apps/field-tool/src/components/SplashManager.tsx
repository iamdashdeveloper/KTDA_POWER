// src/components/SplashManager.tsx
import React, { useEffect, useState } from "react"
import { SplashScreen } from "@capacitor/splash-screen"
import DefaultLoader from "./Logo.tsx"

export const SplashManager = ({ children }: { children: React.ReactNode }) => {
  const [isInitializing, setIsInitializing] = useState(true)
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    const sequence = async () => {
      // 1. Wait a beat to ensure React has painted the DefaultLoader
      await new Promise((res) => setTimeout(res, 500))

      // 2. Hide the native static splash screen
      await SplashScreen.hide({
        fadeOutDuration: 400, // Smoothly reveals the spinning React loader
      })

      // 3. Simulate your KTDA data/telemetry initialization
      // Replace this timeout with your actual setup logic
      await new Promise((res) => setTimeout(res, 2500))

      // 4. Start fading out the React loader
      setIsInitializing(false)

      // 5. Remove the loader from DOM after transition
      setTimeout(() => setShowLoader(false), 500)
    }

    sequence()
  }, [])

  return (
    <>
      {showLoader && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isInitializing ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
          }}
        >
          <DefaultLoader rotationSpeed={2} />
        </div>
      )}
      {children}
    </>
  )
}
