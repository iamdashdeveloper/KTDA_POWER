import React, { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "sonner"
import { Upload, X, FileJson, MapPin, Loader2 } from "lucide-react"
import { ApiClient } from "@/lib/api"
import { useProjectStore } from "@/store/useProjectStore"
import { useMapStore } from "@/store/useMapStore"

interface AddLayerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProjectOption {
  id: string
  name: string
}

export const AddLayerModal: React.FC<AddLayerModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { activeProject } = useProjectStore()
  const { triggerRefresh } = useMapStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [name, setName] = useState("")
  const [details, setDetails] = useState("")
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [associateWithProject, setAssociateWithProject] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedFileTypes = [
    "application/vnd.google-earth.kml+xml",
    "application/vnd.google-earth.kmz",
    "application/json",
    "application/geo+json",
    "application/x-kmz",
  ]

  useEffect(() => {
    if (!open) return

    // Default to active project if available
    if (activeProject) {
      setSelectedProjectId(activeProject.id)
    }

    const fetchProjects = async () => {
      try {
        setProjectsLoading(true)
        const response = await ApiClient.get<ProjectOption[]>("/projects")
        setProjects(response)
      } catch (error) {
        console.error("Error fetching projects:", error)
        toast.error("Failed to load projects")
      } finally {
        setProjectsLoading(false)
      }
    }

    fetchProjects()
  }, [open, activeProject])

  const isValidFile = (file: File) => {
    return (
      acceptedFileTypes.includes(file.type) ||
      /\.(kml|kmz|geojson|json)$/i.test(file.name)
    )
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) return

    if (!isValidFile(file)) {
      toast.error("Invalid file type", {
        description: "Please upload KML, KMZ, or GeoJSON files",
      })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 50 MB",
      })
      return
    }

    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected")
      return
    }

    try {
      setUploadLoading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (name) {
        formData.append("name", name)
      }
      if (associateWithProject && selectedProjectId) {
        formData.append("projectId", selectedProjectId)
      }
      if (details) {
        formData.append("details", details)
      }

      const response = await ApiClient.postForm<any>(
        "/features/upload",
        formData
      )

      if (response.success) {
        // If it's a scratch layer, save the ID locally
        if (!associateWithProject) {
          const scratchLayers = JSON.parse(
            localStorage.getItem("scratch_layers") || "[]"
          )
          const parentFeature =
            response.features?.[0]?.parentId || response.features?.[0]?.id
          if (parentFeature && !scratchLayers.includes(parentFeature)) {
            scratchLayers.push(parentFeature)
            localStorage.setItem(
              "scratch_layers",
              JSON.stringify(scratchLayers)
            )
          }
        }
        const count = response.count || 0

        if (count === 0) {
          toast.warning("File processed but no features found", {
            description:
              response.message ||
              "The file may not contain any valid geographic features",
          })
        } else {
          toast.success("Features uploaded successfully", {
            description: `${count} feature${count !== 1 ? "s" : ""} added to the map`,
          })

          // Trigger map refresh to show new features
          triggerRefresh()
        }

        handleClose()
      } else {
        toast.error("Upload failed", {
          description: response.message || "Unknown error",
        })
      }
    } catch (error: any) {
      console.error("Error uploading file:", error)
      toast.error("Failed to upload file", {
        description: error.message || "Please check your file and try again",
      })
    } finally {
      setUploadLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setName("")
    setDetails("")
    setSelectedProjectId("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onOpenChange(false)
  }

  const getFileIcon = (filename: string) => {
    if (
      filename.toLowerCase().endsWith(".kmz") ||
      filename.toLowerCase().endsWith(".kml")
    ) {
      return <MapPin className="h-6 w-6 text-blue-500" />
    }
    return <FileJson className="h-6 w-6 text-green-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Spatial Layer</DialogTitle>
          <DialogDescription>
            Upload KML, KMZ or GeoJSON files to add them to your map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div
            className={`rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <div className="flex flex-col items-center justify-center">
                <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <label
                    htmlFor="geo-file-upload"
                    className="cursor-pointer font-medium text-primary hover:underline"
                  >
                    Choose file to upload
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or drag and drop
                  </p>
                  <input
                    ref={fileInputRef}
                    id="geo-file-upload"
                    type="file"
                    accept=".kml,.kmz,.geojson,.json"
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                </div>
                <p className="mt-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Supported: KML, KMZ, GeoJSON
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.name)}
                  <div className="overflow-hidden">
                    <p className="max-w-[200px] truncate text-sm font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">
                  Associate with Project
                </label>
                <p className="text-xs text-muted-foreground">
                  Tie these features to the selected project
                </p>
              </div>
              <input
                type="checkbox"
                checked={associateWithProject}
                onChange={(e) => setAssociateWithProject(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>

            {associateWithProject && (
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Target Project
                </label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={projectsLoading}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue
                      placeholder={
                        projectsLoading
                          ? "Loading projects..."
                          : "Select project"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Layer Name (Optional)
              </label>
              <Input
                placeholder="e.g., Drainage Network, Service Points..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Description (Optional)
              </label>
              <Textarea
                placeholder="Details about this layer..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploadLoading}
            className="h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              uploadLoading ||
              (associateWithProject && !selectedProjectId)
            }
            className="h-9 gap-2 px-6"
          >
            {uploadLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Add Layer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
