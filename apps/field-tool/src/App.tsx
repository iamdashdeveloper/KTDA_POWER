import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"
import { App as KonstaApp } from "konsta/react"
import { Toaster } from "@workspace/ui/components/sonner"
import RootLayout from "./layouts/RootLayout"
import Home from "./pages/Home"
import Sensors from "./pages/Sensors"
import Data from "./pages/Data"
import Auth from "./pages/Auth"
import Tasks from "./pages/Tasks"
import ProjectManager from "./pages/ProjectManager"
import { ProtectedRoute } from "./components/ProtectedRoute"

function App() {
  return (
    <KonstaApp>
      <Toaster />
      <Router>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute requireProject={true}>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sensors"
              element={
                <ProtectedRoute requireProject={true}>
                  <Sensors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data"
              element={
                <ProtectedRoute requireProject={true}>
                  <Data />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute requireProject={true}>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectManager />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </Router>
    </KonstaApp>
  )
}

export default App
