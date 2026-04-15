import { FastifyInstance } from "fastify"

export default async function cadastreRoutes(fastify: FastifyInstance) {
  // GET /cadastre - Get all cadastre reference layer features (polylines)
  fastify.get("/cadastre", async (request, reply) => {
    try {
      // Use raw SQL to leverage PostGIS ST_AsGeoJSON function
      const features = await fastify.prisma.$queryRaw<
        Array<{ ogc_fid: number; geojson: string }>
      >`
        SELECT 
          ogc_fid,
          ST_AsGeoJSON(geom) as geojson
        FROM gura_cadastre
      `

      // Convert to GeoJSON FeatureCollection
      const geoJsonFeatures = features.map(
        (feature: { ogc_fid: number; geojson: string }) => {
          let geometry = null
          try {
            if (typeof feature.geojson === "string") {
              geometry = JSON.parse(feature.geojson)
            } else {
              geometry = feature.geojson
            }
          } catch (e) {
            console.error(
              "Error parsing geometry for feature:",
              feature.ogc_fid,
              e
            )
          }

          return {
            type: "Feature",
            id: feature.ogc_fid.toString(),
            geometry: geometry,
            properties: {
              ogc_fid: feature.ogc_fid,
            },
          }
        }
      )

      return {
        type: "FeatureCollection",
        features: geoJsonFeatures,
      }
    } catch (error) {
      console.error("Error fetching cadastre features:", error)
      reply.status(500).send({
        error: "Failed to fetch cadastre features",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
