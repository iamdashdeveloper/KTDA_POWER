import { parseStringPromise } from "xml2js"

export async function parseKML(fileBuffer: Buffer): Promise<any[]> {
  try {
    const kmlString = fileBuffer.toString("utf-8")
    console.log("[KML Parser] Input size:", kmlString.length, "bytes")
    console.log("[KML Parser] First 300 chars:", kmlString.substring(0, 300))

    let result
    try {
      result = await parseStringPromise(kmlString)
    } catch (xmlErr) {
      console.error("[KML Parser] ✗ XML parse error:", xmlErr)
      throw new Error("Invalid KML XML")
    }

    console.log("[KML Parser] ✓ XML parsed")
    console.log("[KML Parser] Root keys:", Object.keys(result))

    const features: any[] = []
    const kml = result.kml

    if (!kml) {
      console.error("[KML Parser] ✗ No KML root element")
      return features
    }

    console.log("[KML Parser] KML structure keys:", Object.keys(kml[0] || {}))

    // Extract placemarks from KML
    // KML structure: kml -> Document -> Placemark
    let allPlacemarks: any[] = []

    if (Array.isArray(kml) && kml[0]) {
      const kmlRoot = kml[0]

      console.log("[KML Parser] KML root keys:", Object.keys(kmlRoot))

      // Check for Document array
      if (kmlRoot.Document && Array.isArray(kmlRoot.Document)) {
        console.log(
          "[KML Parser] Found",
          kmlRoot.Document.length,
          "Document(s)"
        )

        for (const doc of kmlRoot.Document) {
          console.log("[KML Parser] Document keys:", Object.keys(doc))
          console.log(
            "[KML Parser] Looking for Placemark, Folder, Style, Schema..."
          )

          // Log what's actually in the document
          if (!doc.Placemark && !doc.Folder) {
            console.log(
              "[KML Parser] WARNING: Document has no Placemark or Folder entries"
            )
            // Log the actual content of the doc
            const docStr = JSON.stringify(doc).substring(0, 500)
            console.log(
              "[KML Parser] Document content (first 500 chars):",
              docStr
            )
          }

          if (doc.Placemark && Array.isArray(doc.Placemark)) {
            console.log(
              "[KML Parser] → Found",
              doc.Placemark.length,
              "Placemarks in this Document"
            )
            allPlacemarks = allPlacemarks.concat(doc.Placemark)
          }

          // Also check for nested Folders (KML can have Folders with Placemarks)
          if (doc.Folder && Array.isArray(doc.Folder)) {
            for (const folder of doc.Folder) {
              if (folder.Placemark && Array.isArray(folder.Placemark)) {
                console.log(
                  "[KML Parser] → Found",
                  folder.Placemark.length,
                  "Placemarks in Folder"
                )
                allPlacemarks = allPlacemarks.concat(folder.Placemark)
              }
            }
          }
        }
      }

      // Also check for Placemarks at root level
      if (kmlRoot.Placemark && Array.isArray(kmlRoot.Placemark)) {
        console.log(
          "[KML Parser] Found",
          kmlRoot.Placemark.length,
          "root Placemarks"
        )
        allPlacemarks = allPlacemarks.concat(kmlRoot.Placemark)
      }
    }

    console.log("[KML Parser] Total Placemarks found:", allPlacemarks.length)

    // Process all placemarks
    for (const placemark of allPlacemarks) {
      const name = placemark.name?.[0] || "Unnamed"
      const description = placemark.description?.[0] || ""
      console.log("[KML Parser] Processing placemark:", name)

      // Parse coordinates
      let geometry = null

      // Handle Point
      if (placemark.Point && Array.isArray(placemark.Point)) {
        const point = placemark.Point[0]
        const coords = point.coordinates?.[0]?.split(",")
        if (coords && coords.length >= 2) {
          geometry = {
            type: "Point",
            coordinates: [parseFloat(coords[0]), parseFloat(coords[1])],
          }
          console.log("[KML Parser] ✓ Created Point geometry")
        }
      }

      // Handle LineString
      if (placemark.LineString && Array.isArray(placemark.LineString)) {
        const line = placemark.LineString[0]
        const coordString = line.coordinates?.[0]
        if (coordString) {
          const coords = coordString
            .split("\n")
            .map((c: string) => {
              const parts = c.trim().split(",")
              if (parts.length >= 2) {
                return [parseFloat(parts[0]), parseFloat(parts[1])]
              }
              return null
            })
            .filter((c: any) => c !== null)

          if (coords.length > 0) {
            geometry = {
              type: "LineString",
              coordinates: coords,
            }
            console.log(
              "[KML Parser] ✓ Created LineString with",
              coords.length,
              "points"
            )
          }
        }
      }

      // Handle Polygon
      if (placemark.Polygon && Array.isArray(placemark.Polygon)) {
        const polygon = placemark.Polygon[0]
        const outerBoundary = polygon.outerBoundaryIs?.[0]?.LinearRing?.[0]
        const coordString = outerBoundary?.coordinates?.[0]

        if (coordString) {
          const coords = coordString
            .split("\n")
            .map((c: string) => {
              const parts = c.trim().split(",")
              if (parts.length >= 2) {
                return [parseFloat(parts[0]), parseFloat(parts[1])]
              }
              return null
            })
            .filter((c: any) => c !== null)

          if (coords.length > 0) {
            geometry = {
              type: "Polygon",
              coordinates: [coords],
            }
            console.log(
              "[KML Parser] ✓ Created Polygon with",
              coords.length,
              "vertices"
            )
          }
        }
      }

      // Only add if geometry was created
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
        console.log("[KML Parser] → Added feature:", name)
      } else {
        console.warn("[KML Parser] ⚠ Placemark had no valid geometry:", name)
      }
    }

    console.log(`[KML Parser] ✓ Returning ${features.length} features`)
    return features
  } catch (error) {
    console.error("[KML Parser] ✗ Critical error:", error)
    throw new Error(
      `KML parse failed: ${error instanceof Error ? error.message : "unknown"}`
    )
  }
}
