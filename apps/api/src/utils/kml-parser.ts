import { parseStringPromise } from "xml2js"

export async function parseKML(fileBuffer: Buffer): Promise<any[]> {
  try {
    const kmlString = fileBuffer.toString("utf-8")
    const result = await parseStringPromise(kmlString)

    const features: any[] = []
    const kml = result.kml

    if (!kml) {
      return features
    }

    // Extract placemarks from KML
    const documents = kml.Document || []
    for (const doc of documents) {
      const placemarks = doc.Placemark || []

      for (const placemark of placemarks) {
        const name = placemark.name?.[0] || "Unnamed"
        const description = placemark.description?.[0] || ""

        // Parse coordinates
        let geometry = null

        // Handle Point
        if (placemark.Point) {
          const coords = placemark.Point[0].coordinates?.[0]?.split(",")
          if (coords && coords.length >= 2) {
            geometry = {
              type: "Point",
              coordinates: [parseFloat(coords[0]), parseFloat(coords[1])],
            }
          }
        }

        // Handle LineString
        if (placemark.LineString) {
          const coordString = placemark.LineString[0].coordinates?.[0]
          if (coordString) {
            const coords = coordString.split("\n").map((c: string) => {
              const [lon, lat] = c.trim().split(",")
              return [parseFloat(lon), parseFloat(lat)]
            })
            geometry = {
              type: "LineString",
              coordinates: coords,
            }
          }
        }

        // Handle Polygon
        if (placemark.Polygon) {
          const polygon = placemark.Polygon[0]
          const outerBoundary = polygon.outerBoundaryIs?.[0].LinearRing?.[0]
          const coordString = outerBoundary?.coordinates?.[0]

          if (coordString) {
            const coords = coordString.split("\n").map((c: string) => {
              const [lon, lat] = c.trim().split(",")
              return [parseFloat(lon), parseFloat(lat)]
            })
            geometry = {
              type: "Polygon",
              coordinates: [coords],
            }
          }
        }

        if (geometry) {
          features.push({
            type: "Feature",
            name,
            properties: {
              name,
              description,
            },
            geometry,
          })
        }
      }
    }

    return features
  } catch (error) {
    console.error("Error parsing KML:", error)
    throw new Error("Failed to parse KML file")
  }
}
