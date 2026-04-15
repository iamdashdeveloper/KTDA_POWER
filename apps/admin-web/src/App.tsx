import { BrowserRouter, Routes, Route } from "react-router-dom"
import { useEffect } from "react"
import { RootLayout } from "./layouts/RootLayout"
import { Dashboard } from "./pages/Dashboard"
import { Users } from "./pages/Users"
import { Permissions } from "./pages/Permissions"
import { Projects } from "./pages/Projects"
import { ProjectDetail } from "./pages/ProjectDetail"
import { Companies } from "./pages/Companies"
import { CompanyDetail } from "./pages/CompanyDetail"
import { Articles } from "./pages/Articles"
import { UserCreate } from "./pages/UserCreate"
import { PermissionCreate } from "./pages/PermissionCreate"
import ProjectCreate from "./pages/ProjectCreate"
import { CompanyCreate } from "./pages/CompanyCreate"
import { ArticleCreate } from "./pages/ArticleCreate"
import { IssueCreate } from "./pages/IssueCreate"
import { Cadastre } from "./pages/Cadastre"
import { Features } from "./pages/Features"
export function App() {
  // Remove Syncfusion license validation banner
  useEffect(() => {
    const removeSyncfusionBanner = () => {
      const overlay = document.querySelector(
        'div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.5)"][style*="z-index: 99999"]'
      )
      if (overlay) {
        overlay.remove()
      }
    }

    // Remove immediately in case it's already loaded
    removeSyncfusionBanner()

    // Set up observer to catch future appearances
    const observer = new MutationObserver(() => {
      removeSyncfusionBanner()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Cleanup observer on unmount
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/add" element={<UserCreate />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/permissions/create" element={<PermissionCreate />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/create" element={<CompanyCreate />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/create" element={<ArticleCreate />} />
          <Route path="/issues/create" element={<IssueCreate />} />
          <Route path="/features" element={<Features />} />
          <Route path="/cadastre" element={<Cadastre />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
