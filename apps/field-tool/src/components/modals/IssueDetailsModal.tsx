import { useState } from "react"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  X,
  MapPin,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { getStatusColor, getPriorityLabel } from "@/lib/issueLoader"
import { ApiClient } from "@/lib/api"
import type { Issue, IssueUpdate } from "@/lib/issueLoader"

interface IssueDetailsModalProps {
  issue: Issue
  onClose: () => void
}

export function IssueDetailsModal({ issue, onClose }: IssueDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [statusChange, setStatusChange] = useState(issue.status)
  const [updates, setUpdates] = useState<IssueUpdate[]>(issue.updates || [])

  const handleStatusChange = async () => {
    if (statusChange === issue.status) return

    try {
      setIsUpdating(true)
      await ApiClient.post(`/issues/${issue.id}/updates`, {
        content: `Status changed to ${statusChange}`,
        statusChange,
      })

      // Update local state
      setUpdates([
        ...updates,
        {
          id: `new-${Date.now()}`,
          issueId: issue.id,
          userId: "current-user",
          content: `Status changed to ${statusChange}`,
          statusChange,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (error) {
      console.error("Failed to update status:", error)
      alert("Failed to update status. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      setIsUpdating(true)
      await ApiClient.post(`/issues/${issue.id}/updates`, {
        content: newNote,
      })

      // Update local state
      setUpdates([
        ...updates,
        {
          id: `new-${Date.now()}`,
          issueId: issue.id,
          userId: "current-user",
          content: newNote,
          createdAt: new Date().toISOString(),
        },
      ])

      setNewNote("")
    } catch (error) {
      console.error("Failed to add note:", error)
      alert("Failed to add note. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="relative m-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-1 transition-colors hover:bg-muted"
          aria-label="Close dialog"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="pr-8 text-2xl font-bold">{issue.title}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(issue.status)}`}
              >
                {issue.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                <span>Priority: {getPriorityLabel(issue.priority)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatDate(issue.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Images Carousel */}
          {issue.images && issue.images.length > 0 && (
            <div className="mb-6">
              <div className="relative mb-2 overflow-hidden rounded-lg bg-muted">
                <img
                  src={issue.images[currentImageIndex]}
                  alt={`Issue photo ${currentImageIndex + 1}`}
                  className="h-64 w-full object-cover"
                />

                {issue.images.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          (prev) =>
                            (prev - 1 + issue.images.length) %
                            issue.images.length
                        )
                      }
                      className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          (prev) => (prev + 1) % issue.images.length
                        )
                      }
                      className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Image counter */}
              {issue.images.length > 1 && (
                <p className="text-center text-sm text-muted-foreground">
                  {currentImageIndex + 1} / {issue.images.length}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {issue.description && (
            <div className="mb-6">
              <h3 className="mb-2 font-semibold">Description</h3>
              <p className="text-foreground">{issue.description}</p>
            </div>
          )}

          {/* Location */}
          {issue.metadata && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  {(issue.metadata as Record<string, any>).latitude && (
                    <p className="text-sm text-foreground">
                      📍{" "}
                      {(issue.metadata as Record<string, any>).latitude.toFixed(
                        6
                      )}
                      ,
                      {(
                        issue.metadata as Record<string, any>
                      ).longitude.toFixed(6)}
                    </p>
                  )}
                  {(issue.metadata as Record<string, any>).capturedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Captured at{" "}
                      {formatDate(
                        (issue.metadata as Record<string, any>).capturedAt
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Update */}
          <div className="mb-6 rounded-lg bg-muted/50 p-4">
            <h3 className="mb-3 font-semibold">Update Status</h3>
            <div className="flex gap-2">
              <select
                value={statusChange}
                onChange={(e) => setStatusChange(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                disabled={isUpdating}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <Button
                onClick={handleStatusChange}
                disabled={statusChange === issue.status || isUpdating}
                size="sm"
              >
                {isUpdating ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>

          {/* Add Note */}
          <div className="mb-6 rounded-lg bg-muted/50 p-4">
            <h3 className="mb-3 font-semibold">Add Note</h3>
            <div className="space-y-2">
              <textarea
                placeholder="Add a field note or update..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                rows={2}
                disabled={isUpdating}
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isUpdating}
                size="sm"
              >
                {isUpdating ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </div>

          {/* Updates Timeline */}
          {updates.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Updates & Notes</h3>
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {update.statusChange ? (
                          <span className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            Status: {update.statusChange}
                          </span>
                        ) : (
                          "Field Note"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(update.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{update.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
