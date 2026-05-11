/**
 * Google Earth Engine (GEE) Service
 */

import ee from "@google/earthengine";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggressively cleans GeoJSON coordinates for Google Earth Engine.
 * GEE only accepts [lon, lat]. This strips any Z (altitude) values.
 */
function cleanGeometry(geom: any): any {
  if (!geom) return null;
  
  const cleanCoords = (coords: any): any => {
    if (Array.isArray(coords)) {
      // If it's a coordinate pair/triplet [x, y, (z)]
      if (typeof coords[0] === 'number') {
        return [coords[0], coords[1]]; // Return only [lon, lat]
      }
      // If it's an array of arrays, recurse
      return coords.map(cleanCoords);
    }
    return coords;
  };

  return {
    ...geom,
    coordinates: cleanCoords(geom.coordinates)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LandCoverTileParams {
  bbox?: [number, number, number, number];
  year?: number;
  opacity?: number;
  visibleClasses?: number[];
  paletteOverrides?: Record<number, string>;
}

export interface LandCoverStatsParams {
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  year?: number;
}

export interface TileUrlResponse {
  tileUrl: string;
  mapId: string;
  token: string;
  attribution: string;
  legend: LandCoverClass[];
}

export interface LandCoverClass {
  value: number;
  label: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legend
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
];

// ─────────────────────────────────────────────────────────────────────────────
// Auth state
// ─────────────────────────────────────────────────────────────────────────────

let initialized = false;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH FIX (CRITICAL SECTION)
// ─────────────────────────────────────────────────────────────────────────────

export async function initializeGEE(): Promise<void> {
  if (initialized) return;

  let keyFilePath = process.env.GEE_SERVICE_ACCOUNT_KEY_FILE;

  // If path is relative, resolve it from the workspace root or apps/api
  if (keyFilePath && !path.isAbsolute(keyFilePath)) {
    const rootPath = path.resolve(process.cwd(), "apps/api");
    const possiblePath = path.resolve(rootPath, keyFilePath);
    if (fs.existsSync(possiblePath)) {
      keyFilePath = possiblePath;
    } else {
      keyFilePath = path.resolve(process.cwd(), keyFilePath);
    }
  }

  if (!keyFilePath) {
    throw new Error("[GEE] Missing GEE_SERVICE_ACCOUNT_KEY_FILE environment variable");
  }

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`[GEE] Credentials file not found at: ${path.resolve(keyFilePath)}`);
  }

  console.log(`[GEE] Loading credentials from: ${keyFilePath}`);
  const raw = fs.readFileSync(keyFilePath, "utf-8");
  const key = JSON.parse(raw);

  if (!key.private_key || !key.client_email) {
    throw new Error("[GEE] Invalid service account file");
  }

  // 🔥 AGGRESSIVE FIX: Ensure private_key is perfectly formatted for JWT
  if (typeof key.private_key === 'string') {
    key.private_key = key.private_key
      .replace(/\\n/g, '\n')     // Handle escaped newlines
      .replace(/\n/g, '\n')      // Ensure actual newlines
      .replace(/\r/g, '')        // Remove carriage returns
      .trim();
    
    // Ensure header/footer are correctly placed
    if (!key.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
       console.error("[GEE] Private key is missing header!");
    }
  }

  console.log("[GEE] Authenticating with:", key.client_email);

  await new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      key,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            initialized = true;
            console.log("[GEE] Initialized successfully");
            resolve();
          },
          (err: string) =>
            reject(new Error(`[GEE] Init failed: ${err}`))
        );
      },
      (err: string) =>
        reject(new Error(`[GEE] Auth failed: ${err}`))
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset helper
// ─────────────────────────────────────────────────────────────────────────────

function getWorldCoverImage(year: number = 2021): any {
  const collection =
    year <= 2020
      ? "ESA/WorldCover/v100"
      : "ESA/WorldCover/v200";

  return ee.ImageCollection(collection).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE API
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorldCoverTileUrl(
  params: LandCoverTileParams = {}
): Promise<TileUrlResponse> {
  await initializeGEE();

  const { year = 2021, visibleClasses, paletteOverrides } = params;

  let image = getWorldCoverImage(year).select("Map");

  // masking
  if (visibleClasses?.length) {
    let mask = image.eq(visibleClasses[0]);
    for (let i = 1; i < visibleClasses.length; i++) {
      mask = mask.or(image.eq(visibleClasses[i]));
    }
    image = image.updateMask(mask);
  }

  const palette = ESA_WORLDCOVER_LEGEND.map(
    (c) => paletteOverrides?.[c.value] || c.color
  );

  const visParams = {
    min: 10,
    max: 100,
    palette,
    opacity: params.opacity ?? 1.0,
  };

  return new Promise((resolve, reject) => {
    image.getMap(visParams, ({ mapid, token, error }: any) => {
      if (error) {
        reject(new Error(`[GEE] getMap failed: ${error}`));
        return;
      }

      resolve({
        tileUrl: `https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`,
        mapId: mapid,
        token,
        attribution: "© ESA WorldCover via Google Earth Engine",
        legend: ESA_WORLDCOVER_LEGEND.map(c => ({
          ...c,
          color: paletteOverrides?.[c.value] || c.color
        })),
      });
    });
  });
}

/**
 * Generates an XYZ tile URL for the Copernicus Global Land Cover (100 m).
 */
export async function getCopernicusTileUrl(
  year: number = 2019
): Promise<TileUrlResponse> {
  await initializeGEE();

  const collection = ee
    .ImageCollection("COPERNICUS/Landcover/100m/Proba-V-C3/Global")
    .filter(ee.Filter.calendarRange(year, year, "year"))
    .first();

  const visParams = {
    bands: ["discrete_classification"],
    min: 0,
    max: 200,
    opacity: 1.0,
    palette: [
      "#282828", "#FFBB22", "#FFFF4C", "#F096FF", "#FA0000",
      "#B4B4B4", "#F0F0F0", "#0064C8", "#0096A0", "#00CF75",
      "#006400", "#003C00", "#003C00", "#FFBB22",
    ],
  };

  return new Promise<TileUrlResponse>((resolve, reject) => {
    collection.getMap(visParams, ({ mapid, token, error }: any) => {
      if (error) {
        reject(new Error(`[GEE] getMap (Copernicus) failed: ${error}`));
        return;
      }

      resolve({
        tileUrl: `https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`,
        mapId: mapid,
        token,
        attribution: "© Copernicus Global Land Service (100m) via Google Earth Engine",
        legend: ESA_WORLDCOVER_LEGEND,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorldCoverStats(params: LandCoverStatsParams) {
  await initializeGEE();

  const { geometry: rawGeometry, year = 2021 } = params;
  console.log(`[GEE Stats] Input Geometry Type: ${rawGeometry?.type}`);
  
  const geometry = cleanGeometry(rawGeometry);
  console.log(`[GEE Stats] Cleaned Geometry: ${JSON.stringify(geometry).substring(0, 500)}...`);

  const image = getWorldCoverImage(year);
  
  let eeGeometry;
  try {
    eeGeometry = ee.Geometry(geometry);
  } catch (eeErr: any) {
    console.error("[GEE Stats] ee.Geometry creation failed:", eeErr);
    throw new Error(`Failed to create Earth Engine geometry: ${eeErr.message}`);
  }

  return new Promise((resolve, reject) => {
    image
      .select("Map")
      .reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        geometry: eeGeometry,
        scale: 10,
        maxPixels: 1e10,
      })
      .evaluate((result: any, err: string) => {
        if (err) {
          reject(new Error(err));
          return;
        }

        const histogram = result?.Map ?? {};

        const stats: Record<string, number> = {};

        for (const [key, value] of Object.entries(histogram)) {
          const classValue = Number(key);
          const label =
            ESA_WORLDCOVER_LEGEND.find((c) => c.value === classValue)
              ?.label || `Class ${classValue}`;

          stats[label] = (value as number) * 0.0001; // m² → km²
        }

        resolve({
          stats,
          legend: ESA_WORLDCOVER_LEGEND,
        });
      });
  });
}