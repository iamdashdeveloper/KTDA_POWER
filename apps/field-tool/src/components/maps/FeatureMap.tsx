import { useEffect, useRef, useState, useCallback } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import { fromLonLat } from "ol/proj"
import OSM from "ol/source/OSM"
import XYZ from "ol/source/XYZ"
import { defaults as defaultControls } from "ol/control/defaults"
import Point from "ol/geom/Point"
import Feature from "ol/Feature"
import Style from "ol/style/Style"
import Fill from "ol/style/Fill"
import Stroke from "ol/style/Stroke"
import CircleStyle from "ol/style/Circle"
import Text from "ol/style/Text"
import * as turf from "@turf/turf"
import { Button } from "@workspace/ui/components/button"
import { Triangle, Plus } from "lucide-react"
import { MapTriggeredIssueForm } from "@/components/forms/MapTriggeredIssueForm"
import { IssueDetailsModal } from "@/components/modals/IssueDetailsModal"
import { RoutingModal, type DestinationType } from "@/components/modals/RoutingModal"
import { ApiClient } from "@/lib/api"
import type { Issue } from "@/lib/issueLoader"
import { useProjectStore } from "@/store/useProjectStore"
import { loadProjectFeatures, loadProjectIssues, parseGeometry, parseIssueCoordinates } from "@/lib/mapData"
import { createEmpty as createEmptyExtent, extend as extendExtent } from "ol/extent"
import type { Basemap, OSRMRoute, LegendGroupItem } from "./types"
import { DEFAULT_CENTER, DEFAULT_ZOOM, PROJECT_LOCATION_ZOOM, geoJsonFormat, satelliteAttribution } from "./constants"
import { featureStyleFunction, issueStyleFunction } from "./mapStyles"
import { getProjectCoordinates, haversineDistance, generateInstruction, formatDistance, formatDuration, getThemeColor, setStoredLayerColor } from "./mapUtils"
import { speak, stopSpeaking, useVoicesPreload } from "./voiceUtils"
import { DirectionsPanel } from "./DirectionsPanel"
import { MapToolbar } from "./MapToolbar"
import { MapLegend } from "./MapLegend"
import type { RouteStep } from "./types"

export default function FeatureMap() {
  const activeProject = useProjectStore((state) => state.activeProject)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null)
  const satelliteLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const featureSourceRef = useRef(new VectorSource())
  const issueSourceRef = useRef(new VectorSource())
  const routeSourceRef = useRef(new VectorSource())
  const chainageSourceRef = useRef(new VectorSource())
  const featureLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const issueLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const routeLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const chainageLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const osrmRef = useRef<any>(null)

  // Live location refs
  const liveLocationSourceRef = useRef(new VectorSource())
  const liveLocationLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const liveLocationFeatureRef = useRef<Feature<Point> | null>(null)
  const pulseFeatureRef = useRef<Feature<Point> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const isTrackingRef = useRef(false)

  const [basemap, setBasemap] = useState<Basemap>("osm")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [featureCount, setFeatureCount] = useState(0)
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false)
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [dataReloadKey, setDataReloadKey] = useState(0)
  const handleColorChange = (groupId: string, color: string) => {
    setStoredLayerColor(groupId, color)
    featureSourceRef.current.changed()
    // Don't reload all data - just trigger style update via source.changed()
    // This prevents infinite render loops when opening routing modal
  }

  const [legendGroups, setLegendGroups] = useState<LegendGroupItem[]>([])
  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(new Set())
  const [projectFeatures, setProjectFeatures] = useState<Array<{
    id: string; name: string; coordinates: [number, number]
    parentId?: string | null; parentName?: string | null; groupName?: string | null
    geometry?: any
  }>>([])
  const [projectIssues, setProjectIssues] = useState<any[]>([])

  // Directions state
  const [isDirectionsPanelOpen, setIsDirectionsPanelOpen] = useState(false)
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([])
  const [routeSummary, setRouteSummary] = useState<{ distance: number; duration: number }>({ distance: 0, duration: 0 })
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Voice state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const announcedStepsRef = useRef<Set<number>>(new Set())
  const lastProximityRef = useRef<number>(Infinity)
  const hasAnnouncedSummaryRef = useRef(false)

  useVoicesPreload()

  useEffect(() => {
    if (!isVoiceEnabled || routeSteps.length === 0 || hasAnnouncedSummaryRef.current) return
    hasAnnouncedSummaryRef.current = true
    const intro = `Starting navigation. Route is ${formatDistance(routeSummary.distance)}, about ${formatDuration(routeSummary.duration)}. ${generateInstruction(routeSteps[0])}`
    speak(intro)
  }, [isVoiceEnabled, routeSteps, routeSummary])

  /* ---------------------------------------------------------------- */
  /*  Live location — pulsing blue dot                                 */
  /* ---------------------------------------------------------------- */
  const createLiveLocationLayer = useCallback(() => {
    if (!mapInstanceRef.current) return

    const dotFeature = new Feature({ geometry: new Point(fromLonLat([0, 0])) })
    dotFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: getThemeColor("--primary") }),
        stroke: new Stroke({ color: getThemeColor("--background"), width: 3 }),
      }),
    }))

    const pulseFeature = new Feature({ geometry: new Point(fromLonLat([0, 0])) })
    pulseFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 20,
        fill: new Fill({ color: getThemeColor("--primary", 0.2) }),
        stroke: new Stroke({ color: getThemeColor("--primary", 0.4), width: 2 }),
      }),
    }))

    const layer = new VectorLayer({ source: liveLocationSourceRef.current, zIndex: 100 })
    liveLocationSourceRef.current.addFeature(dotFeature)
    liveLocationSourceRef.current.addFeature(pulseFeature)
    liveLocationFeatureRef.current = dotFeature
    pulseFeatureRef.current = pulseFeature
    liveLocationLayerRef.current = layer
    mapInstanceRef.current.addLayer(layer)

    let radius = 20
    let growing = true
    const animate = () => {
      if (!pulseFeature) return
      growing ? (radius += 0.5) : (radius -= 0.5)
      if (radius >= 30) growing = false
      if (radius <= 18) growing = true
      pulseFeature.setStyle(new Style({
        image: new CircleStyle({
          radius,
          fill: new Fill({ color: getThemeColor("--primary", 0.2 - (radius - 20) / 100) }),
          stroke: new Stroke({ color: getThemeColor("--primary", 0.4 - (radius - 20) / 80), width: 2 }),
        }),
      }))
      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  const checkProximityAndAnnounce = useCallback((currentPos: [number, number]) => {
    if (currentStepIndex >= routeSteps.length) return
    const step = routeSteps[currentStepIndex]
    const distance = haversineDistance(currentPos, step.maneuver.location)

    if (distance < 15 && step.maneuver.type.toLowerCase() !== "arrive") {
      if (!announcedStepsRef.current.has(currentStepIndex + 1)) {
        setCurrentStepIndex((prev) => prev + 1)
        announcedStepsRef.current.add(currentStepIndex + 1)
        lastProximityRef.current = Infinity
      }
      return
    }

    for (const threshold of [200, 100, 50]) {
      if (distance <= threshold && distance > threshold - 20 && lastProximityRef.current > threshold) {
        lastProximityRef.current = distance
        speak(generateInstruction(step, distance))
        break
      }
    }

    if (distance <= 20 && lastProximityRef.current > 20) {
      lastProximityRef.current = distance
      speak(generateInstruction(step, 0))
    }
  }, [currentStepIndex, routeSteps])

  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return
    isTrackingRef.current = true
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude]
        const olCoords = fromLonLat(coords)
        liveLocationFeatureRef.current?.setGeometry(new Point(olCoords))
        pulseFeatureRef.current?.setGeometry(new Point(olCoords))
        if (mapInstanceRef.current && isTrackingRef.current) {
          mapInstanceRef.current.getView().setCenter(olCoords)
        }
        if (isVoiceEnabled && routeSteps.length > 0) {
          checkProximityAndAnnounce(coords)
        }
      },
      (error) => console.error("Live tracking error:", error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [isVoiceEnabled, routeSteps, checkProximityAndAnnounce])

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    isTrackingRef.current = false
  }, [])

  const toggleGroupVisibility = (groupId: string) => {
    const groupFeatures = featureSourceRef.current.getFeatures()
      .filter((f) => String(f.get("groupId")) === groupId)
    if (groupFeatures.length === 0) return

    setHiddenGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
        groupFeatures.forEach((f) => f.setStyle(undefined))
      } else {
        next.add(groupId)
        groupFeatures.forEach((f) => f.setStyle(() => []))
      }
      return next
    })
  }

  const handleRouteSelect = async (
    startCoord: [number, number],
    endCoord: [number, number],
    _destinationType: DestinationType,
    chainageOptions?: {
      interval: number
      showMarkers: boolean
      geometry: any
    }
  ) => {
    if (!osrmRef.current || !routeSourceRef.current || !mapInstanceRef.current) return

    try {
      routeSourceRef.current.clear(true)
      chainageSourceRef.current.clear(true)
      setIsDirectionsPanelOpen(false)
      setRouteSteps([])
      setCurrentStepIndex(0)
      announcedStepsRef.current.clear()
      lastProximityRef.current = Infinity

      // Handle chainage markers if requested
      if (chainageOptions?.showMarkers && chainageOptions.geometry) {
        const line = chainageOptions.geometry
        const lengthInKm = turf.length(line, { units: "kilometers" })
        const intervalInKm = (chainageOptions.interval || 100) / 1000
        
        // Cap the number of markers to prevent browser crashes on extremely long lines
        const maxMarkers = 500
        const step = Math.max(intervalInKm, lengthInKm / maxMarkers)

        for (let d = 0; d <= lengthInKm; d += step) {
          const point = turf.along(line, d, { units: "kilometers" })
          const coords = point.geometry.coordinates
          const distanceInMeters = Math.round(d * 1000)
          const markerFeature = new Feature({
            geometry: new Point(fromLonLat(coords as [number, number])),
            label: `${Math.floor(distanceInMeters / 1000)}+${(distanceInMeters % 1000).toString().padStart(3, '0')}`
          })
          
          markerFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 4,
              fill: new Fill({ color: "#ef4444" }),
              stroke: new Stroke({ color: "#ffffff", width: 1.5 })
            }),
            text: new Text({
              text: markerFeature.get("label"),
              font: "10px Inter, Arial, sans-serif",
              fill: new Fill({ color: "#ffffff" }),
              stroke: new Stroke({ color: "#000000", width: 3 }),
              offsetY: -12
            })
          }))
          
          chainageSourceRef.current.addFeature(markerFeature)
        }
      }

      const url = `${osrmRef.current.url}route/v1/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson&steps=true`
      const response = await fetch(url)
      const data = await response.json()

      if (data.code !== "Ok" || !data.routes?.length) {
        console.error("OSRM routing failed:", data)
        return
      }

      const route: OSRMRoute = data.routes[0]
      const steps = route.legs.flatMap((leg) => leg.steps)
      setRouteSteps(steps)
      setRouteSummary({ distance: route.distance, duration: route.duration })
      hasAnnouncedSummaryRef.current = false

      const routeFeatures = geoJsonFormat.readFeatures(
        { type: "Feature", geometry: route.geometry, properties: {} },
        { featureProjection: "EPSG:3857" }
      )

      if (routeFeatures.length > 0) {
        routeSourceRef.current.addFeatures(routeFeatures)
        const extent = routeFeatures[0].getGeometry()?.getExtent()
        if (extent) {
          mapInstanceRef.current.getView().fit(extent, { padding: [80, 80, 280, 80], duration: 500, maxZoom: 17 })
        }
      }

      setIsDirectionsPanelOpen(true)
    } catch (error) {
      console.error("Failed to calculate route:", error)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Map initialization                                               */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const osmLayer = new TileLayer({ source: new OSM(), visible: true })
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: satelliteAttribution,
        crossOrigin: "anonymous",
      }),
      visible: false,
    })
    const featureLayer = new VectorLayer({ source: featureSourceRef.current, style: featureStyleFunction, zIndex: 20 })
    const issueLayer = new VectorLayer({ source: issueSourceRef.current, style: issueStyleFunction, zIndex: 30 })
    const routeLayer = new VectorLayer({
      source: routeSourceRef.current,
      style: new Style({ stroke: new Stroke({ color: "rgba(34, 197, 94, 0.8)", width: 4 }) }),
      zIndex: 25,
    })
    const chainageLayer = new VectorLayer({
      source: chainageSourceRef.current,
      zIndex: 35,
    })

    osmLayerRef.current = osmLayer
    satelliteLayerRef.current = satelliteLayer
    featureLayerRef.current = featureLayer
    issueLayerRef.current = issueLayer
    routeLayerRef.current = routeLayer
    chainageLayerRef.current = chainageLayer
    osrmRef.current = { url: "https://router.project-osrm.org/" }

    const map = new Map({
      target: mapRef.current,
      controls: defaultControls({ zoom: true, rotate: false, attribution: true }),
      layers: [satelliteLayer, osmLayer, featureLayer, routeLayer, issueLayer, chainageLayer],
      view: new View({ center: fromLonLat(DEFAULT_CENTER), zoom: DEFAULT_ZOOM }),
    })

    map.on("click", async (event) => {
      const clicked = map.forEachFeatureAtPixel(event.pixel, (f) => f) as Feature | undefined
      if (!clicked) return
      const issueId = clicked.get("issueId")
      if (!issueId) return
      try {
        const issue = await ApiClient.get<Issue>(`/issues/${issueId}`)
        setSelectedIssue(issue)
      } catch {
        const fallback = clicked.get("issueData") as Issue | undefined
        if (fallback) setSelectedIssue(fallback)
      }
    })

    mapInstanceRef.current = map
    createLiveLocationLayer()

    return () => {
      stopLiveTracking()
      map.setTarget(undefined)
      mapInstanceRef.current = null
      osmLayerRef.current = null
      satelliteLayerRef.current = null
      featureLayerRef.current = null
      issueLayerRef.current = null
      routeLayerRef.current = null
      chainageLayerRef.current = null
      osrmRef.current = null
    }
  }, [createLiveLocationLayer, stopLiveTracking])

  // Basemap toggle
  useEffect(() => {
    if (!osmLayerRef.current || !satelliteLayerRef.current) return
    const showSatellite = basemap === "satellite"
    osmLayerRef.current.setVisible(!showSatellite)
    satelliteLayerRef.current.setVisible(showSatellite)
  }, [basemap])

  // Animate to project location
  useEffect(() => {
    const map = mapInstanceRef.current
    const coords = getProjectCoordinates(activeProject?.location)
    if (!map || !coords) return
    map.getView().animate({ center: fromLonLat(coords), zoom: PROJECT_LOCATION_ZOOM, duration: 450 })
  }, [activeProject?.id])

  // Load project data
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
        let effectiveCoords = projectCoordinates
        if (!effectiveCoords) {
          try {
            const project = await ApiClient.get<{ location?: { latitude: number; longitude: number } | string | null }>(`/projects/${projectId}`)
            effectiveCoords = getProjectCoordinates(project?.location)
          } catch (e) {
            console.warn("Failed to resolve project location:", e)
          }
        }

        const map = mapInstanceRef.current
        if (map && effectiveCoords) {
          const view = map.getView()
          view.setCenter(fromLonLat(effectiveCoords))
          view.setZoom(PROJECT_LOCATION_ZOOM)
        }

        console.log(`[FeatureMap] Loading data for project: ${projectId}`)
        const [featuresData, issuesData] = await Promise.all([
          loadProjectFeatures(projectId),
          loadProjectIssues(projectId),
        ])
        console.log(`[FeatureMap] Loaded ${featuresData?.length || 0} features and ${issuesData?.length || 0} issues`)

        if (cancelled) return

        setProjectIssues(issuesData)
        featureSourceRef.current.clear(true)
        issueSourceRef.current.clear(true)

        // Build routing-compatible feature list
        const routingFeatures = featuresData.map((feature) => {
          const geometry = parseGeometry(feature.geometry)
          if (!geometry) return null
          let coordinates: [number, number] | null = null
          try {
            const geo = geoJsonFormat.writeGeometryObject(geoJsonFormat.readGeometry(feature.geometry as any))
            if (geo.type === "Point" && geo.coordinates) {
              coordinates = geo.coordinates as [number, number]
            } else if ((geo.type === "LineString" || geo.type === "Polygon") && geo.coordinates) {
              const coords = geo.type === "LineString"
                ? (geo.coordinates as [number, number][])
                : ((geo.coordinates as any)[0] as [number, number][])
              if (coords.length > 0) coordinates = coords[0]
            }
          } catch { /* skip */ }
          return coordinates ? { 
            id: feature.id, 
            name: feature.name, 
            coordinates, 
            parentId: feature.parentId, 
            parentName: feature.parentName, 
            groupName: feature.groupName,
            geometry: parseGeometry(feature.geometry)
          } : null
        }).filter(Boolean) as typeof projectFeatures

        setProjectFeatures(routingFeatures)

        // Render features on map
        const featureCollection = {
          type: "FeatureCollection" as const,
          features: featuresData.map((feature) => {
            const geometry = parseGeometry(feature.geometry)
            if (!geometry) return null
            return {
              type: "Feature" as const,
              geometry,
              properties: {
                id: feature.id, name: feature.name,
                groupId: feature.parentId || feature.id,
                groupName: feature.groupName || feature.parentName || feature.name,
                projectId: feature.projectId, parentId: feature.parentId,
                createdAt: feature.createdAt, details: feature.details, images: feature.images,
              },
            }
          }).filter(Boolean),
        }

        const renderedFeatures = geoJsonFormat.readFeatures(featureCollection, { featureProjection: "EPSG:3857" })
        featureSourceRef.current.addFeatures(renderedFeatures)
        setHiddenGroupIds(new Set())

        // Build legend groups
        const groupMap: Record<string, LegendGroupItem> = {}
        for (const f of renderedFeatures) {
          const groupId = String(f.get("groupId") || f.get("id") || "")
          if (!groupId) continue
          const geometryType = f.getGeometry()?.getType() || "Unknown"
          const groupName = String(f.get("groupName") || f.get("name") || "Unnamed group")
          const existing = groupMap[groupId]
          if (existing) {
            existing.count += 1
            if (existing.geometryType !== geometryType) existing.geometryType = "Mixed"
          } else {
            groupMap[groupId] = { id: groupId, name: groupName, geometryType, count: 1 }
          }
        }
        setLegendGroups(Object.values(groupMap))

        // Render issues
        const issueFeatures = issuesData.map((issue) => {
          const coords = parseIssueCoordinates(issue)
          if (!coords) return null
          const feat = new Feature({
            geometry: new Point(fromLonLat(coords)),
            id: issue.id, issueId: issue.id, issueData: issue,
            title: issue.title, status: issue.status, priority: issue.priority, description: issue.description,
          })
          return feat
        }).filter(Boolean) as Feature<Point>[]

        issueSourceRef.current.addFeatures(issueFeatures)
        setFeatureCount(renderedFeatures.length)

        // Fit map to data extent if no project coordinates
        if (!effectiveCoords) {
          const combinedExtent = createEmptyExtent()
          let hasExtent = false
          for (const source of [featureSourceRef.current, issueSourceRef.current]) {
            source.forEachFeature((f) => {
              const geom = f.getGeometry()
              if (!geom) return
              extendExtent(combinedExtent, geom.getExtent())
              hasExtent = true
            })
          }
          if (hasExtent && mapInstanceRef.current) {
            mapInstanceRef.current.getView().fit(combinedExtent, { padding: [48, 48, 48, 48], duration: 500, maxZoom: 18 })
          }
        }
      } catch (error) {
        console.error("Failed to load project map data:", error)
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load project map data")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadProjectData()
    return () => { cancelled = true }
  }, [activeProject?.id])

  return (
    <div className="relative h-[calc(100vh-0px)] w-full overflow-hidden bg-background">
      <div ref={mapRef} className="h-full w-full" />

      <MapToolbar
        basemap={basemap}
        onBasemapChange={setBasemap}
        isTracking={isTrackingRef.current}
        onToggleTracking={() => isTrackingRef.current ? stopLiveTracking() : startLiveTracking()}
        isVoiceEnabled={isVoiceEnabled}
        onToggleVoice={() => setIsVoiceEnabled((v) => !v)}
        onOpenRouting={() => setIsRoutingModalOpen(true)}
      />

      <div className="absolute bottom-32 left-4 z-20">
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

      <div className="absolute right-4 bottom-32 z-20">
        <Button
          type="button"
          size="icon"
          onClick={() => setIsIssueFormOpen(true)}
          className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          title="Report new issue"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <MapLegend
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
        featureCount={featureCount}
        legendGroups={legendGroups}
        hiddenGroupIds={hiddenGroupIds}
        onToggleGroup={toggleGroupVisibility}
        onColorChange={handleColorChange}
      />

      {(isLoading || errorMessage || !activeProject) && (
        <div className="absolute right-4 bottom-4 z-10 max-w-md rounded-2xl bg-card/90 p-4 shadow-lg backdrop-blur">
          {!activeProject ? (
            <p className="text-sm text-muted-foreground">
              Select a project to load features and issues on the map.
            </p>
          ) : errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading project map data...</p>
          )}
        </div>
      )}

      {isIssueFormOpen && (
        <MapTriggeredIssueForm
          onClose={() => setIsIssueFormOpen(false)}
          onSuccess={() => setDataReloadKey((v) => v + 1)}
        />
      )}

      <RoutingModal
        isOpen={isRoutingModalOpen}
        onClose={() => setIsRoutingModalOpen(false)}
        onRouteSelect={handleRouteSelect}
        issues={projectIssues}
        features={projectFeatures}
      />

      <DirectionsPanel
        isOpen={isDirectionsPanelOpen}
        onClose={() => {
          setIsDirectionsPanelOpen(false)
          stopSpeaking()
          stopLiveTracking()
        }}
        steps={routeSteps}
        totalDistance={routeSummary.distance}
        totalDuration={routeSummary.duration}
        currentStepIndex={currentStepIndex}
      />

      {selectedIssue && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  )
}
