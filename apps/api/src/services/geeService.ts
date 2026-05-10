/**
 * Google Earth Engine (GEE) Service
 *
 * Authenticates via a GCP Service Account and exposes helpers
 * for the ESA WorldCover / Copernicus Global Land Cover datasets.
 *
 * Dataset used:
 *   ESA WorldCover 10m v100  →  "ESA/WorldCover/v100"
 *   ESA WorldCover 10m v200  →  "ESA/WorldCover/v200"   (latest, 2021)
 *   Copernicus Global Land Cover (100m) →  "COPERNICUS/Landcover/100m/Proba-V-C3/Global"
 */

import ee from "@google/earthengine"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LandCoverTileParams {
  /** Bounding box [west, south, east, north] in WGS-84 decimal degrees */
  bbox?: [number, number, number, number]
  /** Year of the WorldCover mosaic (2020 or 2021) */
  year?: 2020 | 2021
  /** Visualization opacity 0-1 */
  opacity?: number
}

export interface LandCoverStatsParams {
  /** GeoJSON geometry (Polygon or MultiPolygon) */
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  /** Year of the WorldCover mosaic (2020 or 2021) */
  year?: 2020 | 2021
}

export interface TileUrlResponse {
  tileUrl: string
  mapId: string
  token: string
  attribution: string
  legend: LandCoverClass[]
}

export interface LandCoverClass {
  value: number
  label: string
  color: string
}

// ─────────────────────────────────────────────────────────────────────────────
// ESA WorldCover legend (v100 / v200)
// ─────────────────────────────────────────────────────────────────────────────

export const ESA_WORLDCOVER_LEGEND: LandCoverClass[] = [
  { value: 10, label: "Tree cover", color: "#006400" },
  { value: 20, label: "Shrubland", color: "#FFBB22" },
  { value: 30, label: "Grassland", color: "#FFFF4C" },
  { value: 40, label: "Cropland", color: "#F096FF" },
  { value: 50, label: "Built-up", color: "#FA0000" },
  { value: 60, label: "Bare / sparse vegetation", color: "#B4B4B4" },
  { value: 70, label: "Snow and ice", color: "#F0F0F0" },
  { value: 80, label: "Permanent water bodies", color: "#0064C8" },
  { value: 90, label: "Herbaceous wetland", color: "#0096A0" },
  { value: 95, label: "Mangroves", color: "#00CF75" },
  { value: 100, label: "Moss and lichen", color: "#FAE6A0" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Visualization parameters that mirror the GEE catalogue defaults
// ─────────────────────────────────────────────────────────────────────────────

const VIS_PARAMS = {
  bands: ["Map"],
  min: 0,
  max: 100,
  palette: ESA_WORLDCOVER_LEGEND.map((c) => c.color),
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

let _initialized = false

/**
 * Authenticate with GEE using a service-account private key JSON file.
 * The path is resolved from GEE_SERVICE_ACCOUNT_KEY_FILE env var or a
 * sensible default (<api-root>/secrets/gee-service-account.json).
 */
export async function initializeGEE(): Promise<void> {
  if (_initialized) return

  const keyFilePath =
    process.env.GEE_SERVICE_ACCOUNT_KEY_FILE ??
    path.resolve(__dirname, "../../secrets/gee-service-account.json")

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(
      `GEE service account key file not found at: ${keyFilePath}\n` +
        `Set the GEE_SERVICE_ACCOUNT_KEY_FILE environment variable to the correct path.`
    )
  }

  const keyFileContents = JSON.parse(fs.readFileSync(keyFilePath, "utf-8"))
  const serviceAccountEmail = keyFileContents.client_email

  if (!serviceAccountEmail) {
    throw new Error(
      "Invalid service account key file: missing 'client_email' field."
    )
  }

  await new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      keyFileContents,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            _initialized = true
            console.log(
              `[GEE] Authenticated as: ${serviceAccountEmail}`
            )
            resolve()
          },
          (err: string) => reject(new Error(`[GEE] Initialize failed: ${err}`))
        )
      },
      (err: string) =>
        reject(new Error(`[GEE] Authentication failed: ${err}`))
    )
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the ESA WorldCover image for the requested year.
 * v100 → 2020 mosaic, v200 → 2021 mosaic.
 */
function getWorldCoverImage(year: 2020 | 2021 = 2021): any {
  const collection = year === 2021 ? "ESA/WorldCover/v200" : "ESA/WorldCover/v100"
  // Both collections have a single image; take the first/only element.
  return ee.ImageCollection(collection).first()
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an XYZ tile URL for the ESA WorldCover layer.
 * Returns a tile template URL + legend that can be dropped straight
 * into Leaflet / MapLibre / OpenLayers as a TileLayer.
 */
export async function getWorldCoverTileUrl(
  params: LandCoverTileParams = {}
): Promise<TileUrlResponse> {
  await initializeGEE()

  const { year = 2021 } = params

  const image = getWorldCoverImage(year)

  return new Promise<TileUrlResponse>((resolve, reject) => {
    image.getMap(VIS_PARAMS, ({ mapid, token, error }: any) => {
      if (error) {
        reject(new Error(`[GEE] getMap failed: ${error}`))
        return
      }

      // Build the standard EE tile URL template
      const tileUrl = `https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`

      resolve({
        tileUrl,
        mapId: mapid,
        token,
        attribution:
          "© ESA WorldCover 10m (ESA / vito / Brockmann Consult / CS / GAMMA Remote Sensing / IIASA / WUR) via Google Earth Engine",
        legend: ESA_WORLDCOVER_LEGEND,
      })
    })
  })
}

/**
 * Computes per-class land-cover area statistics (km²) for an arbitrary
 * polygon / multipolygon passed in as GeoJSON.
 */
export async function getWorldCoverStats(
  params: LandCoverStatsParams
): Promise<{ stats: Record<string, number>; legend: LandCoverClass[] }> {
  await initializeGEE()

  const { geometry, year = 2021 } = params

  const image = getWorldCoverImage(year)

  // Convert the incoming GeoJSON geometry to an ee.Geometry
  const eeGeometry = ee.Geometry(geometry)

  return new Promise((resolve, reject) => {
    // Compute the frequency histogram (pixel count per class value)
    image
      .select("Map")
      .reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        geometry: eeGeometry,
        scale: 10, // WorldCover native resolution
        maxPixels: 1e10,
        bestEffort: true,
      })
      .evaluate((result: any, err: string) => {
        if (err) {
          reject(new Error(`[GEE] reduceRegion failed: ${err}`))
          return
        }

        const histogram: Record<string, number> = result?.Map ?? {}

        // Convert pixel counts → km²  (10 m pixel → 100 m² → 0.0001 km²)
        const stats: Record<string, number> = {}
        for (const [rawKey, count] of Object.entries(histogram)) {
          const classValue = parseInt(rawKey, 10)
          const classInfo = ESA_WORLDCOVER_LEGEND.find(
            (c) => c.value === classValue
          )
          const label = classInfo ? classInfo.label : `Class ${classValue}`
          stats[label] = Math.round((count as number) * 100) / 1e6 // m² → km²
        }

        resolve({ stats, legend: ESA_WORLDCOVER_LEGEND })
      })
  })
}

/**
 * Generates an XYZ tile URL for the Copernicus Global Land Cover (100 m).
 * This is an alternative dataset – useful when WorldCover is not granular
 * enough or for multi-year time-series.
 *
 * @param year  Any year available in the collection (2015-2019)
 * @param band  Band to visualize (default: "discrete_classification")
 */
export async function getCopernicusTileUrl(
  year: number = 2019
): Promise<TileUrlResponse> {
  await initializeGEE()

  const collection = ee
    .ImageCollection("COPERNICUS/Landcover/100m/Proba-V-C3/Global")
    .filter(ee.Filter.calendarRange(year, year, "year"))
    .first()

  const visParams = {
    bands: ["discrete_classification"],
    min: 0,
    max: 200,
    palette: [
      "#282828", // No input data available
      "#FFBB22", // Shrubs
      "#FFFF4C", // Herbaceous vegetation
      "#F096FF", // Cultivated & managed vegetation / agriculture
      "#FA0000", // Urban
      "#B4B4B4", // Bare / sparse vegetation
      "#F0F0F0", // Snow and ice
      "#0064C8", // Permanent water bodies
      "#0096A0", // Herbaceous wetland
      "#00CF75", // Moss and lichen
      "#006400", // Closed forest / evergreen needle leaf
      "#003C00", // Closed forest / deciduous broad leaf
      "#003C00",
      "#FFBB22",
    ],
  }

  return new Promise<TileUrlResponse>((resolve, reject) => {
    collection.getMap(visParams, ({ mapid, token, error }: any) => {
      if (error) {
        reject(new Error(`[GEE] getMap (Copernicus) failed: ${error}`))
        return
      }

      const tileUrl = `https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`

      resolve({
        tileUrl,
        mapId: mapid,
        token,
        attribution:
          "© Copernicus Global Land Service (100m) via Google Earth Engine",
        legend: ESA_WORLDCOVER_LEGEND, // approximate – full Copernicus legend is larger
      })
    })
  })
}
