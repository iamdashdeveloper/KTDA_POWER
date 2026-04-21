import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@workspace/ui/styles/globals.css"
import { SplashManager } from "./components/SplashManager"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SplashManager>
        <App />
      </SplashManager>
    </ThemeProvider>
  </StrictMode>
)
