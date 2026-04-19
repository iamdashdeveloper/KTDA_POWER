import { FastifyInstance } from "fastify"

export default async function cadastreRoutes(fastify: FastifyInstance) {
  // GET /cadastre - Get all cadastre reference layer features (polylines)
  fastify.get("/cadastre", async (request, reply) => {
    try {
      // Use raw SQL to leverage PostGIS ST_AsGeoJSON function
      const features = await fastify.prisma.$queryRaw<
        Array<{ id: number; geojson: string }>
      >`
        SELECT 
          id,
          ST_AsGeoJSON(geometry) as geojson
        FROM gura_cadastre
      `

      // Convert to GeoJSON FeatureCollection
      const geoJsonFeatures = features.map(
        (feature: { id: number; geojson: string }) => {
          let geometry = null
          try {
            if (typeof feature.geojson === "string") {
              geometry = JSON.parse(feature.geojson)
            } else {
              geometry = feature.geojson
            }
          } catch (e) {
            console.error("Error parsing geometry for feature:", feature.id, e)
          }

          return {
            type: "Feature",
            id: feature.id.toString(),
            geometry: geometry,
            properties: {
              id: feature.id,
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

  // GET /cadastre/complaints - Get all complaints with parcel geometries
  fastify.get("/cadastre/complaints", async (request, reply) => {
    try {
      // Fetch all complaints with related parcel and project information
      const complaints = await fastify.prisma.complaint.findMany({
        include: {
          parcel: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Fetch geometries separately using raw query
      const geometries = await fastify.prisma.$queryRaw<
        Array<{ id: string; geometry: any }>
      >`SELECT id, ST_AsGeoJSON(geometry) as geometry FROM "Parcel"`

      // Create a map of parcel ID to geometry for quick lookup
      const geometryMap = new Map(
        geometries.map((g: { id: any; geometry: any }) => [g.id, g.geometry])
      )

      // Convert to GeoJSON FeatureCollection
      const geoJsonFeatures = complaints
        .map((complaint: any) => {
          const parcelId = complaint.parcel?.id

          // If no parcel ID, skip this complaint
          if (!parcelId) {
            return null
          }

          // Get geometry from map
          const parcelGeometry = geometryMap.get(parcelId)

          // If no geometry found, skip this complaint
          if (!parcelGeometry) {
            return null
          }

          // Parse geometry if needed
          let geometry = null
          try {
            if (typeof parcelGeometry === "string") {
              geometry = JSON.parse(parcelGeometry)
            } else {
              geometry = parcelGeometry
            }
          } catch (e) {
            console.error(
              "Error parsing geometry for complaint:",
              complaint.id,
              e
            )
            return null
          }

          return {
            type: "Feature",
            id: complaint.id,
            geometry: geometry,
            properties: {
              id: complaint.id,
              parcelId: parcelId,
              name: complaint.name,
              phoneNumber: complaint.phoneNumber,
              complaintType: complaint.complaintType,
              description: complaint.description,
              plotNumber: complaint.plotNumber,
              severity: complaint.severity,
              status: complaint.status,
              projectName: complaint.project?.name || "Unknown",
              createdAt: complaint.createdAt,
              updatedAt: complaint.updatedAt,
            },
          }
        })
        .filter((f: any) => f !== null)

      return {
        type: "FeatureCollection",
        features: geoJsonFeatures,
      }
    } catch (error) {
      console.error("Error fetching complaints:", error)
      reply.status(500).send({
        error: "Failed to fetch complaints",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
