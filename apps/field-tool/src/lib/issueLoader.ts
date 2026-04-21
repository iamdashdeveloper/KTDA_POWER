import VectorSource from "ol/source/Vector"
import Feature from "ol/Feature"
import Point from "ol/geom/Point"
import { fromLonLat } from "ol/proj"
import Style from "ol/style/Style"
import Circle from "ol/style/Circle"
import Fill from "ol/style/Fill"
import Stroke from "ol/style/Stroke"
import Text from "ol/style/Text"
import { ApiClient } from "./api"

export interface Issue {
  id: string
  title: string
  description?: string
  projectId: string
  featureId?: string
  priority: number
  status: string
  images: string[]
  metadata?: Record<string, unknown>
  createdAt: string
  updates?: IssueUpdate[]
  assignments?: IssueAssignment[]
}

export interface IssueUpdate {
  id: string
  issueId: string
  userId: string
  content: string
  images?: string[]
  statusChange?: string
  createdAt: string
}

export interface IssueAssignment {
  issueId: string
  userId: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  OPEN: { fill: "#ef4444", stroke: "#991b1b" }, // Red
  IN_PROGRESS: { fill: "#f59e0b", stroke: "#d97706" }, // Amber
  ON_HOLD: { fill: "#8b5cf6", stroke: "#6d28d9" }, // Violet
  RESOLVED: { fill: "#10b981", stroke: "#047857" }, // Green
  CLOSED: { fill: "#6b7280", stroke: "#374151" }, // Gray
}

export async function loadProjectIssues(projectId: string): Promise<Issue[]> {
  try {
    const data = await ApiClient.get<Issue[]>(`/projects/${projectId}/issues`)
    return data || []
  } catch (error) {
    console.error("Failed to fetch project issues:", error)
    return []
  }
}

export function createIssueVectorSource(issues: Issue[]): VectorSource {
  const source = new VectorSource()

  issues.forEach((issue) => {
    // Skip issues without location
    if (!issue || typeof issue !== "object") {
      console.warn("Invalid issue object:", issue)
      return
    }

    // Extract coordinates from metadata or use default
    let coordinates: [number, number] | null = null

    // Try to get from PostGIS stored geometry (would be normalized by API)
    if (issue.metadata && typeof issue.metadata === "object") {
      const meta = issue.metadata as Record<string, any>
      if (meta.latitude && meta.longitude) {
        coordinates = [meta.longitude, meta.latitude]
      }
    }

    // If no coordinates found, skip this issue
    if (!coordinates) {
      console.warn(`Issue ${issue.id} has no valid coordinates`)
      return
    }

    try {
      const feature = new Feature({
        geometry: new Point(fromLonLat(coordinates)), // Transform from EPSG:4326 to EPSG:3857
        id: issue.id,
        issueTitle: issue.title,
        issueStatus: issue.status,
        issuePriority: issue.priority,
        issueData: issue, // Store full data for modal display
      })

      feature.setStyle(createIssueStyle(issue.status, issue.priority))
      source.addFeature(feature)
    } catch (error) {
      console.error(`Failed to create feature for issue ${issue.id}:`, error)
    }
  })

  return source
}

/**
 * Create style for issue marker based on status and priority
 * - Larger circles for higher priority
 * - Color based on status
 */
export function createIssueStyle(status: string, priority: number): Style {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.OPEN
  const baseRadius = 8 + priority * 2 // 8-14px based on priority

  return new Style({
    image: new Circle({
      radius: baseRadius,
      fill: new Fill({
        color: colors.fill,
      }),
      stroke: new Stroke({
        color: colors.stroke,
        width: 2,
      }),
    }),
    text: new Text({
      text: priority.toString(),
      fill: new Fill({
        color: "#ffffff",
      }),
      font: "bold 10px Arial",
    }),
  })
}

/**
 * Get color for status badge display
 */
export function getStatusColor(status: string): string {
  const statusColorMap: Record<string, string> = {
    OPEN: "bg-red-100 text-red-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    ON_HOLD: "bg-violet-100 text-violet-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-800",
  }
  return statusColorMap[status] || "bg-gray-100 text-gray-800"
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: number): string {
  const labels = ["Low", "Medium", "High", "Critical"]
  return labels[Math.min(priority, 3)] || "Low"
}
