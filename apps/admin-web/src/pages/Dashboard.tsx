"use client"

import { useEffect, useState } from "react"
import { Briefcase, Building2, Users } from "lucide-react"
import { StatCard } from "../components/StatCard"
import { UserPositionChart } from "../components/charts/UserPositionChart"
import { ProjectsTable } from "../components/tables/ProjectsTable"
import apiClient from "@/lib/api"

interface Project {
  id: string
  name: string
  status?: string
}

interface User {
  id: string
  position?: string
}

export function Dashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    companies: 0,
    users: 0,
  })
  const [projectsData, setProjectsData] = useState<Project[]>([])
  const [userPositions, setUserPositions] = useState<
    Array<{ x: string; y: number }>
  >([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch projects
        const projectsRes = await apiClient.get("/projects")
        const projects = Array.isArray(projectsRes.data)
          ? projectsRes.data
          : projectsRes.data.projects || []
        setStats((prev) => ({ ...prev, projects: projects.length }))
        setProjectsData(projects.slice(0, 10))

        // Fetch companies
        const companiesRes = await apiClient.get("/companies")
        const companies = Array.isArray(companiesRes.data)
          ? companiesRes.data
          : companiesRes.data.companies || []
        setStats((prev) => ({ ...prev, companies: companies.length }))

        // Fetch users
        const usersRes = await apiClient.get("/users")
        const users = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data.users || []
        setStats((prev) => ({ ...prev, users: users.length }))

        // Process user positions for donut chart
        const positionCounts: Record<string, number> = {}
        users.forEach((user: User) => {
          const position = user.position || "Unassigned"
          positionCounts[position] = (positionCounts[position] || 0) + 1
        })

        const chartData = Object.entries(positionCounts).map(
          ([position, count]) => ({
            x: position,
            y: count,
          })
        )
        setUserPositions(chartData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your projects, companies, and team
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Projects"
          value={stats.projects}
          icon={Briefcase}
          description="Active projects across all companies"
        />
        <StatCard
          title="Total Companies"
          value={stats.companies}
          icon={Building2}
          description="Registered companies in the system"
        />
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={Users}
          description="Team members and staff"
        />
      </div>

      {/* Charts and Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <UserPositionChart data={userPositions} />
        <ProjectsTable projects={projectsData} />
      </div>
    </div>
  )
}
