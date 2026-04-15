"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface ThemeContextType {
  themeName: "light" | "dark"
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
  themeName: "light",
  toggleTheme: () => {},
})

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<"light" | "dark">("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if html element has 'dark' class (from app's theme provider)
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark")
      setThemeName(isDark ? "dark" : "light")
    }

    // Initial check
    updateTheme()

    // Watch for class changes on html element
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    setThemeName((prev) => (prev === "light" ? "dark" : "light"))
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeName() {
  return useContext(ThemeContext)
}
