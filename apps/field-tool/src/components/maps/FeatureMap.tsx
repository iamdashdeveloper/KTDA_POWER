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
import LineString from "ol/geom/LineString"
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
import { getProjectCoordinates, haversineDistance, generateInstruction, formatDistance, formatDuration, getThemeColor, setStoredLayerColor, getBearingText } from "./mapUtils"
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

  // Hybrid navigation state
  const [navigationMode, setNavigationMode] = useState<"route" | "direct">("route")
  const [snappedEnd, setSnappedEnd] = useState<[number, number] | null>(null)
  const [finalTarget, setFinalTarget] = useState<[number, number] | null>(null)

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

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    isTrackingRef.current = false
  }, [])

  const checkProximityAndAnnounce = useCallback((currentPos: [number, number]) => {
    // If in direct mode, give bearing-based instructions
    if (navigationMode === "direct" && finalTarget) {
      const distance = haversineDistance(currentPos, finalTarget)
      
      if (distance < 10) {
        speak("You have arrived at your destination")
        stopLiveTracking()
        setIsDirectionsPanelOpen(false)
        return
      }

      // Announce every 100, 50, 20 meters
      for (const threshold of [100, 50, 20]) {
        if (distance <= threshold && distance > threshold - 10 && lastProximityRef.current > threshold) {
          lastProximityRef.current = distance
          const bearing = turf.bearing(turf.point(currentPos), turf.point(finalTarget))
          speak(`Proceed ${Math.round(distance)} meters ${getBearingText(bearing)}`)
          break
        }
      }
      return
    }

    // Standard OSRM route logic
    if (currentStepIndex >= routeSteps.length) return
    const step = routeSteps[currentStepIndex]
    const distance = haversineDistance(currentPos, step.maneuver.location)

    // Check for transition to direct mode near the snapped end point
    if (snappedEnd) {
      const distToSnappedEnd = haversineDistance(currentPos, snappedEnd)
      if (distToSnappedEnd < 30) {
        setNavigationMode("direct")
        speak("Switching to direct navigation for the final segment")
        lastProximityRef.current = Infinity
        return
      }
    }

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
  }, [currentStepIndex, routeSteps, navigationMode, finalTarget, snappedEnd, stopLiveTracking])

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

  const getNearestRoadPoint = async (coord: [number, number]) => {
    try {
      const url = `${osrmRef.current.url}nearest/v1/driving/${coord[0]},${coord[1]}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.code === "Ok" && data.waypoints?.length > 0) {
        return data.waypoints[0].location as [number, number]
      }
    } catch (e) {
      console.warn("[FeatureMap] Failed to snap point to road:", e)
    }
    return coord
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
      
      setNavigationMode("route")
      setFinalTarget(endCoord)
      
      // Step 1: Snap points to road
      const snappedStart = await getNearestRoadPoint(startCoord)
      const snappedEndCoord = await getNearestRoadPoint(endCoord)
      setSnappedEnd(snappedEndCoord)

      // Measure how far destination is from the road
      const distToRoad = turf.distance(
        turf.point(endCoord),
        turf.point(snappedEndCoord),
        { units: "meters" }
      )

      // Handle chainage markers if requested
      if (chainageOptions?.showMarkers && chainageOptions.geometry) {
        const originalGeom = chainageOptions.geometry
        const lengthInKm = turf.length(originalGeom, { units: "kilometers" })
        const intervalInKm = (chainageOptions.interval || 100) / 1000
        
        // Ensure we have a LineString for turf.along (which doesn't support MultiLineString)
        let lineForAlong: any = originalGeom
        if (originalGeom.type === "MultiLineString") {
          lineForAlong = turf.lineString(originalGeom.coordinates.flat(1)).geometry
        }

        if (lineForAlong.type === "LineString" && lineForAlong.coordinates.length >= 2 && lengthInKm > 0) {
          // Cap the number of markers to prevent browser crashes on extremely long lines
          const maxMarkers = 500
          const step = Math.max(intervalInKm, lengthInKm / maxMarkers)

          for (let d = 0; d <= lengthInKm; d += step) {
            try {
              const point = turf.along(lineForAlong, d, { units: "kilometers" })
              const coords = point.geometry.coordinates as [number, number]
              const distanceInMeters = Math.round(d * 1000)
              const markerFeature = new Feature({
                geometry: new Point(fromLonLat(coords)),
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
            } catch (err) {
              console.warn(`[FeatureMap] Failed to create chainage marker at distance ${d}:`, err)
            }
          }
        }
      }

      // Step 2: Calculate road route
      let routeData: any = null
      if (distToRoad < 500) { // Only route if within 500m of a road
        const url = `${osrmRef.current.url}route/v1/driving/${snappedStart[0]},${snappedStart[1]};${snappedEndCoord[0]},${snappedEndCoord[1]}?overview=full&geometries=geojson&steps=true`
        const response = await fetch(url)
        routeData = await response.json()
      }

      if (routeData && routeData.code === "Ok" && routeData.routes?.length > 0) {
        const route: OSRMRoute = routeData.routes[0]
        const steps = route.legs.flatMap((leg) => leg.steps)
        
        // Add final off-road segment to turn-by-turn steps
        if (distToRoad > 15) {
          steps.push({
            maneuver: {
              type: "direct",
              location: endCoord,
              instruction: `Leave road and proceed ${Math.round(distToRoad)}m off-road`
            },
            name: "Off-road path",
            distance: distToRoad,
            duration: distToRoad / 1.4
          } as any)
        }
        
        setRouteSteps(steps)
        setRouteSummary({ distance: route.distance + distToRoad, duration: route.duration })
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
      } else {
        // Fallback to direct navigation if road routing fails or destination is too far
        setNavigationMode("direct")
        const directDist = haversineDistance(startCoord, endCoord)
        setRouteSummary({ distance: directDist, duration: directDist / 1.4 }) // 1.4 m/s walking speed
        setRouteSteps([{
          maneuver: {
            type: "direct",
            location: endCoord,
            instruction: `Proceed ${Math.round(directDist)}m directly to destination`
          },
          name: "Direct Path",
          distance: directDist,
          duration: directDist / 1.4
        } as any])
        hasAnnouncedSummaryRef.current = false
      }

      // Step 3: Draw off-road dashed line if needed
      if (distToRoad > 10) {
        const offRoadLine = new Feature({
          geometry: new LineString([fromLonLat(snappedEndCoord), fromLonLat(endCoord)])
        })
        offRoadLine.setStyle(new Style({
          stroke: new Stroke({
            color: "rgba(34, 197, 94, 0.6)",
            width: 4,
            lineDash: [6, 6]
          })
        }))
        routeSourceRef.current.addFeature(offRoadLine)
      }

      setIsDirectionsPanelOpen(true)
    } catch (error) {
      console.error("Failed to calculate hybrid route:", error)
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
        console.log("[FeatureMap] Features data:", {
          count: featuresData?.length || 0,
          objects: featuresData
        })
        console.log("[FeatureMap] Issues data:", {
          count: issuesData?.length || 0,
          objects: issuesData
        })

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
            // Use turf to get a reliable representative point on the feature regardless of geometry type
            // This handles Point, LineString, Polygon, MultiLineString, MultiPolygon, etc.
            const feat = turf.feature(geometry as any)
            const pointOnFeature = turf.pointOnFeature(feat)
            coordinates = pointOnFeature.geometry.coordinates as [number, number]
          } catch (e) {
            console.warn(`[FeatureMap] Failed to extract coordinates for feature ${feature.id}:`, e)
          }

          return coordinates ? { 
            id: feature.id, 
            name: feature.name, 
            coordinates, 
            parentId: feature.parentId, 
            parentName: feature.parentName, 
            groupName: feature.groupName,
            geometry
          } : null
        }).filter(Boolean) as typeof projectFeatures

        setProjectFeatures(routingFeatures)
        console.log("[FeatureMap] Routing features prepared:", {
          count: routingFeatures.length,
          objects: routingFeatures
        })

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
        navigationMode={navigationMode}
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
