import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@workspace/ui/styles/globals.css"
import "ol/ol.css"
import "./index.css"
import App from './App.tsx'
import { ThemeProvider } from "@/components/theme-provider"
import { LayoutProvider } from "./context/LayoutContext"

import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LayoutProvider>
          <App />
        </LayoutProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
