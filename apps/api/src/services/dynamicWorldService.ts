/**
 * Dynamic World LULC Service
 * Dataset: GOOGLE/DYNAMICWORLD/V1
 * Resolution: 10m, Near-daily global coverage
 */

import ee from "@google/earthengine";
import { initializeGEE } from "./geeService.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DYNAMIC_WORLD_CLASSES = [
  { value: 0, label: "Water",              color: "#419bdf" },
  { value: 1, label: "Trees",              color: "#397d49" },
  { value: 2, label: "Grass",              color: "#88b053" },
  { value: 3, label: "Flooded Vegetation", color: "#7a87c6" },
  { value: 4, label: "Crops",              color: "#e49635" },
  { value: 5, label: "Shrub & Scrub",      color: "#dfc35a" },
  { value: 6, label: "Built Area",         color: "#c4281b" },
  { value: 7, label: "Bare Ground",        color: "#a59b8f" },
  { value: 8, label: "Snow & Ice",         color: "#b39fe1" },
];

const DW_BAND_NAMES = [
  "water", "trees", "grass", "flooded_vegetation",
  "crops", "shrub_and_scrub", "built", "bare", "snow_and_ice"
];

const DW_PALETTE = DYNAMIC_WORLD_CLASSES.map((c) => c.color);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DynamicWorldTileParams {
  startDate?: string;       // ISO date e.g. "2023-01-01"
  endDate?: string;         // ISO date e.g. "2023-12-31"
  visibleClasses?: number[];
  paletteOverrides?: Record<number, string>;
  opacity?: number;
}

export interface DynamicWorldTileResponse {
  tileUrl: string;
  mapId: string;
  token: string;
  startDate: string;
  endDate: string;
  attribution: string;
  legend: typeof DYNAMIC_WORLD_CLASSES;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile URL Generation
// ─────────────────────────────────────────────────────────────────────────────

export async function getDynamicWorldTileUrl(
  params: DynamicWorldTileParams = {}
): Promise<DynamicWorldTileResponse> {
  await initializeGEE();

  const defaults = getDefaultDateRange();
  const startDate = params.startDate || defaults.startDate;
  const endDate   = params.endDate   || defaults.endDate;

  // Build palette — apply per-class overrides
  const palette = DYNAMIC_WORLD_CLASSES.map((c) =>
    params.paletteOverrides?.[c.value] || c.color
  );

  // Fetch collection and create mode composite
  let collection = ee
    .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterDate(startDate, endDate)
    .select("label");

  // Apply class mask if specific classes requested
  if (params.visibleClasses && params.visibleClasses.length > 0) {
    const modes = collection.mode();
    let mask = modes.eq(params.visibleClasses[0]);
    for (let i = 1; i < params.visibleClasses.length; i++) {
      mask = mask.or(modes.eq(params.visibleClasses[i]));
    }
    collection = collection.map((img: any) => img.updateMask(mask));
  }

  // Mode composite: most frequent class over the date range
  const modeImage = collection.mode();

  const visParams = {
    min: 0,
    max: 8,
    palette,
    opacity: params.opacity ?? 0.85,
  };

  return new Promise((resolve, reject) => {
    modeImage.getMap(visParams, ({ mapid, token, error }: any) => {
      if (error) {
        reject(new Error(`[DW] getMap failed: ${error}`));
        return;
      }

      resolve({
        tileUrl: `https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`,
        mapId: mapid,
        token,
        startDate,
        endDate,
        attribution: "© Google Dynamic World v1 via Google Earth Engine",
        legend: DYNAMIC_WORLD_CLASSES.map((c) => ({
          ...c,
          color: params.paletteOverrides?.[c.value] || c.color,
        })),
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Available Dates
// ─────────────────────────────────────────────────────────────────────────────

export async function getDynamicWorldAvailableDates(
  startDate?: string,
  endDate?: string
): Promise<{ dates: string[] }> {
  await initializeGEE();

  const defaults = getDefaultDateRange();
  const start = startDate || defaults.startDate;
  const end   = endDate   || defaults.endDate;

  return new Promise((resolve, reject) => {
    const collection = ee
      .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
      .filterDate(start, end);

    collection.aggregate_array("system:time_start").evaluate(
      (timestamps: number[], err: any) => {
        if (err) {
          reject(new Error(`[DW] Failed to fetch dates: ${err}`));
          return;
        }

        // Deduplicate and format as ISO date strings
        const unique = [...new Set(
          timestamps.map((ts: number) =>
            new Date(ts).toISOString().split("T")[0]
          )
        )].sort();

        resolve({ dates: unique });
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline / Animation Frames
// ─────────────────────────────────────────────────────────────────────────────

export async function getDynamicWorldTimeline(
  startDate?: string,
  endDate?: string
): Promise<{ frames: { date: string; tileUrl: string }[] }> {
  await initializeGEE();

  const defaults = getDefaultDateRange();
  const start = startDate || defaults.startDate;
  const end   = endDate   || defaults.endDate;

  // 1. Get available images in range
  const collection = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterDate(start, end)
    .select("label")
    .sort("system:time_start");

  // Limit to 20 frames for performance and stability
  const list = collection.toList(20);
  const count = await new Promise<number>((res) => list.length().evaluate(res));

  const frames: { date: string; tileUrl: string }[] = [];

  for (let i = 0; i < count; i++) {
    const img = ee.Image(list.get(i));
    const info = await new Promise<any>((res) => img.get("system:time_start").evaluate(res));
    const date = new Date(info).toISOString().split("T")[0];

    const visParams = {
      min: 0,
      max: 8,
      palette: DW_PALETTE,
      opacity: 0.9,
    };

    const tileResult = await new Promise<any>((resolve, reject) => {
      img.getMap(visParams, ({ mapid, error }: any) => {
        if (error) reject(error);
        else resolve(`https://earthengine.googleapis.com/v1alpha/${mapid}/tiles/{z}/{x}/{y}`);
      });
    });

    frames.push({ date, tileUrl: tileResult });
  }

  return { frames };
}
