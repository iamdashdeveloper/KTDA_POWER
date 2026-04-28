import React, { useEffect, useRef } from "react"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector"
import Feature from "ol/Feature"
import Point from "ol/geom/Point"
import { Style, Text, Fill, Stroke, Circle } from "ol/style"
import { fromLonLat, toLonLat } from "ol/proj"
import Map from "ol/Map"
import { lineString, along, length } from "@turf/turf"

interface GenerateChainnageLogicProps {
  map: Map | null
  activeTool: string | null
  onGenerateComplete?: () => void
}

export const GenerateChainnageLogic: React.FC<GenerateChainnageLogicProps> = ({
  map,
  activeTool,
  onGenerateComplete,
}) => {
  const chainageSourceRef = useRef(new VectorSource())
  const chainageLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const selectedFeatureRef = useRef<any>(null)

  // Initialize chainage layer
  useEffect(() => {
    if (!map || chainageLayerRef.current) {
      console.log(
        "[GenerateChainnageLogic] Initialization skipped - map available:",
        !!map,
        "layer already created:",
        !!chainageLayerRef.current
      )
      return
    }

    console.log("[GenerateChainnageLogic] ✓ Initializing chainage layer...")

    const layer = new VectorLayer({
      source: chainageSourceRef.current,
      zIndex: 50,
      style: (feature) => {
        const label = feature.get("label") || ""
        return new Style({
          image: new Circle({
            radius: 4,
            fill: new Fill({ color: "#ef4444" }),
            stroke: new Stroke({ color: "#ffffff", width: 1.5 }),
          }),
          text: new Text({
            text: label,
            font: "bold 10px Inter, Arial, sans-serif",
            fill: new Fill({ color: "#ffffff" }),
            stroke: new Stroke({ color: "#000000", width: 3 }),
            offsetY: -12,
          }),
        })
      },
    })

    map.addLayer(layer)
    chainageLayerRef.current = layer
    console.log(
      "[GenerateChainnageLogic] ✓ Chainage layer created and added to map"
    )
  }, [map])

  // Handle feature selection when tool is active
  useEffect(() => {
    if (activeTool !== "generate-chainage" || !map) return

    const handleMapClick = (e: any) => {
      let lineFeature: any = null

      // Find first line feature at pixel
      map.forEachFeatureAtPixel(e.pixel, (feature: any) => {
        const geom = feature.getGeometry()
        if (
          geom &&
          (geom.getType() === "LineString" ||
            geom.getType() === "MultiLineString")
        ) {
          lineFeature = feature
          return true
        }
      })

      if (lineFeature) {
        selectedFeatureRef.current = lineFeature
      }
    }

    map.on("click", handleMapClick)

    return () => {
      map.un("click", handleMapClick)
    }
  }, [activeTool, map])

  // Generate chainage markers using turf.js
  const generateChainnageMarkers = (
    interval: number,
    startValue: number,
    featureId?: string
  ) => {
    console.log(`[GenerateChainnageLogic] generateChainnageMarkers called:`, {
      interval,
      startValue,
      featureId,
    })

    if (!featureId) {
      // Try to use the currently selected feature
      if (!selectedFeatureRef.current || !chainageSourceRef.current) {
        console.error(
          "[GenerateChainnageLogic] ERROR: No feature selected and no featureId provided"
        )
        return
      }
      console.log(
        "[GenerateChainnageLogic] ✓ Using previously selected feature"
      )
    } else {
      // Find feature by ID from all layers in the map
      if (map) {
        let foundFeature = null
        const layers = map.getLayers().getArray()

        console.log(
          `[GenerateChainnageLogic] Searching for feature ID: ${featureId} in ${layers.length} layers`
        )

        // Search through all layers for a vector source with the feature
        for (const layer of layers) {
          const source = (layer as any).getSource?.()
          if (source && source instanceof VectorSource) {
            const features = source.getFeatures()
            console.log(
              `[GenerateChainnageLogic] Checking layer with ${features.length} features`
            )

            // Check both direct ID and properties.id
            foundFeature = features.find((f: any) => {
              const directId = f.getId?.() || f.get("id")
              const propId = f.get("id")
              const match = directId === featureId || propId === featureId
              if (match) {
                console.log(
                  `[GenerateChainnageLogic] ✓ Found feature! directId=${directId}, propId=${propId}`
                )
              }
              return match
            })

            if (foundFeature) {
              console.log(`[GenerateChainnageLogic] ✓ Feature found in layer!`)
              break
            }
          }
        }

        if (foundFeature) {
          selectedFeatureRef.current = foundFeature
          console.log("[GenerateChainnageLogic] ✓ Feature set as selected")
        } else {
          console.error(
            `[GenerateChainnageLogic] ERROR: Feature with ID ${featureId} not found in any of ${layers.length} layers`
          )
          return
        }
      }
    }

    if (!selectedFeatureRef.current || !chainageSourceRef.current) {
      console.error(
        "[GenerateChainnageLogic] ERROR: No feature available or chainage source not initialized"
      )
      return
    }

    try {
      const feature = selectedFeatureRef.current
      const geometry = feature.getGeometry() as any

      if (!geometry) {
        console.error(
          "[GenerateChainnageLogic] ERROR: Selected feature has no geometry"
        )
        return
      }

      console.log(
        "[GenerateChainnageLogic] ✓ Feature geometry found, type:",
        geometry.getType()
      )

      chainageSourceRef.current.clear(true)
      console.log("[GenerateChainnageLogic] ✓ Cleared previous markers")

      let coordinates: [number, number][] = []
      const geomType = geometry.getType()

      if (geomType === "LineString") {
        coordinates = geometry.getCoordinates()
      } else if (geomType === "MultiLineString") {
        const allCoords = geometry.getCoordinates()
        coordinates = allCoords.flat(1)
      }

      if (coordinates.length < 2) {
        console.error(
          `[GenerateChainnageLogic] ERROR: Invalid geometry - needs at least 2 coordinates, got ${coordinates.length}`
        )
        return
      }

      console.log(
        `[GenerateChainnageLogic] ✓ Extracted ${coordinates.length} coordinates from ${geomType}`
      )

      // Convert coordinates from Web Mercator (EPSG:3857) to WGS84 (lon/lat) for turf.js
      const lonLatCoordinates = coordinates.map((coord) => toLonLat(coord)) as [
        number,
        number,
      ][]

      console.log(
        `[GenerateChainnageLogic] ✓ Converted coordinates to lon/lat (first: [${lonLatCoordinates[0][0].toFixed(2)}, ${lonLatCoordinates[0][1].toFixed(2)}])`
      )

      // Create a GeoJSON line from coordinates
      const line = lineString(lonLatCoordinates)

      // Calculate total length in kilometers using turf.js
      const totalLengthKm = length(line, { units: "kilometers" })
      const totalLengthMeters = totalLengthKm * 1000

      console.log(
        `[GenerateChainnageLogic] ✓ Line length calculated: ${totalLengthMeters.toFixed(2)}m (${totalLengthKm.toFixed(2)}km)`
      )

      // Generate markers at specified intervals
      const maxMarkers = 500
      const step = Math.max(interval, totalLengthMeters / maxMarkers)

      console.log(
        `[GenerateChainnageLogic] Starting marker generation: interval=${interval}m, step=${step.toFixed(2)}m, startValue=${startValue}m`
      )

      let markersCreated = 0
      const failedMarkers: string[] = []

      for (
        let distanceM = 0;
        distanceM <= totalLengthMeters && markersCreated < maxMarkers;
        distanceM += step
      ) {
        try {
          const distanceKm = distanceM / 1000

          // Use turf.js to get point at distance along line
          const point = along(line, distanceKm, { units: "kilometers" })

          if (!point || !point.geometry || !point.geometry.coordinates) {
            failedMarkers.push(`${distanceKm}km`)
            continue
          }

          const [lon, lat] = point.geometry.coordinates as [number, number]
          const totalMeters = Math.round(startValue + distanceM)
          const km = Math.floor(totalMeters / 1000)
          const m = totalMeters % 1000

          const markerFeature = new Feature({
            geometry: new Point(fromLonLat([lon, lat])),
            label: `${km}+${m.toString().padStart(3, "0")}`,
            chainage: totalMeters,
          })

          chainageSourceRef.current.addFeature(markerFeature)
          markersCreated++
        } catch (err) {
          failedMarkers.push(`${distanceM}m`)
        }
      }

      console.log(
        `[GenerateChainnageLogic] ✓ Generated ${markersCreated} markers (max=${maxMarkers}, failed=${failedMarkers.length})`
      )

      if (failedMarkers.length > 0) {
        console.warn(
          `[GenerateChainnageLogic] ⚠ Failed to generate markers at distances:`,
          failedMarkers.slice(0, 5).join(", "),
          failedMarkers.length > 5
            ? `...and ${failedMarkers.length - 5} more`
            : ""
        )
      }

      console.log(
        "[GenerateChainnageLogic] ✓ SUCCESS: Chainage markers generation complete"
      )

      if (onGenerateComplete) {
        onGenerateComplete()
      }
    } catch (error) {
      console.error(
        "[GenerateChainnageLogic] ERROR: Exception during generation:",
        error
      )
    }
  }

  const clearChainnageMarkers = () => {
    if (chainageSourceRef.current) {
      chainageSourceRef.current.clear(true)
    }
    selectedFeatureRef.current = null
  }
  // Export functions and state via map object
  useEffect(() => {
    if (map) {
      ;(map as any).__generateChainnageMarkers = generateChainnageMarkers
      ;(map as any).__clearChainnageMarkers = clearChainnageMarkers
      ;(map as any).__selectedLineFeature = selectedFeatureRef.current
      console.log(
        "[GenerateChainnageLogic] ✓ Functions exported to map object for external access"
      )
    }
  }, [map])

  return null
}
