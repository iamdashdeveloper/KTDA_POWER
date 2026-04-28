declare module "wkt-parser" {
  export interface WKTGeometry {
    type: string
    coordinates?: any
    geometries?: any
  }

  export function parse(wkt: string): WKTGeometry | null
}
