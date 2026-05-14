import React, { useEffect, useRef } from "react"
import Map from "ol/Map"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import GeoJSON from "ol/format/GeoJSON"
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style"
import { useGeoprocessingStore } from "@/store/useGeoprocessingStore"

interface AnalysisLogicProps {
  map: Map
}

const geoJsonFormat = new GeoJSON()

export const AnalysisLogic: React.FC<AnalysisLogicProps> = ({ map }) => {
  const { analysisLayers, selectedLayerId } = useGeoprocessingStore()
  const layersRef = useRef<Record<string, VectorLayer<VectorSource>>>({})

  useEffect(() => {
    if (!map) return

    // 1. Identify which layers need to be added, removed, or updated
    const currentLayerIds = new Set(analysisLayers.map((l) => l.id))

    // Remove layers that are no longer in the store
    Object.keys(layersRef.current).forEach((id) => {
      if (!currentLayerIds.has(id)) {
        map.removeLayer(layersRef.current[id])
        delete layersRef.current[id]
      }
    })

    // Add or Update layers
    analysisLayers.forEach((layer) => {
      let vectorLayer = layersRef.current[layer.id]
      const isSelected = layer.id === selectedLayerId

      if (!vectorLayer) {
        // Create new layer
        const source = new VectorSource({
          features: geoJsonFormat.readFeatures(
            {
              type: "Feature",
              geometry: layer.geometry,
              properties: { id: layer.id, name: layer.name },
            },
            {
              featureProjection: "EPSG:3857",
            }
          ),
        })

        vectorLayer = new VectorLayer({
          source,
          zIndex: 50, // Analysis results should be on top
        })

        map.addLayer(vectorLayer)
        layersRef.current[layer.id] = vectorLayer
      }

      // Update style based on selection
      vectorLayer.setStyle(
        new Style({
          fill: new Fill({
            color: isSelected ? "#facc1555" : layer.color + "33", // Highlight with yellow if selected
          }),
          stroke: new Stroke({
            color: isSelected ? "#facc15" : layer.color,
            width: isSelected ? 4 : 2,
            lineDash: isSelected ? undefined : [4, 4],
          }),
          image: new CircleStyle({
            radius: isSelected ? 8 : 6,
            fill: new Fill({ color: isSelected ? "#facc15" : layer.color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        })
      )

      // Sync visibility
      vectorLayer.setVisible(layer.visible)
    })
  }, [analysisLayers, selectedLayerId, map])


  return null
}
