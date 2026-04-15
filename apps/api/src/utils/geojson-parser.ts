export async function parseGeoJSON(fileBuffer: Buffer): Promise<any[]> {
  try {
    const geojsonString = fileBuffer.toString("utf-8")
    const geojson = JSON.parse(geojsonString)

    const features: any[] = []

    // Handle FeatureCollection
    if (geojson.type === "FeatureCollection" && geojson.features) {
      for (const feature of geojson.features) {
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
      features.push({
        type: "Feature",
        name: geojson.properties?.name || geojson.id || "Unnamed",
        properties: geojson.properties || {},
        geometry: geojson.geometry,
      })
    }
    // Handle single Geometry
    else if (
      geojson.type === "Point" ||
      geojson.type === "LineString" ||
      geojson.type === "Polygon" ||
      geojson.type === "MultiPoint" ||
      geojson.type === "MultiLineString" ||
      geojson.type === "MultiPolygon" ||
      geojson.type === "GeometryCollection"
    ) {
      features.push({
        type: "Feature",
        name: "Unnamed",
        properties: {},
        geometry: geojson,
      })
    }

    return features
  } catch (error) {
    console.error("Error parsing GeoJSON:", error)
    throw new Error("Failed to parse GeoJSON file")
  }
}
