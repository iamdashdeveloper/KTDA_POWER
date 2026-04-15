"use client"

import type { Theme } from "@syncfusion/react-charts"
import { useThemeName } from "./context"

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
 * Hook to get chart theme configuration
 * Automatically adapts to light/dark mode
 */
export function useChartTheme() {
  const { themeName } = useThemeName()

  const chartTheme: Theme = themeName === "dark" ? "MaterialDark" : "Material"
  const paletteColors =
    themeName === "dark" ? MATERIAL_DARK_COLORS : MATERIAL_LIGHT_COLORS

  return {
    chartTheme,
    paletteColors,
    materialColors: MATERIAL_LIGHT_COLORS,
    materialDarkColors: MATERIAL_DARK_COLORS,
  }
}
