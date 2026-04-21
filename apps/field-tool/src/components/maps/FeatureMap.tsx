import { useCallback, useEffect, useRef, useState } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import OSM from "ol/source/OSM"
import XYZ from "ol/source/XYZ"
import Feature from "ol/Feature"
import { fromLonLat } from "ol/proj"
import { Button } from "@workspace/ui/components/button"
import { Satellite, Map as MapIcon, Loader2, Plus } from "lucide-react"
import { useProjectStore } from "@/store/useProjectStore"
import { syncAllLayers, type LayerMetadata } from "@/lib/mapLoader"
import {
  loadProjectIssues,
  createIssueVectorSource,
  type Issue,
} from "@/lib/issueLoader"
import { MapTriggeredIssueForm } from "@/components/forms/MapTriggeredIssueForm"
import { IssueDetailsModal } from "../modals/IssueDetailsModal"
import "ol/ol.css"

interface FeatureMapProps {
  center?: [number, number]
  zoom?: number
}

const GIS_LAYER_VISIBLE_ZOOM = 13
const PROJECT_FOCUS_ZOOM = 15

type ProjectLocation =
  | string
  | {
      latitude: number
      longitude: number
    }
  | undefined

type ProjectCoordinatesSource = {
  location?: ProjectLocation
  metadata?: Record<string, unknown>
}

function parseCoordinatePair(value: unknown): [number, number] | null {
  if (!value) {
    return null
  }

  if (typeof value === "string") {
    const parts = value.match(/-?\d+(?:\.\d+)?/g)
    if (!parts || parts.length < 2) {
      return null
    }

    const latitude = Number(parts[0])
    const longitude = Number(parts[1])

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null
    }

    return [longitude, latitude]
  }

  if (Array.isArray(value) && value.length >= 2) {
    const first = Number(value[0])
    const second = Number(value[1])

    if (Number.isFinite(first) && Number.isFinite(second)) {
      return [first, second]
    }

    return null
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>

    if (
      typeof record.latitude === "number" &&
      typeof record.longitude === "number"
    ) {
      return [record.longitude, record.latitude]
    }

    if (typeof record.lat === "number" && typeof record.lng === "number") {
      return [record.lng, record.lat]
    }

    if (typeof record.lat === "number" && typeof record.lon === "number") {
      return [record.lon, record.lat]
    }
  }

  return null
}

function getProjectCoordinates(
  project: ProjectCoordinatesSource
): [number, number] | null {
  const { location, metadata } = project

  const directLocationCoordinates = parseCoordinatePair(location)
  if (directLocationCoordinates) {
    return directLocationCoordinates
  }

  if (!metadata || typeof metadata !== "object") {
    return null
  }

  const metadataCandidates = [
    metadata.location,
    metadata.coordinates,
    metadata.center,
    metadata.mapCenter,
    metadata,
  ]

  for (const candidate of metadataCandidates) {
    const parsed = parseCoordinatePair(candidate)
    if (parsed) {
      return parsed
    }
  }

  return null
}

export default function FeatureMap({
  center = [36.901441, -0.631454], // Nairobi default
  zoom = 10,
}: FeatureMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const satelliteLayerRef = useRef<TileLayer>(null)
  const osmLayerRef = useRef<TileLayer>(null)
  const issueLayerRef = useRef<VectorLayer>(null)
  const gisLayerRefs = useRef<VectorLayer[]>([])
  const gisExtentRef = useRef<[number, number, number, number] | null>(null)
  const hasLoadedGlobalLayersRef = useRef(false)
  const [isSatellite, setIsSatellite] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const { activeProject } = useProjectStore()

  const updateGlobalLayerVisibility = () => {
    if (!mapInstance.current) {
      return
    }

    const currentZoom = mapInstance.current.getView().getZoom() ?? 0
    const shouldShowLayers = currentZoom >= GIS_LAYER_VISIBLE_ZOOM

    gisLayerRefs.current.forEach((layer) => {
      layer.setVisible(shouldShowLayers)
    })
  }

  const fitToGlobalLayers = useCallback(() => {
    if (!mapInstance.current || !gisExtentRef.current) {
      return false
    }

    mapInstance.current.getView().fit(gisExtentRef.current, {
      padding: [80, 80, 80, 80],
      duration: 700,
      maxZoom: PROJECT_FOCUS_ZOOM,
    })

    return true
  }, [])

  /**
   * Create a styled VectorLayer from LayerMetadata with performance optimizations
   * - Uses precomputed style function (no new Style objects per render)
   * - Disables updates during pan/zoom interaction
   */
  function createVectorLayerFromMetadata(metadata: LayerMetadata): VectorLayer {
    const styleFunction = (feature: Feature) => {
      const geometryType = feature.getGeometry()?.getType()
      return metadata.getStyleForGeometry?.(geometryType)
    }

    return new VectorLayer({
      source: metadata.source,
      style: styleFunction,
      visible: false,
      minZoom: GIS_LAYER_VISIBLE_ZOOM,
      updateWhileInteracting: false,
      updateWhileAnimating: false,
      properties: {
        projectId: metadata.projectId,
        layerId: metadata.id,
        layerName: metadata.name,
      },
    })
  }

  useEffect(() => {
    if (!mapContainer.current) return

    // Create satellite layer (USGS Imagery)
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
      }),
      visible: true,
    })
    satelliteLayerRef.current = satelliteLayer

    // Create OSM layer
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: false,
    })
    osmLayerRef.current = osmLayer

    // Initialize map with EPSG:3857 (Web Mercator) and transform coordinates
    mapInstance.current = new Map({
      target: mapContainer.current,
      layers: [satelliteLayer, osmLayer],
      view: new View({
        center: fromLonLat(center), // Transform from EPSG:4326 to EPSG:3857
        zoom: zoom,
        projection: "EPSG:3857", // Web Mercator
      }),
    })

    // Set loading to false after a short delay to ensure tiles are visible
    const timer = setTimeout(() => setIsLoading(false), 500)

    // Add click handler for issue markers
    mapInstance.current.on("click", (event) => {
      mapInstance.current?.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          const issueData = feature.get("issueData")
          if (issueData) {
            setSelectedIssue(issueData)
          }
        },
        { layerFilter: (layer) => layer === issueLayerRef.current }
      )
    })

    return () => {
      clearTimeout(timer)
      if (mapInstance.current) {
        mapInstance.current.setTarget(undefined)
      }
    }
  }, [center, zoom])

  // Load all GIS layers once and keep them in memory
  useEffect(() => {
    if (!mapInstance.current || hasLoadedGlobalLayersRef.current) {
      return
    }

    hasLoadedGlobalLayersRef.current = true

    const loadGlobalLayers = async () => {
      try {
        const layersMetadata = await syncAllLayers()

        if (layersMetadata.length === 0) {
          console.warn("No global GIS layers loaded")
        } else {
          const createdLayers: VectorLayer[] = []
          let combinedExtent: [number, number, number, number] | null = null

          layersMetadata.forEach((metadata) => {
            const vectorLayer = createVectorLayerFromMetadata(metadata)
            mapInstance.current?.addLayer(vectorLayer)
            createdLayers.push(vectorLayer)
            console.log(`Added global layer: ${metadata.name}`)

            const features = metadata.source.getFeatures()
            features.forEach((feature) => {
              const geometry = feature.getGeometry()
              if (!geometry) {
                return
              }

              const extent = geometry.getExtent() as [
                number,
                number,
                number,
                number,
              ]

              if (!combinedExtent) {
                combinedExtent = [...extent]
                return
              }

              combinedExtent = [
                Math.min(combinedExtent[0], extent[0]),
                Math.min(combinedExtent[1], extent[1]),
                Math.max(combinedExtent[2], extent[2]),
                Math.max(combinedExtent[3], extent[3]),
              ]
            })
          })

          gisLayerRefs.current = createdLayers
          gisExtentRef.current = combinedExtent
          updateGlobalLayerVisibility()

          console.log(
            `Finished loading ${layersMetadata.length} global GIS layers`
          )
        }
      } catch (error) {
        console.error("Error loading global layers:", error)
      }
    }

    loadGlobalLayers()
  }, [fitToGlobalLayers])

  // Show/hide global layers based on zoom
  useEffect(() => {
    if (!mapInstance.current) {
      return
    }

    const view = mapInstance.current.getView()
    const onResolutionChange = () => {
      updateGlobalLayerVisibility()
    }

    view.on("change:resolution", onResolutionChange)
    updateGlobalLayerVisibility()

    return () => {
      view.un("change:resolution", onResolutionChange)
    }
  }, [])

  // On project change, zoom to DB coordinates and refresh issues for that project
  useEffect(() => {
    if (!mapInstance.current || !activeProject) {
      return
    }

    const projectCoordinates = getProjectCoordinates(activeProject)

    if (projectCoordinates) {
      mapInstance.current.getView().animate({
        center: fromLonLat(projectCoordinates),
        zoom: PROJECT_FOCUS_ZOOM,
        duration: 700,
      })
    } else {
      console.warn(
        `No project coordinates found for ${activeProject.name}; fitting global GIS extent as fallback`
      )

      fitToGlobalLayers()
    }

    const loadIssues = async () => {
      try {
        if (issueLayerRef.current) {
          mapInstance.current?.removeLayer(issueLayerRef.current)
          issueLayerRef.current = null
        }

        // Load issues for this project
        const issues = await loadProjectIssues(activeProject.id)
        if (issues.length > 0) {
          console.log(`Loaded ${issues.length} issues for project`)

          // Create and add issue layer
          const issueSource = createIssueVectorSource(issues)
          const issueLayer = new VectorLayer({
            source: issueSource,
            zIndex: 100,
            properties: {
              name: "Issues",
              type: "issues",
            },
          })

          mapInstance.current?.addLayer(issueLayer)
          issueLayerRef.current = issueLayer
        }
      } catch (error) {
        console.error("Error loading project issues:", error)
      }
    }

    loadIssues()
  }, [activeProject, fitToGlobalLayers])

  const toggleBasemap = () => {
    if (!satelliteLayerRef.current || !osmLayerRef.current) return

    if (isSatellite) {
      satelliteLayerRef.current.setVisible(false)
      osmLayerRef.current.setVisible(true)
      setIsSatellite(false)
    } else {
      satelliteLayerRef.current.setVisible(true)
      osmLayerRef.current.setVisible(false)
      setIsSatellite(true)
    }
  }

  const handleIssueCreated = () => {
    console.log("Issue created successfully")
    // TODO: Refetch issues and refresh the layer
    setShowIssueForm(false)
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full bg-background" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              Loading map...
            </p>
          </div>
        </div>
      )}

      {/* Basemap Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={toggleBasemap}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          {isSatellite ? (
            <>
              <MapIcon className="h-4 w-4" />
              Switch to OSM
            </>
          ) : (
            <>
              <Satellite className="h-4 w-4" />
              Switch to Satellite
            </>
          )}
        </Button>
      </div>

      {/* Report Issue Button */}
      {activeProject && (
        <button
          onClick={() => setShowIssueForm(true)}
          className="absolute right-4 bottom-40 z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-green-600"
          title="Report Issue"
        >
          <Plus className="h-8 w-8" />
        </button>
      )}

      {/* Issue Form Modal */}
      {showIssueForm && (
        <MapTriggeredIssueForm
          onClose={() => setShowIssueForm(false)}
          onSuccess={handleIssueCreated}
        />
      )}

      {/* Issue Details Modal */}
      {selectedIssue && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  )
}
