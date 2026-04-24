import Style from "ol/style/Style"
import Fill from "ol/style/Fill"
import Stroke from "ol/style/Stroke"
import CircleStyle from "ol/style/Circle"
import Text from "ol/style/Text"
import { getThemeColor, getFeatureColor } from "./mapUtils"

export function featureStyleFunction(feature: any) {
  const geometry = feature.getGeometry()
  const geometryType = geometry?.getType()
  const groupId = feature.get("groupId")

  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: getFeatureColor(geometryType, groupId) }),
        stroke: new Stroke({ color: getThemeColor("--background"), width: 2 }),
      }),
    })
  }

  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return new Style({
      stroke: new Stroke({
        color: getFeatureColor(geometryType, groupId),
        width: 3,
      }),
    })
  }

  return new Style({
    fill: new Fill({ color: getFeatureColor(geometryType, groupId) + "26" }), // Adding alpha for fill
    stroke: new Stroke({
      color: getFeatureColor(geometryType, groupId),
      width: 2,
    }),
  })
}

export function issueStyleFunction(feature: any) {
  const status = String(feature.get("status") || "OPEN").toUpperCase()
  const priority = Number(feature.get("priority") || 0)

  const palette: Record<string, { fill: string; stroke: string }> = {
    OPEN: { fill: "oklch(0.577 0.245 27.325 / 0.95)", stroke: "oklch(0.35 0.15 27)" },
    IN_PROGRESS: { fill: "oklch(0.7 0.2 60 / 0.95)", stroke: "oklch(0.5 0.15 60)" },
    ON_HOLD: { fill: "oklch(0.6 0.2 300 / 0.95)", stroke: "oklch(0.4 0.15 300)" },
    RESOLVED: { fill: "oklch(0.7 0.2 150 / 0.95)", stroke: "oklch(0.5 0.15 150)" },
    CLOSED: { fill: getThemeColor("--muted", 0.95), stroke: getThemeColor("--muted-foreground") },
  }

  const colors = palette[status] || palette.OPEN
  const radius = Math.max(8, 8 + priority * 3)

  return new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color: colors.fill }),
      stroke: new Stroke({ color: getThemeColor("--background"), width: 2 }),
    }),
    text: new Text({
      text: "!",
      fill: new Fill({ color: getThemeColor("--background") }),
      stroke: new Stroke({ color: "rgba(0,0,0,0.35)", width: 3 }),
      font: "800 11px Inter, Arial, sans-serif",
      offsetY: 0,
    }),
  })
}
