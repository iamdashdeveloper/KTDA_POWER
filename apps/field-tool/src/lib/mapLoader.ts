/**
 * GIS Layer Management System
 *
 * Dynamically loads GeoJSON and KML files from project-specific folders
 * based on the active project name.
 *
 * MapLoader returns layer metadata (source, type, styling info).
 * FeatureMap handles VectorLayer creation and rendering.
 *
 * Features:
 * - Caching system with localStorage for offline support
 * - Exponential backoff retry for failed requests
 * - Cache invalidation based on time
 */

import VectorSource from "ol/source/Vector"
import { GeoJSON, KML } from "ol/format"
import { Style, Stroke, Fill, Circle } from "ol/style"
import type Map from "ol/Map"

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  VERSION: "v1",
  MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  PREFIX: "geojson_cache_",
}

/**
 * Get cache key for a file
 */
function getCacheKey(filePath: string): string {
  return `${CACHE_CONFIG.PREFIX}${CACHE_CONFIG.VERSION}_${filePath}`
}

/**
 * Get cached data if available and not expired
 */
function getCachedData(filePath: string): string | null {
  try {
    const cacheKey = getCacheKey(filePath)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    if (age > CACHE_CONFIG.MAX_AGE_MS) {
      localStorage.removeItem(cacheKey)
      console.log(`Cache expired for ${filePath}`)
      return null
    }

    console.log(
      `Cache hit for ${filePath} (age: ${(age / 1000 / 60).toFixed(1)}m)`
    )
    return data
  } catch (error) {
    console.warn(`Error reading cache for ${filePath}:`, error)
    return null
  }
}

/**
 * Set cached data in localStorage
 */
function setCachedData(filePath: string, data: string): void {
  try {
    const cacheKey = getCacheKey(filePath)
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    )
    console.log(`Cached ${filePath}`)
  } catch (error) {
    console.warn(`Error caching ${filePath}:`, error)
  }
}

/**
 * Fetch with exponential backoff retry
 */
async function fetchWithRetry(
  filePath: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: any
  let delay = 1000 // Start with 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Fetching ${filePath} (attempt ${attempt + 1}/${maxRetries})`)
      const response = await fetch(filePath)
      if (response.ok) {
        return await response.text()
      }
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      lastError = error
    }

    if (attempt < maxRetries - 1) {
      console.log(`Retry ${filePath} after ${delay}ms: ${lastError?.message}`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }

  throw lastError
}

/**
 * Convert hex color to RGBA string
 * @param hex - Hex color (e.g., "#3b82f6")
 * @param opacity - Opacity value (0-1)
 * @returns Valid CSS rgba() string
 */
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Simplify polygon/multipolygon geometries to reduce rendering complexity
 * @param feature - Feature with geometry to simplify
 * @param tolerance - Douglas-Peucker simplification tolerance (1-3 recommended)
 */
export function simplifyGeometry(feature: any, tolerance: number = 2): void {
  const geometry = feature.getGeometry()
  if (!geometry) return

  const geomType = geometry.getType()
  if (geomType === "Polygon" || geomType === "MultiPolygon") {
    // Simplify using Douglas-Peucker algorithm
    const simplified = geometry.simplify(tolerance)
    feature.setGeometry(simplified)
  }
}

export interface ProjectManifestEntry {
  id: string
  name: string
  folder: string
  files: string[]
}

export interface ProjectManifest {
  projects: ProjectManifestEntry[]
}

/**
 * Layer metadata returned by mapLoader
 * Contains all data needed by FeatureMap to create a VectorLayer
 */
export interface LayerMetadata {
  id: string
  name: string
  projectId: string
  fileName: string
  source: VectorSource
  type: "polygon" | "line" | "point" | "mixed"
  color: string
  fillOpacity: number
  getStyleForGeometry?: (geometryType: string | undefined) => any
}

/**
 * Color scheme for different layer types
 */
const LAYER_COLORS: Record<string, { color: string; fillOpacity: number }> = {
  canal: { color: "#ef4444", fillOpacity: 0 },
  forebay: { color: "#8b5cf6", fillOpacity: 0.15 },
  penstock: { color: "#f59e0b", fillOpacity: 0 },
  "power-station": { color: "#10b981", fillOpacity: 0.2 },
}

/**
 * Create precomputed style getters for a layer
 * Returns a function that gets the appropriate style based on geometry type
 * Prevents creating new Style objects on every render
 */
export function createStyleFunction(
  color: string,
  fillOpacity: number
): (geometryType: string | undefined) => any {
  // Pre-create all style variants
  const styles = {
    polygon: new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
      fill: new Fill({
        color: hexToRgba(color, fillOpacity),
      }),
    }),
    line: new Style({
      stroke: new Stroke({
        color: color,
        width: 2.5,
      }),
    }),
    point: new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: color,
        }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 2,
        }),
      }),
    }),
  }

  // Return a function that gets the style without creating new objects
  return (geometryType: string | undefined) => {
    switch (geometryType) {
      case "Polygon":
      case "MultiPolygon":
        return styles.polygon
      case "LineString":
      case "MultiLineString":
        return styles.line
      case "Point":
      case "MultiPoint":
        return styles.point
      default:
        return styles.polygon // Fallback
    }
  }
}

/**
 * Find closest matching project from manifest using regex
 * Matches against both project name and folder name
 *
 * @param activeProjectName - The name of the active project
 * @param projects - Array of projects from manifest
 * @returns Matching project or undefined
 */
export function findMatchingProject(
  activeProjectName: string,
  projects: ProjectManifestEntry[]
): ProjectManifestEntry | undefined {
  // Create a flexible regex that matches project name with spaces handled as wildcards
  const regex = new RegExp(activeProjectName.replace(/\s+/g, ".*"), "i")

  return projects.find((p) => regex.test(p.name) || regex.test(p.folder))
}

/**
 * Determine file format based on extension
 */
export function getFileFormat(fileName: string): "kml" | "geojson" | "unknown" {
  const ext = fileName.toLowerCase().split(".").pop()
  if (ext === "kml") return "kml"
  if (ext === "geojson" || ext === "json") return "geojson"
  return "unknown"
}

/**
 * Load a single GeoJSON or KML file and return layer metadata
 *
 * @param fileName - Name of the file
 * @param folderPath - Path to the folder containing the file
 * @param projectId - ID of the project
 * @returns LayerMetadata with source and styling info
 */
export async function loadLayerSource(
  fileName: string,
  folderPath: string,
  projectId: string
): Promise<LayerMetadata | null> {
  const format = getFileFormat(fileName)

  if (format === "unknown") {
    console.warn(`Unsupported file format: ${fileName}`)
    return null
  }

  try {
    // Construct the correct file path for public folder
    const filePath = `/data/${folderPath}/${fileName}`
    let data: string | null = null

    // Try to get from cache first
    data = getCachedData(filePath)

    // If not in cache, fetch from server
    if (!data) {
      try {
        data = await fetchWithRetry(filePath)
        setCachedData(filePath, data)
      } catch (error) {
        console.error(`Failed to fetch ${fileName}:`, error)
        return null
      }
    }

    // Create the appropriate format parser
    const parser =
      format === "kml" ? new KML({ extractStyles: true }) : new GeoJSON()

    // Parse features from the data
    const features = parser.readFeatures(data, {
      featureProjection: "EPSG:3857", // Web Mercator
    })

    console.log(`Parsed ${features.length} features from ${fileName}`)

    // Simplify geometries to improve rendering performance
    features.forEach((feature) => {
      simplifyGeometry(feature, 2) // Low tolerance (1-3) to avoid visual distortion
    })

    // Create vector source with simplified features
    const vectorSource = new VectorSource({
      features: features,
    })

    // Get layer name without extension
    const layerName = fileName.replace(/\.[^/.]+$/, "")

    // Determine layer type and color from filename
    const colorConfig = LAYER_COLORS[layerName.toLowerCase()] || {
      color: "#6b7280",
      fillOpacity: 0.1,
    }

    // Detect geometry type from features
    let geometryType: "polygon" | "line" | "point" | "mixed" = "mixed"
    if (features.length > 0) {
      const geomType = features[0].getGeometry()?.getType()
      if (geomType === "Polygon" || geomType === "MultiPolygon") {
        geometryType = "polygon"
      } else if (geomType === "LineString" || geomType === "MultiLineString") {
        geometryType = "line"
      } else if (geomType === "Point" || geomType === "MultiPoint") {
        geometryType = "point"
      }
    }

    // Create precomputed style getter function
    const getStyleForGeometry = createStyleFunction(
      colorConfig.color,
      colorConfig.fillOpacity
    )

    return {
      id: `${projectId}-${layerName}`,
      name: layerName,
      projectId,
      fileName,
      source: vectorSource,
      type: geometryType,
      color: colorConfig.color,
      fillOpacity: colorConfig.fillOpacity,
      getStyleForGeometry,
    }
  } catch (error) {
    console.error(`Error loading layer ${fileName}:`, error)
    return null
  }
}

/**
 * Load all layers for a project and return their metadata
 *
 * @param activeProjectName - Name of the active project
 * @returns Array of LayerMetadata objects
 */
export async function loadProjectLayers(
  activeProjectName: string
): Promise<LayerMetadata[]> {
  try {
    // 1. Fetch manifest
    const manifest = await generateManifestFromDirectory()

    if (!manifest || manifest.projects.length === 0) {
      console.warn("No projects found in manifest")
      return []
    }

    // 2. Find closest match via Regex
    const project = findMatchingProject(activeProjectName, manifest.projects)

    if (!project) {
      console.warn("No matching project found for:", activeProjectName)
      return []
    }

    console.log(`Loading layers for project: ${project.name}`)

    // 3. Load all files and return metadata
    const layersMetadata: LayerMetadata[] = []

    for (const fileName of project.files) {
      const metadata = await loadLayerSource(
        fileName,
        project.folder,
        project.id
      )
      if (metadata) {
        layersMetadata.push(metadata)
        console.log(
          `Loaded metadata for: ${metadata.name} (${metadata.source.getFeatures().length} features, type: ${metadata.type})`
        )
      }
    }

    console.log(
      `Successfully loaded metadata for ${layersMetadata.length} layers`
    )
    return layersMetadata
  } catch (error) {
    console.error("Failed to load project layers:", error)
    return []
  }
}

/**
 * Load all layers for all projects from the manifest.
 * This ignores project filtering and returns a unified layer list.
 */
export async function loadAllLayers(): Promise<LayerMetadata[]> {
  try {
    const manifest = await generateManifestFromDirectory()

    if (!manifest || manifest.projects.length === 0) {
      console.warn("No projects found in manifest")
      return []
    }

    const layersMetadata: LayerMetadata[] = []

    for (const project of manifest.projects) {
      for (const fileName of project.files) {
        const metadata = await loadLayerSource(
          fileName,
          project.folder,
          project.id
        )

        if (metadata) {
          layersMetadata.push(metadata)
          console.log(
            `Loaded metadata for: ${metadata.name} (${metadata.source.getFeatures().length} features, type: ${metadata.type})`
          )
        }
      }
    }

    console.log(
      `Successfully loaded metadata for ${layersMetadata.length} total layers`
    )

    return layersMetadata
  } catch (error) {
    console.error("Failed to load all layers:", error)
    return []
  }
}

/**
 * Main function to sync all project layers to the map
 * Returns LayerMetadata that FeatureMap can use to create VectorLayers
 *
 * @param activeProjectName - Name of the active project
 * @returns Promise resolving to array of LayerMetadata
 */
export async function syncProjectLayers(
  activeProjectName: string
): Promise<LayerMetadata[]> {
  if (!activeProjectName) {
    return loadAllLayers()
  }

  return loadProjectLayers(activeProjectName)
}

/**
 * Sync and return all GIS layers from the manifest, without project filtering.
 */
export async function syncAllLayers(): Promise<LayerMetadata[]> {
  return loadAllLayers()
}

/**
 * Generate manifest from directory structure
 * This fetches from a projects.json file or uses hardcoded fallback
 *
 * In production, this would be fetched from the /data/projects.json file
 */
async function generateManifestFromDirectory(): Promise<ProjectManifest> {
  try {
    // Try to fetch the manifest from public data folder
    const response = await fetch("/data/projects.json")
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn(
      "Failed to fetch projects.json, using fallback manifest:",
      error
    )
  }

  // Fallback manifest based on known folder structure
  const manifest: ProjectManifest = {
    projects: [
      {
        id: "gura-hydro-001",
        name: "Gura Hydro Project",
        folder: "Gura_Hydro_Project",
        files: [
          "canal.geojson",
          "forebay.geojson",
          "penstock.geojson",
          "power-station.geojson",
        ],
      },
      {
        id: "imenti-project-001",
        name: "Imenti Project",
        folder: "imenti",
        files: [],
      },
    ],
  }

  return manifest
}

/**
 * Clear all layers for a specific project
 *
 * @param projectId - ID of the project
 * @param map - OpenLayers Map instance
 */
export function clearProjectLayers(projectId: string, map: Map): void {
  const layers = map
    .getLayers()
    .getArray()
    .filter((l) => l.get("projectId") === projectId)

  layers.forEach((layer) => {
    map.removeLayer(layer)
  })

  console.log(`Cleared ${layers.length} layers for project: ${projectId}`)
}

/**
 * Clear all cached GeoJSON data
 * Useful for development and debugging
 */
export function clearGeoJSONCache(): void {
  try {
    const cachePrefix = CACHE_CONFIG.PREFIX + CACHE_CONFIG.VERSION
    const keys: string[] = []

    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(cachePrefix)) {
        keys.push(key)
      }
    }

    // Remove all cache entries
    keys.forEach((key) => {
      localStorage.removeItem(key)
    })

    console.log(`Cleared ${keys.length} cached GeoJSON files`)
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  totalCached: number
  totalSize: string
} {
  try {
    const cachePrefix = CACHE_CONFIG.PREFIX + CACHE_CONFIG.VERSION
    let totalSize = 0
    let count = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(cachePrefix)) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
          count++
        }
      }
    }

    // Convert to human-readable format
    const units = ["B", "KB", "MB"]
    let size = totalSize
    let unitIndex = 0
    while (size > 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return {
      totalCached: count,
      totalSize: `${size.toFixed(2)} ${units[unitIndex]}`,
    }
  } catch (error) {
    console.error("Error getting cache stats:", error)
    return { totalCached: 0, totalSize: "0 B" }
  }
}
