import { FastifyInstance } from "fastify"
import {
  getWorldCoverTileUrl,
  getCopernicusTileUrl,
  getWorldCoverStats,
  LandCoverTileParams,
  LandCoverStatsParams,
} from "../../services/geeService.js"

export async function geeRoutes(fastify: FastifyInstance) {
  // Get XYZ tile URL for ESA WorldCover (10m)
  fastify.get<{ Querystring: { year?: "2020" | "2021" } }>(
    "/gee/worldcover/tiles",
    async (request, reply) => {
      try {
        const { year } = request.query
        const parsedYear = year ? (parseInt(year, 10) as 2020 | 2021) : 2021

        const result = await getWorldCoverTileUrl({ year: parsedYear })
        return reply.status(200).send(result)
      } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
          error: "Failed to generate ESA WorldCover tiles",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // Get XYZ tile URL for Copernicus Global Land Cover (100m)
  fastify.get<{ Querystring: { year?: string } }>(
    "/gee/copernicus/tiles",
    async (request, reply) => {
      try {
        const { year } = request.query
        const parsedYear = year ? parseInt(year, 10) : 2019

        const result = await getCopernicusTileUrl(parsedYear)
        return reply.status(200).send(result)
      } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
          error: "Failed to generate Copernicus tiles",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // Compute land cover stats for a given GeoJSON geometry
  fastify.post<{ Body: { geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon; year?: "2020" | "2021" } }>(
    "/gee/worldcover/stats",
    async (request, reply) => {
      try {
        const { geometry, year } = request.body

        if (!geometry) {
          return reply.status(400).send({
            error: "GeoJSON geometry is required",
          })
        }

        const parsedYear = year ? (parseInt(year, 10) as 2020 | 2021) : 2021

        const result = await getWorldCoverStats({ geometry, year: parsedYear })
        return reply.status(200).send(result)
      } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
          error: "Failed to compute land cover statistics",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
