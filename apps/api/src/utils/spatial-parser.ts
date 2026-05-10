import { kml, gpx } from "@tmcw/togeojson" // Direct imports

import JSZip from "jszip"
import { DOMParser } from "xmldom"
import type { FeatureCollection, Feature, GeoJSON } from "geojson" // Use official types

/**
 * Unified spatial file parser
 */
export async function parseSpatialFile(
  fileBuffer: Buffer,
  filename: string
): Promise<any[]> {
  const fileType = filename.toLowerCase().split(".").pop()

  try {
    let geojsonData: GeoJSON

    if (fileType === "geojson" || fileType === "json") {
      geojsonData = JSON.parse(fileBuffer.toString("utf-8"))
    } else if (fileType === "kml" || fileType === "kmz") {
      const kmlContent =
        fileType === "kmz"
          ? await extractKmlFromKmz(fileBuffer)
          : fileBuffer.toString("utf-8")

      const parser = new DOMParser()
      const doc = parser.parseFromString(kmlContent, "text/xml")
      geojsonData = kml(doc) as any
    } else if (fileType === "gpx") {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        fileBuffer.toString("utf-8"),
        "text/xml"
      )
      geojsonData = gpx(doc) as any
    } else {
      throw new Error(`Unsupported format: .${fileType}`)
    }

    return extractFeatures(geojsonData)
  } catch (error) {
    console.error("[Spatial Parser] ✗ Error:", error)
    throw error
  }
}

async function extractKmlFromKmz(buffer: Buffer): Promise<string> {
  const zip = new JSZip()
  await zip.loadAsync(buffer)
  const kmlFile = Object.values(zip.files).find((f: any) =>
    f.name.toLowerCase().endsWith(".kml")
  ) as any
  if (!kmlFile) throw new Error("No KML found in KMZ")
  return kmlFile.async("text")
}

function extractFeatures(geojson: GeoJSON): any[] {
  if (geojson.type === "FeatureCollection") {
    return geojson.features.map(convertFeature)
  } else if (geojson.type === "Feature") {
    return [convertFeature(geojson)]
  }
  // Handle raw geometries
  return [
    {
      type: "Feature",
      name: "Feature",
      properties: {},
      geometry: geojson,
    },
  ]
}

function convertFeature(feature: Feature): any {
  const props = feature.properties || {}
  return {
    type: "Feature",
    name: props.name || props.Name || (feature as any).id || "Unnamed Feature",
    properties: props,
    geometry: feature.geometry,
  }
}
