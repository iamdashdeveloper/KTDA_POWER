import { useState, useRef, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "sonner"
import { Upload, X, FileJson, MapPin } from "lucide-react"
import { apiClient } from "../lib/api"

interface Project {
  id: string
  name: string
}

interface GeoDataUploadProps {
  onUploadSuccess?: (count: number) => void
  className?: string
}

export function GeoDataUpload({
  onUploadSuccess,
  className = "",
}: GeoDataUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [details, setDetails] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get("/projects")
      setProjects(response.data || [])
      if (response.data && response.data.length > 0) {
        setSelectedProjectId(response.data[0].id)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast.error("Failed to load projects")
    } finally {
      setProjectsLoading(false)
    }
  }

  const acceptedFileTypes = [
    "application/vnd.google-earth.kml+xml",
    "application/vnd.google-earth.kmz",
    "application/json",
    "application/geo+json",
    "application/x-kmz",
  ]

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

    if (!selectedProjectId) {
      toast.error("Please select a project")
      return
    }

    try {
      setUploadLoading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("projectId", selectedProjectId)
      if (details) {
        formData.append("details", details)
      }

      const response = await apiClient.post("/features/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        const count = response.data.count || 0
        console.log("[GeoDataUpload] Upload response:", {
          success: response.data.success,
          count: response.data.count,
          featuresReturned: response.data.features?.length,
          message: response.data.message,
          fullResponse: response.data,
        })

        if (count === 0) {
          toast.warning("File processed but no features found", {
            description:
              response.data.message ||
              "The file may not contain any valid geographic features",
          })
        } else {
          toast.success("Features uploaded successfully", {
            description: `${count} feature${count !== 1 ? "s" : ""} added`,
          })
        }

        setSelectedFile(null)
        setDetails("")
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        onUploadSuccess?.(count)
      } else {
        toast.error("Upload failed", {
          description: response.data.message || "Unknown error",
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error("Failed to upload file", {
        description: "Please check your file and try again",
      })
    } finally {
      setUploadLoading(false)
    }
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
    <div className={`w-full ${className}`}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div
          className="rounded-lg border border-dashed p-8"
          onDragEnter={handleDrag}
        >
          {!selectedFile ? (
            <div
              className={`flex flex-col items-center justify-center transition-colors ${
                dragActive ? "bg-muted/50" : ""
              }`}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <label
                  htmlFor="geo-file-upload"
                  className="cursor-pointer font-medium text-primary hover:underline"
                >
                  Choose file to upload
                </label>
                <p className="mt-2 text-sm text-muted-foreground">
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
              <p className="mt-4 text-xs text-muted-foreground">
                Supported formats: KML, KMZ, GeoJSON
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 50 MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-lg bg-muted p-4">
                <div className="flex items-start gap-3">
                  {getFileIcon(selectedFile.name)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  className="rounded-sm p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Ready to upload. Fill in the details below and click Upload.
              </p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="space-y-4 rounded-lg border bg-card p-6">
            <div>
              <label className="mb-2 block text-sm font-medium">Project</label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger disabled={projectsLoading}>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Features will be added to the selected project
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Details (Optional)
              </label>
              <Textarea
                placeholder="Add any additional details or description for these features..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="min-h-24"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                These details will be added to all features from this upload
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedFile(null)
              setDetails("")
              if (fileInputRef.current) {
                fileInputRef.current.value = ""
              }
            }}
            disabled={!selectedFile || uploadLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadLoading || !selectedProjectId}
            className="gap-2"
          >
            {uploadLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
