export async function parseGeoJSON(fileBuffer: Buffer): Promise<any[]> {
  try {
    const geojsonString = fileBuffer.toString("utf-8").trim()
    console.log("[GeoJSON Parser] Buffer length:", fileBuffer.length)
    console.log("[GeoJSON Parser] String length:", geojsonString.length)
    console.log(
      "[GeoJSON Parser] First 300 chars:",
      geojsonString.substring(0, 300)
    )

    // Validate not empty
    if (!geojsonString) {
      console.error("[GeoJSON Parser] ✗ Empty file")
      return []
    }

    let geojson
    try {
      geojson = JSON.parse(geojsonString)
    } catch (jsonErr) {
      console.error("[GeoJSON Parser] ✗ Invalid JSON:", jsonErr)
      throw new Error("Invalid JSON format")
    }

    console.log("[GeoJSON Parser] ✓ JSON parsed, type:", geojson?.type)

    if (!geojson || typeof geojson !== "object") {
      console.error("[GeoJSON Parser] ✗ Not a valid object")
      return []
    }

    const features: any[] = []

    // Handle FeatureCollection
    if (geojson.type === "FeatureCollection") {
      console.log("[GeoJSON Parser] → FeatureCollection detected")
      if (!Array.isArray(geojson.features)) {
        console.error(
          "[GeoJSON Parser] ✗ FeatureCollection has no features array"
        )
        return []
      }
      console.log(
        "[GeoJSON Parser] ✓ Found",
        geojson.features.length,
        "features"
      )

      for (const feature of geojson.features) {
        if (!feature || typeof feature !== "object") {
          console.warn("[GeoJSON Parser] ⚠ Skipping invalid feature")
          continue
        }
        console.log(
          "[GeoJSON Parser] → Feature:",
          feature.properties?.name || feature.id || "unnamed"
        )
        features.push({
          type: "Feature",
          name: feature.properties?.name || feature.id || "Unnamed",
          properties: feature.properties || {},
          geometry: feature.geometry,
        })
      }
    }
    // Handle single Feature
    else if (geojson.type === "Feature") {
      console.log("[GeoJSON Parser] → Single Feature detected")
      features.push({
        type: "Feature",
        name: geojson.properties?.name || geojson.id || "Unnamed",
        properties: geojson.properties || {},
        geometry: geojson.geometry,
      })
    }
    // Handle raw Geometry
    else if (
      geojson.type === "Point" ||
      geojson.type === "LineString" ||
      geojson.type === "Polygon" ||
      geojson.type === "MultiPoint" ||
      geojson.type === "MultiLineString" ||
      geojson.type === "MultiPolygon" ||
      geojson.type === "GeometryCollection"
    ) {
      console.log("[GeoJSON Parser] → Geometry detected:", geojson.type)
      features.push({
        type: "Feature",
        name: "Unnamed",
        properties: {},
        geometry: geojson,
      })
    } else {
      console.error("[GeoJSON Parser] ✗ Unrecognized type:", geojson.type)
    }

    console.log(`[GeoJSON Parser] ✓ Returning ${features.length} features`)
    return features
  } catch (error) {
    console.error("[GeoJSON Parser] ✗ Critical error:", error)
    throw new Error(
      `GeoJSON parse failed: ${error instanceof Error ? error.message : "unknown"}`
    )
  }
}
