import React, { useState, useEffect } from "react"
import {
  Cloud,
  HelpCircle,
  ChevronDown,
  Search,
  Bell,
  Settings,
  LogIn,
} from "lucide-react"
import DefaultLoader from "../Logo"
import { useNavigate } from "react-router-dom"
import { LoginModal } from "../auth/LoginModal"

import { useProjectStore } from "@/store/useProjectStore"

export const Header: React.FC = () => {
  const navigate = useNavigate()
  const { activeProject } = useProjectStore()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLoginSuccess = (_token: string, userData: any) => {
    setUser(userData)
  }

  return (
    <div className="flex h-10 items-center justify-between bg-zinc-950 px-3 text-zinc-200 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <DefaultLoader className="h-10 w-10" />
          <span className="text-[11px] font-semibold tracking-wide text-zinc-100 uppercase">
            KTPC Portal
          </span>
        </div>

        <div className="mx-1 h-4 w-[1px] bg-zinc-800" />

        <div className="flex items-center gap-3 text-zinc-400">
          <span
            onClick={() => navigate("/projects")}
            className="cursor-pointer border-b-2 border-primary pb-0.5 text-[11px] font-bold text-primary transition-colors hover:text-zinc-100"
          >
            {activeProject?.name || "Select Project"}
          </span>
        </div>
      </div>

      <div className="mx-8 flex max-w-md flex-1 justify-center">
        <div className="group relative flex w-full items-center justify-center">
          <Search
            size={12}
            className="absolute top-1/2 left-2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary"
          />
          <input
            type="text"
            placeholder="Search commands and tools"
            className="w-full border-none bg-zinc-900 py-0.5 pr-2 pl-8 text-[10px] text-zinc-300 transition-all focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-full cursor-pointer items-center gap-2 px-2 transition-colors hover:bg-zinc-800">
          <Cloud size={14} className="text-emerald-400" />
          <span className="text-[10px] text-zinc-300">Online</span>
        </div>
        <Bell
          size={14}
          className="cursor-pointer text-zinc-400 hover:text-zinc-100"
        />
        <Settings
          size={14}
          className="cursor-pointer text-zinc-400 hover:text-zinc-100"
        />

        {user ? (
          <div className="group flex h-full cursor-pointer items-center gap-2 px-2 transition-colors hover:bg-zinc-800">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <span className="text-[10px] text-zinc-300 group-hover:text-zinc-100">
              {user.firstName} {user.lastName}
            </span>
            <ChevronDown size={10} className="text-zinc-500" />
          </div>
        ) : (
          <div
            onClick={() => setIsLoginOpen(true)}
            className="flex h-full cursor-pointer items-center gap-2 px-3 text-primary transition-colors hover:bg-zinc-800"
          >
            <LogIn size={14} />
            <span className="text-[10px] font-bold tracking-tight uppercase">
              Sign In
            </span>
          </div>
        )}

        <HelpCircle
          size={14}
          className="cursor-pointer text-zinc-400 hover:text-zinc-100"
        />
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
