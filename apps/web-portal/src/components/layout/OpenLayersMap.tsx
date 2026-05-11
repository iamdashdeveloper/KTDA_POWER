import * as React from "react"
import { AlertCircle } from "lucide-react"
import { useProjectStore } from "@/store/useProjectStore"
import { useMapStore } from "@/store/useMapStore"
import {
  loadProjectFeatures,
  loadProjectIssues,
  parseGeometry,
  loadFeatureById,
} from "@/lib/mapData"
import { getProjectCoordinates } from "@/components/maps/mapUtils"
import {
  featureStyleFunction,
  issueStyleFunction,
} from "@/components/maps/mapStyles"
import * as turf from "@turf/turf"

// OpenLayers imports
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import OSM from "ol/source/OSM"
import XYZ from "ol/source/XYZ"
import { fromLonLat, toLonLat } from "ol/proj"
import { createEmpty, extend, isEmpty } from "ol/extent"
import GeoJSON from "ol/format/GeoJSON"
import Feature from "ol/Feature"
import Point from "ol/geom/Point"
import { defaults as defaultControls, MousePosition } from "ol/control"
import { createStringXY } from "ol/coordinate"
import { defaults as defaultInteractions } from "ol/interaction"

// Modular Components
import { CoordinateBar } from "./map-controls/CoordinateBar"
import { LoadingOverlay } from "./map-controls/LoadingOverlay"
import { ZoomBoxLogic } from "./ribbon/tools/navigation/ZoomBoxLogic"
import { MeasureLogic } from "./ribbon/tools/inquiry/MeasureLogic"
import { GenerateChainnageLogic } from "./ribbon/tools/inquiry/GenerateChainnageLogic"
import { DrawingLogic } from "./ribbon/tools/drawing/DrawingLogic"
import { AnalysisLogic } from "./map-logic/AnalysisLogic"
import { SwipeController } from "../compare/SwipeController"

import { useLayout } from "@/context/LayoutContext"
import { IdentifyPanel } from "./panels/IdentifyPanel"

import { ApiClient } from "@/lib/api"

const geoJsonFormat = new GeoJSON()

export const OpenLayersMap: React.FC = () => {
  const mapRef = React.useRef<HTMLDivElement>(null)

  const { openPanel, setCollapsed } = useLayout()

  const activeProject = useProjectStore((state) => state.activeProject)
  const {
    layers,
    setStats,
    setProjectFeatures,
    setScratchFeatures,
    hiddenFeatureIds,
    activeTool,
    refreshTrigger,
    viewCenter,
    viewZoom,
    landCoverTileUrl,
    dynamicWorldTileUrl,
    dynamicWorldConfig,
    compareConfig,
    animationConfig,
  } = useMapStore()

  // Ref for tool to use inside event listeners
  const toolRef = React.useRef(activeTool)
  React.useEffect(() => {
    toolRef.current = activeTool
  }, [activeTool])

  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [resolution, setResolution] = React.useState(0)

  // Layer Refs for synchronization
  const layersRef = React.useRef<{
    osm: TileLayer<OSM>
    satellite: TileLayer<XYZ>
    reference: TileLayer<XYZ>
    landcover: TileLayer<XYZ>
    dynamicworld: TileLayer<XYZ>
    features: VectorLayer<VectorSource>
    issues: VectorLayer<VectorSource>
    animation: TileLayer<XYZ>
  } | null>(null)

  // Sync Individual Feature Visibility
  React.useEffect(() => {
    if (!layersRef.current) return
    const source = layersRef.current.features.getSource()
    if (!source) return

    source.getFeatures().forEach((f) => {
      const id = f.get("id")
      if (hiddenFeatureIds.has(id)) {
        f.setStyle(() => []) // Hide
      } else {
        f.setStyle(undefined) // Use layer default style
      }
    })
  }, [hiddenFeatureIds])

  const [_, setMapInstance] = React.useState<Map | null>(null)
  const mapInstanceRef = React.useRef<Map | null>(null)

  // Initialize Map
  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // ... (layers initialization)
    const osm = new TileLayer({ source: new OSM(), visible: true })
    const satellite = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        crossOrigin: "anonymous",
      }),
      visible: false,
    })
    const reference = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        crossOrigin: "anonymous",
      }),
      visible: true,
    })
    const landcover = new TileLayer({
      source: new XYZ({
        url: "",
        crossOrigin: "anonymous",
      }),
      visible: false,
      opacity: 0.7,
      zIndex: 5,
    })
    const dynamicworld = new TileLayer({
      source: new XYZ({
        url: "",
        crossOrigin: "anonymous",
      }),
      visible: false,
      opacity: 0.85,
      zIndex: 6,
    })
    const featuresSource = new VectorSource()
    const features = new VectorLayer({
      source: featuresSource,
      style: featureStyleFunction,
      zIndex: 10,
    })
    const issuesSource = new VectorSource()
    const issues = new VectorLayer({
      source: issuesSource,
      style: issueStyleFunction,
      zIndex: 20,
    })
    const animation = new TileLayer({
      source: new XYZ({ url: "", crossOrigin: "anonymous" }),
      visible: false,
      zIndex: 100, // Top most raster
    })

    layersRef.current = { osm, satellite, reference, landcover, dynamicworld, features, issues, animation }

    const map = new Map({
      target: mapRef.current,
      layers: [satellite, osm, landcover, dynamicworld, reference, features, issues, animation],
      interactions: defaultInteractions().extend([]),
      view: new View({
        center: fromLonLat(viewCenter),
        zoom: viewZoom,
      }),
      controls: defaultControls({ rotate: false, attribution: true }).extend([
        new MousePosition({
          coordinateFormat: createStringXY(4),
          projection: "EPSG:4326",
          className: "custom-mouse-position text-[10px] font-mono",
          target: "mouse-position",
        }),
      ]),
    })

    map.on("moveend", () => {
      const view = map.getView()
      setResolution(view.getResolution() || 0)
      const center = toLonLat(view.getCenter()!)
      const zoom = view.getZoom()!
      useMapStore.getState().setViewCenterZoom([center[0], center[1]], zoom)
    })

    map.on("singleclick", async (event) => {
      const result = map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          return { feature, layer }
        }
      )

      if (!result) return
      const { feature, layer } = result
      const properties = (feature as Feature).getProperties()

      // Determine if it's an issue based on the layer
      const isIssueLayer = layer === layersRef.current?.issues
      const isFeatureLayer = layer === layersRef.current?.features

      if (isIssueLayer) {
        const issueId = properties.id || properties.issueId
        // Always identify issues if clicked
        try {
          const fullIssue = await ApiClient.get(`/issues/${issueId}`)
          openPanel(
            "right",
            <IdentifyPanel key={issueId} data={fullIssue} type="issue" />,
            "Issue Details"
          )
          setCollapsed("right", false)
        } catch (err) {
          console.error("Failed to fetch issue details:", err)
          // Fallback to what we have
          openPanel(
            "right",
            <IdentifyPanel key={issueId} data={properties} type="issue" />,
            "Issue Details"
          )
          setCollapsed("right", false)
        }
      } else if (isFeatureLayer && toolRef.current === "identify") {
        // Regular features only with identify tool
        openPanel(
          "right",
          <IdentifyPanel
            key={properties.id}
            data={properties}
            type="feature"
          />,
          "Feature Details"
        )
        setCollapsed("right", false)
      }
    })

    mapInstanceRef.current = map
    setMapInstance(map)
    setResolution(map.getView().getResolution() || 0)

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
      setMapInstance(null)
    }
  }, [])

  // Sync Layer Visibility with Store
  React.useEffect(() => {
    if (!layersRef.current) return

    layers.forEach((layer) => {
      switch (layer.id) {
        case "osm":
          layersRef.current!.osm.setVisible(layer.visible)
          break
        case "satellite":
          layersRef.current!.satellite.setVisible(layer.visible)
          break
        case "reference":
          layersRef.current!.reference.setVisible(layer.visible)
          break
        case "landcover":
          layersRef.current!.landcover.setVisible(layer.visible)
          break
        case "dynamicworld":
          layersRef.current!.dynamicworld.setVisible(layer.visible)
          break
        case "project-features":
          layersRef.current!.features.setVisible(layer.visible)
          break
        case "project-issues":
          layersRef.current!.issues.setVisible(layer.visible)
          break
      }
    })
  }, [layers])

  // Update Landcover URL dynamically
  React.useEffect(() => {
    if (layersRef.current?.landcover && landCoverTileUrl) {
      layersRef.current.landcover.setSource(
        new XYZ({
          url: landCoverTileUrl,
          crossOrigin: "anonymous",
        })
      )
    }
  }, [landCoverTileUrl])

  // Update Dynamic World URL dynamically
  React.useEffect(() => {
    if (layersRef.current?.dynamicworld && dynamicWorldTileUrl) {
      layersRef.current.dynamicworld.setSource(
        new XYZ({
          url: dynamicWorldTileUrl,
          crossOrigin: "anonymous",
        })
      )
    }
  }, [dynamicWorldTileUrl])

  // Sync Dynamic World opacity
  React.useEffect(() => {
    if (layersRef.current?.dynamicworld) {
      layersRef.current.dynamicworld.setOpacity(dynamicWorldConfig.opacity)
    }
  }, [dynamicWorldConfig.opacity])

  // Swipe Tool Logic (Clipping)
  React.useEffect(() => {
    if (!mapInstanceRef.current || !layersRef.current) return

    const { active, leftLayer, rightLayer, swipePosition } = compareConfig
    const map = mapInstanceRef.current

    // Reset all raster layers first
    const rasterLayers = [
      layersRef.current.osm,
      layersRef.current.satellite,
      layersRef.current.landcover,
      layersRef.current.dynamicworld
    ]

    rasterLayers.forEach(l => {
      if ((l as any).swipePrerender) {
        l.un('prerender', (l as any).swipePrerender)
      }
      if ((l as any).swipePostrender) {
        l.un('postrender', (l as any).swipePostrender)
      }
      ;(l as any).swipePrerender = null
      ;(l as any).swipePostrender = null
      // Restore default z-index if needed
      if (l === layersRef.current?.landcover) l.setZIndex(5)
      if (l === layersRef.current?.dynamicworld) l.setZIndex(6)
    })

    if (!active) {
      map.render()
      return
    }

    const getLayer = (id: string) => {
      if (id === 'satellite') return layersRef.current?.satellite
      if (id === 'landcover') return layersRef.current?.landcover
      if (id === 'dynamicworld') return layersRef.current?.dynamicworld
      if (id === 'osm') return layersRef.current?.osm
      return null
    }

    const left = getLayer(leftLayer)
    const right = getLayer(rightLayer)

    if (left && right) {
      // Ensure they are visible and on top for comparison
      left.setVisible(true)
      right.setVisible(true)
      left.setZIndex(50)
      right.setZIndex(51)

      const onPrerenderLeft = (event: any) => {
        const ctx = event.context
        const mapSize = map.getSize()!
        const pixelRatio = event.frameState.pixelRatio
        const width = mapSize[0] * (swipePosition / 100) * pixelRatio
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, width, mapSize[1] * pixelRatio)
        ctx.clip()
      }

      const onPrerenderRight = (event: any) => {
        const ctx = event.context
        const mapSize = map.getSize()!
        const pixelRatio = event.frameState.pixelRatio
        const width = mapSize[0] * (swipePosition / 100) * pixelRatio
        ctx.save()
        ctx.beginPath()
        ctx.rect(width, 0, (mapSize[0] * pixelRatio) - width, mapSize[1] * pixelRatio)
        ctx.clip()
      }

      const onPostrender = (event: any) => {
        const ctx = event.context
        ctx.restore()
      }

      left.on('prerender', onPrerenderLeft)
      left.on('postrender', onPostrender)
      ;(left as any).swipePrerender = onPrerenderLeft
      ;(left as any).swipePostrender = onPostrender

      right.on('prerender', onPrerenderRight)
      right.on('postrender', onPostrender)
      ;(right as any).swipePrerender = onPrerenderRight
      ;(right as any).swipePostrender = onPostrender
    }

    map.render()

    return () => {
      rasterLayers.forEach(l => {
        if ((l as any).swipePrerender) {
          l.un('prerender', (l as any).swipePrerender)
        }
        if ((l as any).swipePostrender) {
          l.un('postrender', (l as any).swipePostrender)
        }
      })
    }
  }, [compareConfig])

  // Animation Tool Logic
  React.useEffect(() => {
    if (!layersRef.current) return
    const { active, frames, currentFrameIndex } = animationConfig
    const animLayer = layersRef.current.animation

    if (!active || frames.length === 0) {
      animLayer.setVisible(false)
      return
    }

    const currentFrame = frames[currentFrameIndex]
    if (currentFrame) {
      animLayer.setVisible(true)
      animLayer.setSource(
        new XYZ({
          url: currentFrame.tileUrl,
          crossOrigin: "anonymous",
        })
      )
    }
  }, [animationConfig.active, animationConfig.frames, animationConfig.currentFrameIndex])

  // Load Scratch Layers (Session/Independent)
  React.useEffect(() => {
    if (!mapInstanceRef.current || !layersRef.current) return

    const loadScratch = async () => {
      const scratchIds = JSON.parse(
        localStorage.getItem("scratch_layers") || "[]"
      )
      if (scratchIds.length === 0) {
        setScratchFeatures([])
        return
      }

      try {
        const scratchData = await Promise.all(
          scratchIds.map((id: string) => loadFeatureById(id).catch(() => null))
        )

        const validScratch = scratchData.filter(Boolean)
        const allFeatures: any[] = []

        validScratch.forEach((group: any) => {
          if (group.subFeatures) {
            group.subFeatures.forEach((f: any) => {
              allFeatures.push({
                ...f,
                groupName: group.name,
                groupId: group.id,
              })
            })
          } else {
            allFeatures.push(group)
          }
        })

        setScratchFeatures(
          allFeatures.map((f) => ({
            id: f.id,
            name: f.name,
            visible: true,
            groupId: f.groupId || f.parentId || undefined,
            groupName: f.groupName || undefined,
            parentName: f.groupName || undefined,
          }))
        )
      } catch (err) {
        console.error("Failed to load scratch layers:", err)
      }
    }

    loadScratch()
  }, [refreshTrigger]) // Reload scratch layers when triggered (e.g. after upload)

  // Load Project Data
  React.useEffect(() => {
    if (!activeProject?.id || !mapInstanceRef.current || !layersRef.current)
      return

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const scratchIds = JSON.parse(
          localStorage.getItem("scratch_layers") || "[]"
        )

        const [featuresData, issuesData, scratchFeaturesRaw] =
          await Promise.all([
            loadProjectFeatures(activeProject.id),
            loadProjectIssues(activeProject.id),
            Promise.all(
              scratchIds.map((id: string) =>
                loadFeatureById(id).catch(() => null)
              )
            ),
          ])

        const validScratch = scratchFeaturesRaw.filter(Boolean)
        const scratchFeaturesData: any[] = []
        validScratch.forEach((group: any) => {
          if (group.subFeatures) {
            group.subFeatures.forEach((f: any) => {
              scratchFeaturesData.push({
                ...f,
                groupName: group.name,
                groupId: group.id,
              })
            })
          } else {
            scratchFeaturesData.push(group)
          }
        })

        // Update Stats and Store Features
        setStats(
          featuresData.length + scratchFeaturesData.length,
          issuesData.length
        )
        setProjectFeatures(
          featuresData.map((f) => {
            const geometry = parseGeometry(f.geometry)
            let coordinates: [number, number] | undefined

            // Extract representative coordinates for routing using turf.pointOnFeature
            if (geometry) {
              try {
                const feat = turf.feature(geometry as any)
                const pointOnFeature = turf.pointOnFeature(feat)
                coordinates = pointOnFeature.geometry.coordinates as [
                  number,
                  number,
                ]
              } catch (e) {
                console.warn(
                  `[OpenLayersMap] Failed to extract coordinates for feature ${f.id}:`,
                  e
                )
              }
            }

            return {
              id: f.id,
              name: f.name,
              visible: true,
              groupId: f.parentId || undefined,
              groupName: f.groupName || undefined,
              parentName: f.parentName || undefined,
              geometry,
              coordinates,
            }
          })
        )

        // Combine for rendering but keep store separate if needed?
        // For now, let's also update scratchFeatures in store
        setScratchFeatures(
          scratchFeaturesData.map((f) => {
            const geometry = parseGeometry(f.geometry)
            let coordinates: [number, number] | undefined

            if (geometry) {
              try {
                const feat = turf.feature(geometry as any)
                const pointOnFeature = turf.pointOnFeature(feat)
                coordinates = pointOnFeature.geometry.coordinates as [
                  number,
                  number,
                ]
              } catch (e) {
                console.warn(
                  `[OpenLayersMap] Failed to extract coordinates for scratch feature ${f.id}:`,
                  e
                )
              }
            }

            return {
              id: f.id,
              name: f.name,
              visible: true,
              groupId: f.groupId || undefined,
              groupName: f.groupName || undefined,
              parentName: f.parentName || undefined,
              geometry,
              coordinates,
            }
          })
        )

        // Clear and add Features
        const featureSource = layersRef.current!.features.getSource()
        featureSource?.clear()

        const geojsonFeatures = [...featuresData, ...scratchFeaturesData]
          .map((f) => {
            const geometry = parseGeometry(f.geometry)
            if (!geometry) return null

            const { geometry: _, ...properties } = f

            return {
              type: "Feature",
              geometry,
              properties: { ...properties, id: f.id },
            }
          })
          .filter(Boolean)

        if (geojsonFeatures.length > 0) {
          const features = geoJsonFormat.readFeatures(
            {
              type: "FeatureCollection",
              features: geojsonFeatures,
            },
            {
              featureProjection: "EPSG:3857",
            }
          )
          // Set feature IDs from properties
          features.forEach((feature) => {
            const id = feature.get("id")
            if (id) {
              feature.setId(id)
            }
          })
          featureSource?.addFeatures(features)
        }

        // Clear and add Issues
        const issueSource = layersRef.current!.issues.getSource()
        issueSource?.clear()

        const issueFeatures = issuesData
          .map((issue) => {
            let coords: [number, number] | null = null
            if (issue.location && typeof issue.location === "object") {
              const geom = issue.location as any
              if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
                coords = [
                  Number(geom.coordinates[0]),
                  Number(geom.coordinates[1]),
                ]
              }
            }
            if (!coords && issue.metadata) {
              const lat = Number(issue.metadata.latitude)
              const lon = Number(issue.metadata.longitude)
              if (!isNaN(lat) && !isNaN(lon)) coords = [lon, lat]
            }

            if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
              const { location: _, geometry: __, ...properties } = issue as any
              const feat = new Feature(properties)
              feat.setGeometry(new Point(fromLonLat(coords)))
              feat.set("id", issue.id)
              return feat
            }
            return null
          })
          .filter(Boolean) as Feature[]

        if (issueFeatures.length > 0) {
          issueSource?.addFeatures(issueFeatures)
        }

        // Center view
        const projectCoords = getProjectCoordinates(activeProject.location)
        if (projectCoords) {
          mapInstanceRef.current?.getView().animate({
            center: fromLonLat(projectCoords),
            zoom: 16,
            duration: 1000,
          })
        } else if (featureSource?.getFeatures().length) {
          const extent = featureSource.getExtent()
          if (extent && !isEmpty(extent)) {
            mapInstanceRef.current?.getView().fit(extent, {
              padding: [50, 50, 50, 50],
              duration: 1000,
            })
          }
        }
      } catch (err) {
        console.error("Failed to load project data:", err)
        setError("Failed to load map data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeProject?.id, refreshTrigger, setStats, setProjectFeatures])

  // Handle Ribbon Commands
  const currentCommand = useMapStore((state) => state.currentCommand)
  React.useEffect(() => {
    if (!currentCommand || !mapInstanceRef.current) return

    const { id } = currentCommand
    const view = mapInstanceRef.current.getView()

    switch (id) {
      case "zoom-home":
        const projectCoords = getProjectCoordinates(activeProject?.location)
        if (projectCoords) {
          view.animate({
            center: fromLonLat(projectCoords),
            zoom: 16,
            duration: 1000,
          })
        }
        break
      case "full-extent":
        const extent = layersRef.current?.features.getSource()?.getExtent()
        if (extent)
          view.fit(extent, { duration: 1000, padding: [50, 50, 50, 50] })
        break
      case "reset-north":
        view.animate({ rotation: 0, duration: 500 })
        break
      case "zoom-to-layer": {
        const {
          id: layerId,
          name: layerName,
          type: layerType,
        } = currentCommand.payload || {}
        if (!layerId) break

        let zoomExtent = createEmpty()

        if (layerType === "project" || layerType === "scratch") {
          const features =
            layersRef.current?.features.getSource()?.getFeatures() || []
          const matchingFeatures = features.filter((f) => {
            const props = f.getProperties()
            const cleanId = layerId
              .replace("group-", "")
              .replace("scratch-", "")
            return (
              props.groupName === layerName ||
              props.groupId === cleanId ||
              props.parentId === cleanId
            )
          })

          if (matchingFeatures.length > 0) {
            matchingFeatures.forEach((f) => {
              const geom = f.getGeometry()
              if (geom) extend(zoomExtent, geom.getExtent())
            })
          }
        } else if (layerId === "project-issues") {
          const extent = layersRef.current?.issues.getSource()?.getExtent()
          if (extent) zoomExtent = extent
        } else if (layersRef.current && (layersRef.current as any)[layerId]) {
          const extent = (layersRef.current as any)[layerId]
            .getSource()
            ?.getExtent()
          if (extent) zoomExtent = extent
        }

        if (!isEmpty(zoomExtent)) {
          view.fit(zoomExtent, {
            duration: 1000,
            padding: [100, 100, 100, 100],
            maxZoom: 18,
          })
        }
        break
      }
      case "zoom-to-location":
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
            view.animate({
              center: fromLonLat([
                position.coords.longitude,
                position.coords.latitude,
              ]),
              zoom: 17,
              duration: 1000,
            })
          })
        }
        break
      default:
        console.log("Command not implemented in MapCanvas:", id)
    }
  }, [currentCommand, activeProject])

  return (
    <div
      className="group relative h-full w-full overflow-hidden bg-muted/10"
      data-map-instance
      ref={(element) => {
        if (mapInstanceRef.current && element) {
          ;(element as any).__mapInstance = mapInstanceRef.current
          console.log(
            "[OpenLayersMap] ✓ Map instance attached to data-map-instance element"
          )
        }
      }}
    >
      <div ref={mapRef} className="absolute inset-0" />

      <LoadingOverlay isLoading={isLoading} />
      
      {/* Swipe Divider Layer */}
      <SwipeController />

      {error && (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-4 py-2 text-[11px] text-destructive shadow-lg backdrop-blur-md">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}

      <CoordinateBar resolution={resolution} />

      {/* Interaction Logic */}
      {mapInstanceRef.current && (
        <>
          <ZoomBoxLogic
            map={mapInstanceRef.current}
            active={activeTool === "zoom-box"}
          />
          <MeasureLogic map={mapInstanceRef.current} activeTool={activeTool} />
          <GenerateChainnageLogic
            map={mapInstanceRef.current}
            activeTool={activeTool}
          />
          <DrawingLogic map={mapInstanceRef.current} activeTool={activeTool} />
          <AnalysisLogic map={mapInstanceRef.current} />
        </>
      )}
    </div>
  )
}
