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
  features: Feature[]
  visibleLayers: Set<string>
  onFeatureSelect?: (feature: Feature) => void
}

const getGeometryFromFeature = (feature: Feature): any => {
  if (feature.geometry) return feature.geometry
  if (feature.details?.geometry) return feature.details.geometry
  return null
}

const createOLFeature = (feature: Feature): OLFeature | null => {
  const geometry = getGeometryFromFeature(feature)
  if (!geometry) return null

  try {
    const geoJSONFormat = new GeoJSON({
      featureProjection: "EPSG:3857",
    })

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
    console.error(`Failed to create OL feature for ${feature.name}:`, error)
    return null
  }
}

export function FeatureMap({
  features,
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
        const originalFeature = features.find((f) => f.id === props.id)
        if (originalFeature) {
          onFeatureSelect(originalFeature)
        }
      }
    })

    return () => {
      if (map.current) {
        map.current.setTarget(undefined)
        map.current = null
      }
    }
  }, [features, onFeatureSelect])

  // Update features and visibility
  useEffect(() => {
    if (!vectorSource.current) return

    vectorSource.current.clear()

    const visibleFeatures = features.filter(
      (feature) =>
        !feature.parentId && // Only show parent features on map
        visibleLayers.has(feature.id)
    )

    console.log("[FeatureMap] Rendering:", {
      totalFeatures: features.length,
      visibleLayers: Array.from(visibleLayers),
      visibleFeatures: visibleFeatures.map((f) => ({
        id: f.id,
        name: f.name,
        hasGeometry: !!getGeometryFromFeature(f),
      })),
    })

    for (const feature of visibleFeatures) {
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
    if (visibleFeatures.length > 0 && map.current) {
      const extent = vectorSource.current.getExtent()
      if (extent && extent[0] !== Infinity) {
        map.current.getView().fit(extent, { padding: [50, 50, 50, 50] })
      }
    }
  }, [features, visibleLayers])

  return (
    <div
      ref={mapContainer}
      className="h-full w-full bg-gray-100"
      style={{ minHeight: "400px" }}
    />
  )
}
