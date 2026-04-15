#!/usr/bin/env node

import fs from "fs"
import { parseSpatialFile } from "./apps/api/src/utils/spatial-parser.ts"

async function test() {
  try {
    // Test GeoJSON
    console.log("\n=== Testing GeoJSON ===")
    const geoJsonBuffer = fs.readFileSync("./sample-features.geojson")
    const geoJsonFeatures = await parseSpatialFile(
      geoJsonBuffer,
      "sample-features.geojson"
    )
    console.log(`✓ GeoJSON: ${geoJsonFeatures.length} features parsed`)
    geoJsonFeatures.forEach((f, i) => {
      console.log(
        `  ${i + 1}. ${f.name} - ${f.geometry?.type || "no geometry"}`
      )
    })

    // Test KML if available
    if (fs.existsSync("./tea_factories.kml")) {
      console.log("\n=== Testing KML ===")
      const kmlBuffer = fs.readFileSync("./tea_factories.kml")
      const kmlFeatures = await parseSpatialFile(kmlBuffer, "tea_factories.kml")
      console.log(`✓ KML: ${kmlFeatures.length} features parsed`)
      kmlFeatures.slice(0, 5).forEach((f, i) => {
        console.log(
          `  ${i + 1}. ${f.name} - ${f.geometry?.type || "no geometry"}`
        )
      })
    }

    console.log("\n✓ All parsers working!")
  } catch (error) {
    console.error("✗ Error:", error)
    process.exit(1)
  }
}

test()
