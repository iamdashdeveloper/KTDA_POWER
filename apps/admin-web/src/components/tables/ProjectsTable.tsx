"use client"

import { Card } from "@workspace/ui/components/card"

interface Project {
  id: string
  name: string
  status?: string
}

interface ProjectsTableProps {
  projects: Project[]
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <Card className="overflow-hidden p-0 lg:col-span-2">
      <div className="border-b p-6">
        <h2 className="text-lg font-semibold">Recent Projects</h2>
      </div>
      {projects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b hover:bg-muted/50">
                  <td className="px-6 py-3 text-sm">{project.name}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        project.status === "active"
                          ? "bg-green-100 text-green-800"
                          : project.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {project.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          No projects found
        </p>
      )}
    </Card>
  )
}
