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
    let geojsonData: any
    const content = fileBuffer.toString("utf-8").trim()

    // Smart detection: if it looks like JSON, try parsing it as JSON first
    // even if the extension says KML (common user error)
    if (content.startsWith("{") || fileType === "geojson" || fileType === "json") {
      try {
        geojsonData = JSON.parse(content)
      } catch (jsonErr) {
        // If extension was geojson/json, we should rethrow
        if (fileType === "geojson" || fileType === "json") throw jsonErr
        // Otherwise, fall through to KML/GPX parsing
      }
    }

    if (!geojsonData) {
      if (fileType === "kml" || fileType === "kmz") {
        const kmlContent =
          fileType === "kmz"
            ? await extractKmlFromKmz(fileBuffer)
            : content
  
        const parser = new DOMParser()
        const doc = parser.parseFromString(kmlContent, "text/xml")
        geojsonData = kml(doc)
      } else if (fileType === "gpx") {
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, "text/xml")
        geojsonData = gpx(doc)
      } else {
        throw new Error(`Unsupported format: .${fileType}`)
      }
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

function extractFeatures(geojson: any): any[] {
  if (!geojson) return []

  // Case 1: Standard FeatureCollection
  if (geojson.type === "FeatureCollection") {
    return (geojson.features || []).map(convertFeature).filter(Boolean)
  }

  // Case 2: Single Feature
  if (geojson.type === "Feature") {
    return [convertFeature(geojson)].filter(Boolean)
  }

  // Case 3: Array of features (non-standard but common)
  if (Array.isArray(geojson)) {
    return geojson.map(item => {
        if (item.type === "Feature") return convertFeature(item);
        if (item.type) return convertFeature({ type: "Feature", geometry: item, properties: {} } as any);
        return null;
    }).filter(Boolean)
  }

  // Case 4: GeometryCollection
  if (geojson.type === "GeometryCollection" && Array.isArray(geojson.geometries)) {
    return geojson.geometries.map((geom: any) => 
      convertFeature({ type: "Feature", geometry: geom, properties: {} } as any)
    ).filter(Boolean)
  }

  // Case 5: Direct Geometries (Point, Polygon, etc.)
  if (geojson.type && [
    "Point", "LineString", "Polygon", 
    "MultiPoint", "MultiLineString", "MultiPolygon"
  ].includes(geojson.type)) {
    return [convertFeature({ type: "Feature", geometry: geojson, properties: {} } as any)]
  }

  // Case 6: Fallback for objects that might have features property
  if (geojson.features && Array.isArray(geojson.features)) {
    return geojson.features.map(convertFeature).filter(Boolean)
  }

  return []
}

function convertFeature(feature: any): any {
  if (!feature) return null;
  
  const props = feature.properties || {}
  const geometry = feature.geometry || (feature.type !== "Feature" ? feature : null);
  
  if (!geometry || !geometry.type) return null;

  return {
    type: "Feature",
    name: props.name || props.Name || props.label || feature.id || "Unnamed Feature",
    properties: props,
    geometry: geometry,
  }
}
