import { useEffect, useRef } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import OSM from "ol/source/OSM"
import OLFeature from "ol/Feature"
import { fromLonLat } from "ol/proj"
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style"
import GeoJSON from "ol/format/GeoJSON"
import "ol/ol.css"
import type { Feature } from "../../types/feature"

interface FeatureMapProps {
  featureGroups: any[] // Parent groups with children array
  visibleLayers: Set<string>
  onFeatureSelect?: (feature: Feature) => void
}

const getGeometryFromFeature = (feature: any): any => {
  if (feature.geometry) return feature.geometry
  if (feature.details?.geometry) return feature.details.geometry
  return null
}

const createOLFeature = (feature: any): OLFeature | null => {
  const geometry = getGeometryFromFeature(feature)
  if (!geometry) return null

  try {
    const geoJSONFormat = new GeoJSON({
      featureProjection: "EPSG:3857",
    })

    // Validate geometry is an object, not a string or null
    if (typeof geometry !== "object" || geometry === null) {
      console.debug(
        `[FeatureMap] Skipping ${feature.name}: geometry is not an object (type: ${typeof geometry})`
      )
      return null
    }

    // Validate geometry has a type property
    if (!geometry.type) {
      console.debug(
        `[FeatureMap] Skipping ${feature.name}: geometry missing type property. Keys: ${Object.keys(geometry).join(", ")}`
      )
      return null
    }

    const geoJSONFeature: any = {
      type: "Feature",
      geometry: geometry,
      properties: {
        id: feature.id,
        name: feature.name,
        parentId: feature.parentId,
      },
    }

    return geoJSONFormat.readFeature(geoJSONFeature) as OLFeature
  } catch (error) {
    console.error(
      `[FeatureMap] Failed to create OL feature for ${feature.name}:`,
      {
        error: error instanceof Error ? error.message : String(error),
        geometryType: typeof geometry,
        geometryKeys:
          geometry && typeof geometry === "object"
            ? Object.keys(geometry)
            : "N/A",
        geometry: geometry,
      }
    )
    return null
  }
}

export function FeatureMap({
  featureGroups,
  visibleLayers,
  onFeatureSelect,
}: FeatureMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const vectorSource = useRef<VectorSource>(new VectorSource())
  const vectorLayer = useRef<VectorLayer>(new VectorLayer())

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const baseLayer = new TileLayer({
      source: new OSM(),
    })

    vectorLayer.current = new VectorLayer({
      source: vectorSource.current,
      style: (feature) => {
        const geometry = feature.getGeometry()
        let style: Style

        if (geometry?.getType() === "Point") {
          style = new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: "#3b82f6" }),
              stroke: new Stroke({ color: "#1e40af", width: 2 }),
            }),
          })
        } else if (
          geometry?.getType() === "LineString" ||
          geometry?.getType() === "MultiLineString"
        ) {
          style = new Style({
            stroke: new Stroke({
              color: "#10b981",
              width: 3,
            }),
          })
        } else if (
          geometry?.getType() === "Polygon" ||
          geometry?.getType() === "MultiPolygon"
        ) {
          style = new Style({
            fill: new Fill({ color: "rgba(239, 68, 68, 0.3)" }),
            stroke: new Stroke({
              color: "#dc2626",
              width: 2,
            }),
          })
        } else {
          style = new Style()
        }

        return style
      },
    })

    map.current = new Map({
      target: mapContainer.current,
      layers: [baseLayer, vectorLayer.current],
      view: new View({
        center: fromLonLat([20, -5]),
        zoom: 3,
      }),
    })

    // Click handler for feature selection
    map.current.on("click", (evt) => {
      const pixel = evt.pixel
      const feature = map.current?.forEachFeatureAtPixel(
        pixel,
        (feature) => feature
      )
      if (feature && onFeatureSelect) {
        const props = feature.getProperties()
        // Search through all groups and children
        for (const group of featureGroups) {
          if (group.id === props.id) {
            onFeatureSelect(group)
            return
          }
          if (group.children) {
            const child = group.children.find((c: any) => c.id === props.id)
            if (child) {
              onFeatureSelect(child)
              return
            }
          }
        }
      }
    })

    return () => {
      if (map.current) {
        map.current.setTarget(undefined)
        map.current = null
      }
    }
  }, [featureGroups, onFeatureSelect])

  // Update features and visibility
  useEffect(() => {
    if (!vectorSource.current) return

    vectorSource.current.clear()

    // Flatten all child features from visible parent groups
    const allChildren: any[] = []
    for (const group of featureGroups) {
      if (visibleLayers.has(group.id) && group.children) {
        allChildren.push(...group.children)
      }
    }

    console.log("[FeatureMap] Rendering:", {
      totalGroups: featureGroups.length,
      visibleLayers: Array.from(visibleLayers),
      allChildren: allChildren.map((f: any) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        hasGeometry: !!getGeometryFromFeature(f),
      })),
    })

    for (const feature of allChildren) {
      const olFeature = createOLFeature(feature)
      if (olFeature) {
        vectorSource.current.addFeature(olFeature)
      } else {
        console.warn(
          `[FeatureMap] Failed to create OL feature for: ${feature.name}`
        )
      }
    }

    // Auto-fit to features if any visible
    if (allChildren.length > 0 && map.current) {
      const extent = vectorSource.current.getExtent()
      if (extent && extent[0] !== Infinity) {
        map.current.getView().fit(extent, { padding: [50, 50, 50, 50] })
      }
    }
  }, [featureGroups, visibleLayers])

  return (
    <div
      ref={mapContainer}
      className="h-full w-full bg-gray-100"
      style={{ minHeight: "400px" }}
    />
  )
}
