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
  fastify.get<{
    Querystring: {
      year?: string
      visibleClasses?: string
      paletteOverrides?: string
    }
  }>("/gee/worldcover/tiles", async (request, reply) => {
    try {
      const { year, visibleClasses, paletteOverrides } = request.query
      const parsedYear = year ? parseInt(year, 10) : 2021

      const params: LandCoverTileParams = {
        year: parsedYear,
      }

      if (visibleClasses) {
        params.visibleClasses = visibleClasses.split(",").map((v) => parseInt(v, 10))
      }

      if (paletteOverrides) {
        try {
          params.paletteOverrides = JSON.parse(paletteOverrides)
        } catch (e) {
          fastify.log.warn("Failed to parse paletteOverrides JSON")
        }
      }

      const result = await getWorldCoverTileUrl(params)
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to generate ESA WorldCover tiles",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

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
  fastify.post<{
    Body: {
      geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
      year?: string
    }
  }>("/gee/worldcover/stats", async (request, reply) => {
    try {
      const { geometry, year } = request.body

      if (!geometry) {
        return reply.status(400).send({
          error: "GeoJSON geometry is required",
        })
      }

      const parsedYear = year ? parseInt(year, 10) : 2021
      const result = await getWorldCoverStats({ geometry, year: parsedYear })
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to compute land cover statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET land cover stats for a project (using project location + buffer)
  fastify.get<{
    Querystring: {
      projectId: string
      year?: string
    }
  }>("/gee/worldcover/stats", async (request, reply) => {
    try {
      const { projectId, year } = request.query
      const parsedYear = year ? parseInt(year, 10) : 2021

      // 1. Fetch project location
      const [project]: any[] = await fastify.prisma.$queryRaw`
        SELECT ST_AsGeoJSON(location) as geojson 
        FROM "Project" 
        WHERE id = ${projectId}
      `

      if (!project || !project.geojson) {
        return reply.status(404).send({ error: "Project location not found" })
      }

      const location = JSON.parse(project.geojson)
      
      // 2. Create a buffer if it's a point (most projects are points currently)
      // If it's already a polygon, use it. If point, buffer by ~5km
      let geometry = location
      if (location.type === "Point") {
        // Simple square buffer around the point (~5km)
        const lon = location.coordinates[0]
        const lat = location.coordinates[1]
        const d = 0.045 // approx 5km in degrees
        geometry = {
          type: "Polygon",
          coordinates: [[
            [lon - d, lat - d],
            [lon + d, lat - d],
            [lon + d, lat + d],
            [lon - d, lat + d],
            [lon - d, lat - d]
          ]]
        }
      }

      const result = await getWorldCoverStats({ geometry, year: parsedYear })
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to compute project land cover statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
