import React, { useEffect, useState } from "react"
import { Loader2, AlertCircle, Search, Download, Filter } from "lucide-react"
import { useProjectStore } from "@/store/useProjectStore"
import { loadProjectFeatures, loadProjectIssues } from "@/lib/mapData"

interface ProjectDataTableProps {
  layerId: string
  layerName: string
}

export const ProjectDataTable: React.FC<ProjectDataTableProps> = ({
  layerId,
  layerName,
}) => {
  const activeProject = useProjectStore((state) => state.activeProject)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeProject) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        let results: any[] = []
        if (layerId === "project-features") {
          results = await loadProjectFeatures(activeProject.id)
        } else if (layerId === "project-issues") {
          results = await loadProjectIssues(activeProject.id)
        } else if (layerId.startsWith("group-")) {
          const groupName = layerId.replace("group-", "")
          const all = await loadProjectFeatures(activeProject.id)
          results = all.filter(
            (f) => (f.groupName || "Other Features") === groupName
          )
        }
        setData(results)
      } catch (err) {
        setError("Failed to load layer data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeProject, layerId])

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-[11px] font-medium">Querying {layerName}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-destructive">
        <AlertCircle size={24} />
        <span className="text-[11px] font-medium">{error}</span>
      </div>
    )
  }

  // Get columns from first data item
  const columns =
    data.length > 0
      ? Object.keys(data[0]).filter(
          (k) => k !== "geometry" && k !== "location" && k !== "metadata"
        )
      : []

  return (
    <div className="flex h-full flex-col">
      {/* Table Toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
            <span>{layerName}</span>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
              {data.length} records
            </span>
          </div>
          <div className="mx-1 h-4 w-px bg-border" />
          <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            <Filter size={12} />
            Filter
          </button>
          <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            <Download size={12} />
            Export
          </button>
        </div>
        <div className="relative">
          <Search
            size={12}
            className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search attributes..."
            className="w-48 rounded border border-border bg-muted/50 px-2 py-1 pl-7 text-[10px] outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-auto bg-background">
        <table className="w-full min-w-max border-collapse text-[10px]">
          <thead className="sticky top-0 z-10 bg-muted shadow-sm">
            <tr>
              <th className="w-10 border-r border-b border-border bg-muted p-1.5 text-left">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-r border-b border-border p-1.5 text-left font-bold tracking-tighter text-muted-foreground uppercase"
                >
                  {col.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                className="group border-b border-border/50 transition-colors hover:bg-primary/5"
              >
                <td className="border-r border-border/50 bg-muted/30 p-1.5 text-center text-muted-foreground group-hover:bg-primary/10">
                  {i + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[200px] truncate border-r border-border/50 p-1.5 text-foreground"
                  >
                    {typeof row[col] === "object"
                      ? JSON.stringify(row[col])
                      : String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="flex h-6 shrink-0 items-center border-t border-border bg-muted/50 px-3 text-[9px] text-muted-foreground">
        <span>Selected: 0</span>
        <span className="mx-3">|</span>
        <span>Filter: All</span>
      </div>
    </div>
  )
}
