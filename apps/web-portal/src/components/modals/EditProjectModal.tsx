import { useState, useEffect } from "react"
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
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { ApiClient } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { type Project } from "@/store/useProjectStore"

interface EditProjectModalProps {
  isOpen: boolean
  project: Project | null
  onClose: () => void
  onSuccess: () => void
}

export function EditProjectModal({
  isOpen,
  project,
  onClose,
  onSuccess,
}: EditProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    status: "planning",
  })

  useEffect(() => {
    if (project) {
      setProjectData({
        name: project.name || "",
        description: project.description || "",
        status: (project as any).status || "planning",
      })
    }
  }, [project, isOpen])

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    if (!projectData.name) {
      toast.error("Project name is required")
      return
    }

    setIsSubmitting(true)
    try {
      await ApiClient.put(`/projects/${project.id}`, projectData)
      toast.success("Project updated successfully")
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Failed to update project")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project's name, description, or current lifecycle status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateProject} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">Project Name *</Label>
            <Input
              id="edit-project-name"
              placeholder="Enter project name"
              value={projectData.name}
              onChange={(e) =>
                setProjectData({ ...projectData, name: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-desc">Description</Label>
            <Textarea
              id="edit-project-desc"
              placeholder="Optional project description"
              value={projectData.description}
              onChange={(e) =>
                setProjectData({ ...projectData, description: e.target.value })
              }
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-status">Status</Label>
            <Select
              value={projectData.status}
              onValueChange={(val) =>
                setProjectData({ ...projectData, status: val })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="edit-project-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
