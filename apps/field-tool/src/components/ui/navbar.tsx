import { Bell, User2, ChevronDown, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState, useRef, useEffect } from "react"
import DefaultLoader from "../Logo"
import { useProjectStore } from "@/store/useProjectStore"
import { Button } from "@workspace/ui/components/button"

const Navbar = () => {
  const navigate = useNavigate()
  const { activeProject, clearActiveProject } = useProjectStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSwitchProject = () => {
    setIsDropdownOpen(false)
    clearActiveProject()
    navigate("/projects")
  }

  return (
    <div className="z-50 flex h-16 w-full flex-row items-center justify-between bg-card px-4 shadow-2xl">
      <div>
        <DefaultLoader className="h-12 w-12" />
      </div>
      <div className="flex items-center gap-4">
        {activeProject && (
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="gap-2"
            >
              <span className="text-sm font-medium text-foreground">
                {activeProject.name}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </Button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg">
                <div className="p-1">
                  <button
                    onClick={handleSwitchProject}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    Switch Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <Bell />
        <User2 />
      </div>
    </div>
  )
}

export default Navbar
