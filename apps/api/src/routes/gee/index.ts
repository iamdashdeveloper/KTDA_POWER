import { FastifyInstance } from "fastify"
import {
  getWorldCoverTileUrl,
  getCopernicusTileUrl,
  getWorldCoverStats,
  LandCoverTileParams,
  LandCoverStatsParams,
} from "../../services/geeService.js"
import {
  getDynamicWorldTileUrl,
  getDynamicWorldAvailableDates,
  getDynamicWorldTimeline,
  DynamicWorldTileParams,
} from "../../services/dynamicWorldService.js"

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
      console.log(`[GEE] Starting zonal stats for year ${parsedYear}...`)
      
      const result = await getWorldCoverStats({ geometry, year: parsedYear })
      return reply.status(200).send(result)
    } catch (error: any) {
      console.error("[GEE Stats Error]", error)
      return reply.status(500).send({
        error: "Failed to compute land cover statistics",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

      const [project]: any[] = await fastify.prisma.$queryRaw`
        SELECT ST_AsGeoJSON(location) as geojson 
        FROM "Project" 
        WHERE id = ${projectId}
      `

      if (!project || !project.geojson) {
        return reply.status(404).send({ error: "Project location not found" })
      }

      const location = JSON.parse(project.geojson)
      
      let geometry = location
      if (location.type === "Point") {
        const lon = location.coordinates[0]
        const lat = location.coordinates[1]
        const d = 0.045
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

  // ─────────────────────────────────────────────────────────────────────────
  // Dynamic World Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  // GET Dynamic World tile URL
  fastify.get<{
    Querystring: {
      startDate?: string
      endDate?: string
      visibleClasses?: string
      paletteOverrides?: string
      opacity?: string
    }
  }>("/gee/dynamic-world/tiles", async (request, reply) => {
    try {
      const { startDate, endDate, visibleClasses, paletteOverrides, opacity } = request.query

      const params: DynamicWorldTileParams = {
        startDate,
        endDate,
      }

      if (visibleClasses) {
        params.visibleClasses = visibleClasses.split(",").map((v) => parseInt(v, 10))
      }

      if (paletteOverrides) {
        try {
          params.paletteOverrides = JSON.parse(paletteOverrides)
        } catch (e) {
          fastify.log.warn("Failed to parse Dynamic World paletteOverrides JSON")
        }
      }

      if (opacity) {
        params.opacity = parseFloat(opacity)
      }

      const result = await getDynamicWorldTileUrl(params)
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to generate Dynamic World tiles",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET available Dynamic World dates
  fastify.get<{
    Querystring: {
      startDate?: string
      endDate?: string
    }
  }>("/gee/dynamic-world/dates", async (request, reply) => {
    try {
      const { startDate, endDate } = request.query
      const result = await getDynamicWorldAvailableDates(startDate, endDate)
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to fetch Dynamic World available dates",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET Dynamic World timeline frames
  fastify.get<{
    Querystring: {
      startDate?: string
      endDate?: string
    }
  }>("/gee/dynamic-world/timeline", async (request, reply) => {
    try {
      const { startDate, endDate } = request.query
      const result = await getDynamicWorldTimeline(startDate, endDate)
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to fetch Dynamic World timeline",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
