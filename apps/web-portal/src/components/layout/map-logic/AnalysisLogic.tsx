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
  const { analysisLayers } = useGeoprocessingStore()
  const layersRef = useRef<Record<string, VectorLayer<VectorSource>>>({})

  useEffect(() => {
    if (!map) return

    // 1. Identify which layers need to be added, removed, or updated
    const currentLayerIds = new Set(analysisLayers.map(l => l.id))
    
    // Remove layers that are no longer in the store
    Object.keys(layersRef.current).forEach(id => {
      if (!currentLayerIds.has(id)) {
        map.removeLayer(layersRef.current[id])
        delete layersRef.current[id]
      }
    })

    // Add or Update layers
    analysisLayers.forEach(layer => {
      let vectorLayer = layersRef.current[layer.id]

      if (!vectorLayer) {
        // Create new layer
        const source = new VectorSource({
          features: geoJsonFormat.readFeatures(
            {
              type: "Feature",
              geometry: layer.geometry,
              properties: { id: layer.id, name: layer.name }
            },
            {
              featureProjection: "EPSG:3857"
            }
          )
        })

        vectorLayer = new VectorLayer({
          source,
          zIndex: 50, // Analysis results should be on top
          style: new Style({
            fill: new Fill({
              color: layer.color + "33", // 20% opacity
            }),
            stroke: new Stroke({
              color: layer.color,
              width: 2,
              lineDash: [4, 4] // Dashed lines for analysis results
            }),
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: layer.color }),
              stroke: new Stroke({ color: "#ffffff", width: 2 })
            })
          })
        })

        map.addLayer(vectorLayer)
        layersRef.current[layer.id] = vectorLayer
      }

      // Sync visibility
      vectorLayer.setVisible(layer.visible)
    })

  }, [analysisLayers, map])

  return null
}
