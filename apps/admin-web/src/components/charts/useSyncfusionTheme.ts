"use client"

import type { Theme } from "@syncfusion/react-charts"
import { useTheme } from "../theme-provider"

/**
 * Material Light Color Palette (10 colors)
 */
const MATERIAL_LIGHT_COLORS = [
  "#6355C7", // Primary Purple
  "#00AEE0", // Cyan
  "#FFB400", // Amber
  "#F7523F", // Red-Orange
  "#963C70", // Magenta
  "#FD7400", // Orange
  "#4BE0BC", // Teal
  "#2196F5", // Blue
  "#DE3D8A", // Pink
  "#162F88", // Dark Blue
]

/**
 * Material Dark Color Palette (10 colors)
 */
const MATERIAL_DARK_COLORS = [
  "#4EAAFF", // Light Blue
  "#FA4EAB", // Light Pink
  "#FFF500", // Yellow
  "#17EA58", // Green
  "#38FFE7", // Cyan
  "#FF9E45", // Light Orange
  "#B3F32F", // Lime
  "#B93CE4", // Purple
  "#FC5664", // Light Red
  "#9B55FF", // Violet
]

/**
 * Universal hook for Syncfusion component theming
 * Automatically adapts to light/dark mode based on the app's theme provider
 *
 * @returns {Object} Theme configuration with chartTheme and paletteColors
 *
 * @example
 * const { chartTheme, paletteColors } = useSyncfusionTheme()
 * <Chart theme={chartTheme} palettes={paletteColors} />
 */
export function useSyncfusionTheme() {
  const { theme } = useTheme()

  // Resolve theme: if "system", check system preference
  let resolvedTheme: "light" | "dark" = "light"
  if (theme === "dark") {
    resolvedTheme = "dark"
  } else if (theme === "system") {
    resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }

  const chartTheme: Theme =
    resolvedTheme === "dark" ? "MaterialDark" : "Material"
  const paletteColors =
    resolvedTheme === "dark" ? MATERIAL_DARK_COLORS : MATERIAL_LIGHT_COLORS

  return {
    chartTheme,
    paletteColors,
  }
}
