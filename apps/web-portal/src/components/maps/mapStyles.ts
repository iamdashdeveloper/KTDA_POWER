import Style from "ol/style/Style"
import Fill from "ol/style/Fill"
import Stroke from "ol/style/Stroke"
import CircleStyle from "ol/style/Circle"
import Text from "ol/style/Text"
import { getFeatureColor } from "./mapUtils"

export function featureStyleFunction(feature: any) {
  const geometry = feature.getGeometry()
  const geometryType = geometry?.getType()
  const groupId = feature.get("groupId")

  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: getFeatureColor(geometryType, groupId) }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
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
    fill: new Fill({ color: getFeatureColor(geometryType, groupId, 0.15) }),
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
    OPEN: { fill: "rgba(217, 70, 39, 0.95)", stroke: "rgba(153, 51, 25, 1)" },
    IN_PROGRESS: { fill: "rgba(217, 119, 6, 0.95)", stroke: "rgba(180, 83, 9, 1)" },
    ON_HOLD: { fill: "rgba(168, 85, 247, 0.95)", stroke: "rgba(126, 34, 206, 1)" },
    RESOLVED: { fill: "rgba(34, 197, 94, 0.95)", stroke: "rgba(22, 163, 74, 1)" },
    CLOSED: { fill: "rgba(107, 114, 128, 0.95)", stroke: "rgba(75, 85, 99, 1)" },
  }

  const colors = palette[status] || palette.OPEN
  const radius = Math.max(8, 8 + priority * 3)

  return new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color: colors.fill }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
    }),
    text: new Text({
      text: "!",
      fill: new Fill({ color: "#ffffff" }),
      stroke: new Stroke({ color: "rgba(0,0,0,0.35)", width: 3 }),
      font: "800 11px Inter, Arial, sans-serif",
      offsetY: 0,
    }),
  })
}
