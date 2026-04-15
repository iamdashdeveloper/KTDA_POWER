import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { Upload, Trash2, Eye } from "lucide-react"
import { apiClient } from "../lib/api"

interface Feature {
  id: string
  name: string
  projectId: string
  geometry?: any
  createdAt: string
  details?: any
  images?: string[]
  parentId?: string
}

export function Features() {
  const navigate = useNavigate()
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchFeatures()
  }, [])

  const fetchFeatures = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get("/features")
      setFeatures(response.data || [])
    } catch (error) {
      console.error("Error fetching features:", error)
      toast.error("Failed to load features")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return

    try {
      await apiClient.delete(`/features/${id}`)
      toast.success("Feature deleted successfully")
      fetchFeatures()
    } catch (error) {
      console.error("Error deleting feature:", error)
      toast.error("Failed to delete feature")
    }
  }

  // Pagination
  const totalPages = Math.ceil(features.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedFeatures = features.slice(startIdx, startIdx + itemsPerPage)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Features</h1>
          <p className="text-muted-foreground">Manage geographical features</p>
        </div>
        <Button onClick={() => navigate("/features/upload")} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload GeoData
        </Button>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="p-8 text-center">Loading features...</div>
        ) : features.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No features found. Try uploading a GeoJSON or KML file.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Project</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFeatures.map((feature) => (
                    <tr key={feature.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {feature.id}
                      </td>
                      <td className="px-4 py-3">{feature.name || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {feature.projectId}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(feature.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/features/${feature.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(feature.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-sm text-muted-foreground">
                {features.length} features
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
