import React, { useEffect, useRef } from "react"
import Map from "ol/Map"
import { Draw, Select, Modify } from "ol/interaction"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector"
import Feature from "ol/Feature"
import { Style, Fill, Stroke, Circle } from "ol/style"

interface DrawingLogicProps {
  map: Map | null
  activeTool: string | null
  onDrawingComplete?: (features: Feature[]) => void
}

export const DrawingLogic: React.FC<DrawingLogicProps> = ({
  map,
  activeTool,
  onDrawingComplete,
}) => {
  const drawSourceRef = useRef(new VectorSource())
  const drawLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const drawInteractionRef = useRef<Draw | null>(null)
  const modifyInteractionRef = useRef<Modify | null>(null)
  const selectInteractionRef = useRef<Select | null>(null)
  const drawnFeaturesRef = useRef<Record<string, Feature>>({})

  // Initialize drawing layer
  useEffect(() => {
    if (!map || drawLayerRef.current) return

    const layer = new VectorLayer({
      source: drawSourceRef.current,
      zIndex: 100,
      style: (feature) => {
        const isSelected = feature.get("selected")

        return new Style({
          fill: new Fill({
            color: isSelected
              ? "rgba(0, 150, 255, 0.3)"
              : "rgba(255, 100, 50, 0.3)",
          }),
          stroke: new Stroke({
            color: isSelected ? "#0096ff" : "#ff6432",
            width: isSelected ? 3 : 2,
          }),
          image: new Circle({
            radius: 5,
            fill: new Fill({
              color: isSelected ? "#0096ff" : "#ff6432",
            }),
            stroke: new Stroke({
              color: "#ffffff",
              width: 2,
            }),
          }),
        })
      },
    })

    map.addLayer(layer)
    drawLayerRef.current = layer

    // Export functions via map object
    ;(map as any).__getDrawnFeatures = () => {
      return Object.values(drawnFeaturesRef.current)
    }
    ;(map as any).__clearDrawnFeatures = () => {
      drawSourceRef.current.clear(true)
      drawnFeaturesRef.current = {}
    }
    ;(map as any).__deleteDrawnFeature = (featureId: string) => {
      const feature = drawnFeaturesRef.current[featureId]
      if (feature) {
        drawSourceRef.current.removeFeature(feature)
        delete drawnFeaturesRef.current[featureId]
      }
    }
  }, [map])

  // Handle drawing tool activation
  useEffect(() => {
    if (!map || !drawLayerRef.current) return

    const isDrawing = activeTool?.startsWith("draw-")
    const drawType = isDrawing ? activeTool?.replace("draw-", "") : null

    if (isDrawing && drawType) {
      // Remove existing draw interaction
      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current)
      }

      // Create new draw interaction
      const draw = new Draw({
        source: drawSourceRef.current,
        type: (drawType === "LineString"
          ? "LineString"
          : drawType === "Polygon"
            ? "Polygon"
            : "Point") as "Point" | "LineString" | "Polygon",
        style: new Style({
          fill: new Fill({
            color: "rgba(255, 100, 50, 0.3)",
          }),
          stroke: new Stroke({
            color: "#ff6432",
            width: 2,
            lineDash: [5, 5],
          }),
          image: new Circle({
            radius: 5,
            fill: new Fill({
              color: "#ff6432",
            }),
          }),
        }),
      })

      // Handle feature completion
      draw.on("drawend", (event) => {
        const feature = event.feature
        const id = `drawn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        feature.setId(id)
        feature.set("editable", true)
        feature.set("source", "drawn")
        drawnFeaturesRef.current[id] = feature

        if (onDrawingComplete) {
          onDrawingComplete([feature])
        }
      })

      map.addInteraction(draw)
      drawInteractionRef.current = draw

      // Add modify interaction for editing
      if (modifyInteractionRef.current) {
        map.removeInteraction(modifyInteractionRef.current)
      }

      const modify = new Modify({
        source: drawSourceRef.current,
      })
      map.addInteraction(modify)
      modifyInteractionRef.current = modify

      // Add select interaction for highlighting
      if (selectInteractionRef.current) {
        map.removeInteraction(selectInteractionRef.current)
      }

      const select = new Select({
        layers: [drawLayerRef.current],
        style: () => {
          return new Style({
            fill: new Fill({
              color: "rgba(0, 150, 255, 0.3)",
            }),
            stroke: new Stroke({
              color: "#0096ff",
              width: 3,
            }),
            image: new Circle({
              radius: 6,
              fill: new Fill({
                color: "#0096ff",
              }),
              stroke: new Stroke({
                color: "#ffffff",
                width: 2,
              }),
            }),
          })
        },
      })
      map.addInteraction(select)
      selectInteractionRef.current = select
    } else {
      // Remove interactions when not drawing
      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current)
        drawInteractionRef.current = null
      }
      if (modifyInteractionRef.current) {
        map.removeInteraction(modifyInteractionRef.current)
        modifyInteractionRef.current = null
      }
      if (selectInteractionRef.current) {
        map.removeInteraction(selectInteractionRef.current)
        selectInteractionRef.current = null
      }
    }
  }, [activeTool, map])

  return null
}
