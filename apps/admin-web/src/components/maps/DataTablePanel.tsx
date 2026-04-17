import { useState, useRef, useEffect } from "react"
import { Trash2, Eye } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { toast } from "sonner"
import { apiClient } from "../../lib/api"
import type { Feature } from "../../types/feature"

interface DataTablePanelProps {
  features: Feature[]
  onFeatureSelect?: (feature: Feature) => void
  onFeaturesChange?: () => void
}

export function DataTablePanel({
  features,
  onFeatureSelect,
  onFeaturesChange,
}: DataTablePanelProps) {
  const [height, setHeight] = useState(300)
  const [isDragging, setIsDragging] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "date">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  // Mouse down handler for resize
  const handleMouseDown = () => {
    setIsDragging(true)
  }

  // Mouse move handler for resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return

      const newHeight = window.innerHeight - e.clientY
      if (newHeight > 150 && newHeight < 600) {
        setHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging])

  // Filter and sort features
  const filteredFeatures = features
    .filter((f) => {
      // Only show features with parentId (child features)
      if (!f.parentId) return false
      return f.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name)
      } else {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete feature "${name}"?`)) return

    try {
      await apiClient.delete(`/features/${id}`)
      toast.success("Feature deleted")
      onFeaturesChange?.()
    } catch (error) {
      console.error("Error deleting feature:", error)
      toast.error("Failed to delete feature")
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFeatures.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredFeatures.map((f) => f.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (
      !confirm(
        `Delete ${selectedIds.size} feature${selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.`
      )
    )
      return

    try {
      const ids = Array.from(selectedIds)
      const deletePromises = ids.map((id) =>
        apiClient.delete(`/features/${id}`)
      )
      await Promise.all(deletePromises)
      toast.success(
        `Deleted ${ids.length} feature${ids.length !== 1 ? "s" : ""}`
      )
      setSelectedIds(new Set())
      onFeaturesChange?.()
    } catch (error) {
      console.error("Error deleting features:", error)
      toast.error("Failed to delete some features")
    }
  }

  const toggleSort = (field: "name" | "date") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  return (
    <div
      ref={panelRef}
      className="flex h-full flex-col border-t bg-background"
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div
        ref={handleRef}
        onMouseDown={handleMouseDown}
        className={`h-1 cursor-ns-resize bg-border transition-colors hover:bg-primary ${
          isDragging ? "bg-primary" : ""
        }`}
      />

      {/* Header */}
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Features</h3>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-900">
                {selectedIds.size} selected
              </span>
            )}
            <span className="rounded bg-muted px-2 py-1 text-xs">
              {filteredFeatures.length}
            </span>
          </div>
        </div>

        <Input
          placeholder="Search features..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
        />

        <div className="flex gap-2">
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("name")}
          >
            Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
          <Button
            variant={sortBy === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("date")}
          >
            Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="ml-auto gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredFeatures.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {features.length === 0
              ? "No features yet"
              : "No features match your search"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-muted/50">
              <tr>
                <th className="w-12 px-4 py-2">
                  <Checkbox
                    checked={
                      filteredFeatures.length > 0 &&
                      selectedIds.size === filteredFeatures.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Created</th>
                <th className="px-4 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feature) => (
                <tr
                  key={feature.id}
                  className={`border-b transition-colors ${
                    selectedIds.has(feature.id)
                      ? "bg-blue-50 hover:bg-blue-100"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-2">
                    <Checkbox
                      checked={selectedIds.has(feature.id)}
                      onCheckedChange={() => toggleSelection(feature.id)}
                    />
                  </td>
                  <td className="cursor-pointer truncate px-4 py-2 font-medium hover:text-primary">
                    <span
                      onClick={() => onFeatureSelect?.(feature)}
                      title={feature.name}
                    >
                      {feature.name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(feature.createdAt).toLocaleDateString()}
                  </td>
                  <td className="flex justify-center gap-1 px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFeatureSelect?.(feature)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(feature.id, feature.name)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
