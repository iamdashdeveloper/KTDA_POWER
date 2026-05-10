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

  const keyFilePath = process.env.GEE_SERVICE_ACCOUNT_KEY_FILE;

  if (!keyFilePath) {
    throw new Error("[GEE] Missing GEE_SERVICE_ACCOUNT_KEY_FILE env var");
  }

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`[GEE] Key file not found at: ${keyFilePath}`);
  }

  const raw = fs.readFileSync(keyFilePath, "utf-8");

  const key = JSON.parse(raw);

  if (!key.private_key || !key.client_email) {
    throw new Error("[GEE] Invalid service account file");
  }

  // 🔥 CRITICAL FIX: normalize PEM formatting for JWT signing
  key.private_key = key.private_key
    .replace(/\\n/g, "\n")   // escaped → real newline
    .replace(/\r\n/g, "\n")  // Windows line endings
    .replace(/\r/g, "\n")    // legacy Mac
    .trim();

  console.log("[GEE] Using service account:", key.client_email);

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

  return new Promise((resolve, reject) => {
    image.getMap(
      {
        min: 10,
        max: 100,
        palette,
      },
      ({ mapid, token, error }: any) => {
        if (error) {
          reject(new Error(`[GEE] getMap failed: ${error}`));
          return;
        }

        resolve({
          tileUrl: `https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`,
          mapId: mapid,
          token,
          attribution: "© ESA WorldCover via Google Earth Engine",
          legend: ESA_WORLDCOVER_LEGEND,
        });
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorldCoverStats(params: LandCoverStatsParams) {
  await initializeGEE();

  const { geometry, year = 2021 } = params;

  const image = getWorldCoverImage(year);
  const eeGeometry = ee.Geometry(geometry);

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