import GeoJSON from "ol/format/GeoJSON"

export const DEFAULT_CENTER: [number, number] = [37.9062, -0.0236]
export const DEFAULT_ZOOM = 6
export const PROJECT_LOCATION_ZOOM = 17
export const geoJsonFormat = new GeoJSON()

export const satelliteAttribution =
  'Tiles © <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community'
