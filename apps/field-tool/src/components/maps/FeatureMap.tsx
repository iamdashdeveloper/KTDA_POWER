import { useEffect, useRef, useState } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import { fromLonLat } from "ol/proj"
import OSM from "ol/source/OSM"
import XYZ from "ol/source/XYZ"
import { defaults as defaultControls } from "ol/control/defaults"
import GeoJSON from "ol/format/GeoJSON"
import Point from "ol/geom/Point"
import Feature from "ol/Feature"
import Style from "ol/style/Style"
import Fill from "ol/style/Fill"
import Stroke from "ol/style/Stroke"
import CircleStyle from "ol/style/Circle"
import Text from "ol/style/Text"
import { Button } from "@workspace/ui/components/button"
import {
  Eye,
  EyeOff,
  Layers3,
  Map as MapIcon,
  Plus,
  Triangle,
  X,
} from "lucide-react"
import { MapTriggeredIssueForm } from "@/components/forms/MapTriggeredIssueForm"
import { IssueDetailsModal } from "@/components/modals/IssueDetailsModal"
import { ApiClient } from "@/lib/api"
import type { Issue } from "@/lib/issueLoader"
import { useProjectStore } from "@/store/useProjectStore"
import {
  loadProjectFeatures,
  loadProjectIssues,
  parseGeometry,
  parseIssueCoordinates,
} from "@/lib/mapData"
import {
  createEmpty as createEmptyExtent,
  extend as extendExtent,
} from "ol/extent"

const DEFAULT_CENTER: [number, number] = [37.9062, -0.0236]
const DEFAULT_ZOOM = 6
const PROJECT_LOCATION_ZOOM = 17
const geoJsonFormat = new GeoJSON()

type Basemap = "osm" | "satellite"

const satelliteAttribution =
  'Tiles © <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community'

function featureStyleFunction(feature: any) {
  const geometry = feature.getGeometry()
  const geometryType = geometry?.getType()

  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "rgba(59, 130, 246, 0.9)" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
    })
  }

  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return new Style({
      stroke: new Stroke({ color: "rgba(14, 165, 233, 0.95)", width: 3 }),
    })
  }

  return new Style({
    fill: new Fill({ color: "rgba(59, 130, 246, 0.15)" }),
    stroke: new Stroke({ color: "rgba(59, 130, 246, 0.95)", width: 2 }),
  })
}

function issueStyleFunction(feature: any) {
  const status = String(feature.get("status") || "OPEN").toUpperCase()
  const priority = Number(feature.get("priority") || 0)

  const palette: Record<string, { fill: string; stroke: string }> = {
    OPEN: { fill: "rgba(239, 68, 68, 0.95)", stroke: "#991b1b" },
    IN_PROGRESS: { fill: "rgba(245, 158, 11, 0.95)", stroke: "#b45309" },
    ON_HOLD: { fill: "rgba(168, 85, 247, 0.95)", stroke: "#7c3aed" },
    RESOLVED: { fill: "rgba(16, 185, 129, 0.95)", stroke: "#047857" },
    CLOSED: { fill: "rgba(107, 114, 128, 0.95)", stroke: "#374151" },
  }

  const colors = palette[status] || palette.OPEN
  const radius = Math.max(8, 8 + priority * 3)

  return new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color: colors.fill }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
    }),
    text: new Text({
      text: "!",
      fill: new Fill({ color: "#ffffff" }),
      stroke: new Stroke({ color: "rgba(0,0,0,0.35)", width: 3 }),
      font: "800 11px Inter, Arial, sans-serif",
      offsetY: 0,
    }),
  })
}

function formatLayerCount(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

interface LegendGroupItem {
  id: string
  name: string
  geometryType: string
  count: number
}

function getFeatureColor(geometryType: string): string {
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return "#3b82f6"
  }

  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return "#0ea5e9"
  }

  return "#2563eb"
}

function getProjectCoordinates(
  location:
    | {
        latitude: number
        longitude: number
      }
    | string
    | null
    | undefined
): [number, number] | null {
  if (!location) {
    return null
  }

  if (typeof location === "object") {
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return [longitude, latitude]
    }
    return null
  }

  try {
    const parsed = JSON.parse(location)

    if (
      parsed?.type === "Point" &&
      Array.isArray(parsed.coordinates) &&
      parsed.coordinates.length >= 2
    ) {
      const longitude = Number(parsed.coordinates[0])
      const latitude = Number(parsed.coordinates[1])
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [longitude, latitude]
      }
    }
  } catch {
    return null
  }

  return null
}

export default function FeatureMap() {
  const activeProject = useProjectStore((state) => state.activeProject)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null)
  const satelliteLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const featureSourceRef = useRef(new VectorSource())
  const issueSourceRef = useRef(new VectorSource())
  const featureLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const issueLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const [basemap, setBasemap] = useState<Basemap>("osm")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [featureCount, setFeatureCount] = useState(0)
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [dataReloadKey, setDataReloadKey] = useState(0)
  const [legendGroups, setLegendGroups] = useState<LegendGroupItem[]>([])
  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(new Set())

  const toggleGroupVisibility = (groupId: string) => {
    const source = featureSourceRef.current
    const groupFeatures = source
      .getFeatures()
      .filter((feature) => String(feature.get("groupId")) === groupId)

    if (groupFeatures.length === 0) {
      return
    }

    setHiddenGroupIds((previousIds) => {
      const nextIds = new Set(previousIds)

      if (nextIds.has(groupId)) {
        nextIds.delete(groupId)
        for (const feature of groupFeatures) {
          feature.setStyle(undefined)
        }
      } else {
        nextIds.add(groupId)
        for (const feature of groupFeatures) {
          feature.setStyle(() => [])
        }
      }

      return nextIds
    })
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return
    }

    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: true,
    })

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: satelliteAttribution,
        crossOrigin: "anonymous",
      }),
      visible: false,
    })

    const featureLayer = new VectorLayer({
      source: featureSourceRef.current,
      style: featureStyleFunction,
      zIndex: 20,
    })

    const issueLayer = new VectorLayer({
      source: issueSourceRef.current,
      style: issueStyleFunction,
      zIndex: 30,
    })

    osmLayerRef.current = osmLayer
    satelliteLayerRef.current = satelliteLayer
    featureLayerRef.current = featureLayer
    issueLayerRef.current = issueLayer

    const map = new Map({
      target: mapRef.current,
      controls: defaultControls({
        zoom: true,
        rotate: false,
        attribution: true,
      }),
      layers: [satelliteLayer, osmLayer, featureLayer, issueLayer],
      view: new View({
        center: fromLonLat(DEFAULT_CENTER),
        zoom: DEFAULT_ZOOM,
      }),
    })

    map.on("click", async (event) => {
      const clicked = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature
      ) as Feature | undefined

      if (!clicked) {
        return
      }

      const issueId = clicked.get("issueId")
      if (!issueId) {
        return
      }

      try {
        const issue = await ApiClient.get<Issue>(`/issues/${issueId}`)
        setSelectedIssue(issue)
      } catch (error) {
        console.error("Failed to load issue details:", error)
        const fallbackIssue = clicked.get("issueData") as Issue | undefined
        if (fallbackIssue) {
          setSelectedIssue(fallbackIssue)
        }
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
      osmLayerRef.current = null
      satelliteLayerRef.current = null
      featureLayerRef.current = null
      issueLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!osmLayerRef.current || !satelliteLayerRef.current) {
      return
    }

    const showSatellite = basemap === "satellite"
    osmLayerRef.current.setVisible(!showSatellite)
    satelliteLayerRef.current.setVisible(showSatellite)
  }, [basemap])

  useEffect(() => {
    const map = mapInstanceRef.current
    const projectCoordinates = getProjectCoordinates(activeProject?.location)

    if (!map || !projectCoordinates) {
      return
    }

    map.getView().animate({
      center: fromLonLat(projectCoordinates),
      zoom: PROJECT_LOCATION_ZOOM,
      duration: 450,
    })
  }, [activeProject?.id, activeProject?.location])

  useEffect(() => {
    const projectId = activeProject?.id
    const projectCoordinates = getProjectCoordinates(activeProject?.location)

    if (!projectId || !mapInstanceRef.current) {
      featureSourceRef.current.clear(true)
      issueSourceRef.current.clear(true)
      setSelectedIssue(null)
      setLegendGroups([])
      setHiddenGroupIds(new Set())
      setFeatureCount(0)
      return
    }

    let cancelled = false

    const loadProjectData = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        let effectiveProjectCoordinates = projectCoordinates

        if (!effectiveProjectCoordinates) {
          try {
            const project = await ApiClient.get<{
              location?:
                | {
                    latitude: number
                    longitude: number
                  }
                | string
                | null
            }>(`/projects/${projectId}`)

            effectiveProjectCoordinates = getProjectCoordinates(
              project?.location
            )
          } catch (locationError) {
            console.warn(
              "Failed to resolve project location for map centering:",
              locationError
            )
          }
        }

        const map = mapInstanceRef.current
        if (map && effectiveProjectCoordinates) {
          const view = map.getView()
          view.setCenter(fromLonLat(effectiveProjectCoordinates))
          view.setZoom(PROJECT_LOCATION_ZOOM)
        }

        const [projectFeatures, projectIssues] = await Promise.all([
          loadProjectFeatures(projectId),
          loadProjectIssues(projectId),
        ])

        if (cancelled) {
          return
        }

        featureSourceRef.current.clear(true)
        issueSourceRef.current.clear(true)

        const featureCollection = {
          type: "FeatureCollection" as const,
          features: projectFeatures
            .map((feature) => {
              const geometry = parseGeometry(feature.geometry)
              if (!geometry) {
                return null
              }

              return {
                type: "Feature" as const,
                geometry,
                properties: {
                  id: feature.id,
                  name: feature.name,
                  groupId: feature.parentId || feature.id,
                  groupName:
                    feature.groupName || feature.parentName || feature.name,
                  projectId: feature.projectId,
                  parentId: feature.parentId,
                  createdAt: feature.createdAt,
                  details: feature.details,
                  images: feature.images,
                },
              }
            })
            .filter(Boolean),
        }

        const renderedFeatures = geoJsonFormat.readFeatures(featureCollection, {
          featureProjection: "EPSG:3857",
        })

        featureSourceRef.current.addFeatures(renderedFeatures)
        setHiddenGroupIds(new Set())

        const groupMap: Record<string, LegendGroupItem> = {}

        for (const feature of renderedFeatures) {
          const groupId = String(
            feature.get("groupId") || feature.get("id") || ""
          )
          if (!groupId) {
            continue
          }

          const geometryType = feature.getGeometry()?.getType() || "Unknown"
          const groupName = String(
            feature.get("groupName") || feature.get("name") || "Unnamed group"
          )

          const existing = groupMap[groupId]
          if (existing) {
            existing.count += 1
            if (existing.geometryType !== geometryType) {
              existing.geometryType = "Mixed"
            }
          } else {
            groupMap[groupId] = {
              id: groupId,
              name: groupName,
              geometryType,
              count: 1,
            }
          }
        }

        setLegendGroups(Object.values(groupMap))

        const issueFeatures = projectIssues
          .map((issue) => {
            const coordinates = parseIssueCoordinates(issue)
            if (!coordinates) {
              return null
            }

            const point = new Point(fromLonLat(coordinates))
            const feature = new Feature({
              geometry: point,
              id: issue.id,
              issueId: issue.id,
              issueData: issue,
              title: issue.title,
              status: issue.status,
              priority: issue.priority,
              description: issue.description,
            })
            return feature
          })
          .filter(Boolean) as Feature<Point>[]

        issueSourceRef.current.addFeatures(issueFeatures)

        setFeatureCount(renderedFeatures.length)

        const combinedExtent = createEmptyExtent()
        let hasExtent = false

        for (const source of [
          featureSourceRef.current,
          issueSourceRef.current,
        ]) {
          source.forEachFeature((feature) => {
            const geometry = feature.getGeometry()
            if (!geometry) {
              return
            }

            extendExtent(combinedExtent, geometry.getExtent())
            hasExtent = true
          })
        }

        if (hasExtent && !effectiveProjectCoordinates) {
          const mapWithData = mapInstanceRef.current
          if (mapWithData) {
            mapWithData.getView().fit(combinedExtent, {
              padding: [48, 48, 48, 48],
              duration: 500,
              maxZoom: 18,
            })
          }
        }
      } catch (error) {
        console.error("Failed to load project map data:", error)
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load project map data"
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProjectData()

    return () => {
      cancelled = true
    }
  }, [activeProject?.id, activeProject?.location, dataReloadKey])

  return (
    <div className="relative h-[calc(100vh-0px)] w-full overflow-hidden bg-slate-950">
      <div ref={mapRef} className="h-full w-full" />

      <div className="absolute top-4 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 rounded-2xl bg-white/90 p-2 shadow-lg backdrop-blur dark:bg-slate-900/90">
        <Button
          type="button"
          variant={basemap === "osm" ? "default" : "outline"}
          size="sm"
          onClick={() => setBasemap("osm")}
          className="gap-2"
        >
          <MapIcon className="h-4 w-4" />
          OSM
        </Button>

        <Button
          type="button"
          variant={basemap === "satellite" ? "default" : "outline"}
          size="sm"
          onClick={() => setBasemap("satellite")}
          className="gap-2"
        >
          <Layers3 className="h-4 w-4" />
          Satellite
        </Button>
      </div>

      <div className="absolute bottom-40 left-4 z-20">
        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={() => setIsLegendOpen((open) => !open)}
          className="shadow-lg"
          title="Toggle map legend"
        >
          <Triangle className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute right-4 bottom-40 z-20">
        <Button
          type="button"
          size="icon"
          onClick={() => setIsIssueFormOpen(true)}
          className="bg-green-600 text-white shadow-lg hover:bg-green-700"
          title="Report new issue"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {isLegendOpen && (
        <div className="absolute bottom-40 left-16 z-20 max-h-[45vh] w-80 overflow-hidden rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur dark:bg-slate-900/95">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Feature Legend
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatLayerCount(featureCount, "feature")}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsLegendOpen(false)}
              className="h-7 w-7"
              title="Close legend"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[35vh] space-y-2 overflow-y-auto pr-1">
            {legendGroups.length === 0 ? (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                No features loaded for this project.
              </p>
            ) : (
              legendGroups.map((group) => {
                const isHidden = hiddenGroupIds.has(group.id)

                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-2 py-2 dark:bg-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm border border-white/60"
                          style={{
                            backgroundColor: getFeatureColor(
                              group.geometryType
                            ),
                          }}
                        />
                        <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                          {group.name}
                        </p>
                        <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {group.count}
                        </span>
                      </div>
                      <p className="ml-5 text-[11px] text-slate-500 dark:text-slate-400">
                        {group.geometryType}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupVisibility(group.id)}
                      className="h-7 px-2 text-xs"
                    >
                      {isHidden ? (
                        <>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Show
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide
                        </>
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {(isLoading || errorMessage || !activeProject) && (
        <div className="absolute right-4 bottom-4 z-10 max-w-md rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur dark:bg-slate-900/90">
          {!activeProject ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Select a project to load features and issues on the map.
            </p>
          ) : errorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Loading project map data...
            </p>
          )}
        </div>
      )}

      {isIssueFormOpen && (
        <MapTriggeredIssueForm
          onClose={() => setIsIssueFormOpen(false)}
          onSuccess={() => {
            setDataReloadKey((previousValue) => previousValue + 1)
          }}
        />
      )}

      {selectedIssue && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  )
}
