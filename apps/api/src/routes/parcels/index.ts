import { FastifyInstance } from "fastify"

export default async function parcelsRoutes(fastify: FastifyInstance) {
  /**
   * POST /parcels
   * Create a new parcel with geometry and owner
   * Body: {
   *   ownerId: BigInt,
   *   name?: string,
   *   description?: string,
   *   geometry: GeoJSON geometry object,
   *   area?: number
   * }
   */
  fastify.post<{
    Body: {
      ownerId: string
      name?: string
      description?: string
      geometry: any
      area?: number
    }
  }>("/parcels", async (request, reply) => {
    try {
      const { ownerId, name, description, geometry, area } = request.body

      // Convert GeoJSON geometry to WKT (Well-Known Text) format for PostGIS
      // geometry should be a GeoJSON Polygon
      if (!geometry || geometry.type !== "Polygon") {
        return reply
          .status(400)
          .send({ error: "Geometry must be a valid GeoJSON Polygon" })
      }

      // Convert GeoJSON coordinates to WKT POLYGON format
      const coordinates = geometry.coordinates[0] // Outer ring
      const wktCoordinates = coordinates
        .map((coord: [number, number]) => `${coord[0]} ${coord[1]}`)
        .join(", ")
      const wktPolygon = `POLYGON((${wktCoordinates}))`

      // Create parcel with raw SQL to handle PostGIS geometry
      const result = await fastify.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "Parcel" (id, "ownerId", name, description, geometry, area, status, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${ownerId},
          ${name || null},
          ${description || null},
          ST_GeomFromText(${wktPolygon}, 4326),
          ${area || null},
          'active',
          NOW(),
          NOW()
        )
        RETURNING id
      `

      const parcelId = result[0]?.id
      if (!parcelId) {
        return reply.status(500).send({ error: "Failed to create parcel" })
      }

      return reply
        .status(201)
        .send({ id: parcelId, ownerId, name, description, area })
    } catch (error) {
      console.error("Error creating parcel:", error)
      return reply.status(500).send({ error: "Failed to create parcel" })
    }
  })

  /**
   * GET /parcels
   * Get all parcels with optional filtering
   */
  fastify.get<{ Querystring: { ownerId?: string; status?: string } }>(
    "/parcels",
    async (request, reply) => {
      try {
        const { ownerId, status } = request.query

        // Use raw SQL to get parcels with geometry as GeoJSON in WGS84 (EPSG:4326)
        // Some legacy rows may have meter-based coordinates but wrong/missing SRID metadata.
        // Detect those by range and transform from 3857 -> 4326.
        let query = `
          SELECT 
            p.id,
            p."ownerId",
            p.name,
            p.description,
            p.area,
            p.status,
            p.metadata,
            p."createdAt",
            p."updatedAt",
            CASE
              WHEN ABS(ST_XMin(ST_Envelope(p.geometry))) > 180
                OR ABS(ST_XMax(ST_Envelope(p.geometry))) > 180
                OR ABS(ST_YMin(ST_Envelope(p.geometry))) > 90
                OR ABS(ST_YMax(ST_Envelope(p.geometry))) > 90
              THEN ST_AsGeoJSON(ST_Transform(ST_SetSRID(p.geometry, 3857), 4326))::text
              ELSE ST_AsGeoJSON(ST_SetSRID(p.geometry, 4326))::text
            END as geojson,
            ST_IsValid(p.geometry) as is_valid_geometry,
            ST_IsEmpty(p.geometry) as is_empty_geometry,
            ST_AsText(p.geometry) as wkt_geometry,
            ST_SRID(p.geometry) as geometry_srid,
            o.id as "owner.id",
            o.name as "owner.name",
            o.email as "owner.email",
            o.phone as "owner.phone",
            o.address as "owner.address"
          FROM "Parcel" p
          LEFT JOIN "Owner" o ON p."ownerId" = o.id
          WHERE 1=1
        `
        const params: any[] = []

        if (ownerId) {
          query += ` AND p."ownerId" = $${params.length + 1}`
          params.push(ownerId)
        }

        if (status) {
          query += ` AND p.status = $${params.length + 1}`
          params.push(status)
        }

        const results = await fastify.prisma.$queryRawUnsafe<Array<any>>(
          query,
          ...params
        )

        // Transform results to include geometry as GeoJSON
        const parcels = results.map((row: any) => {
          let geometry = null
          try {
            if (row.geojson && typeof row.geojson === "string") {
              geometry = JSON.parse(row.geojson)
            } else if (row.geojson && typeof row.geojson === "object") {
              geometry = row.geojson
            }
          } catch (e) {
            console.error("Error parsing geometry:", e)
          }

          return {
            id: row.id,
            ownerId: row.ownerId,
            name: row.name,
            description: row.description,
            area: row.area,
            status: row.status,
            metadata: row.metadata,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            geometry: geometry,
            owner: {
              id: row["owner.id"],
              name: row["owner.name"],
              email: row["owner.email"],
              phone: row["owner.phone"],
              address: row["owner.address"],
            },
          }
        })

        return reply.send(parcels)
      } catch (error) {
        console.error("Error fetching parcels:", error)
        return reply.status(500).send({ error: "Failed to fetch parcels" })
      }
    }
  )

  /**
   * GET /parcels/:id
   * Get a single parcel by ID with its related data
   */
  fastify.get<{ Params: { id: string } }>(
    "/parcels/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        const parcel = await fastify.prisma.parcel.findUnique({
          where: { id },
          include: {
            owner: true,
            complaints: {
              include: {
                feedbacks: true,
              },
            },
            feedbacks: true,
          },
        })

        if (!parcel) {
          return reply.status(404).send({ error: "Parcel not found" })
        }

        return reply.send(parcel)
      } catch (error) {
        console.error("Error fetching parcel:", error)
        return reply.status(500).send({ error: "Failed to fetch parcel" })
      }
    }
  )

  /**
   * PATCH /parcels/:id
   * Update parcel information
   */
  fastify.patch<{ Params: { id: string }; Body: any }>(
    "/parcels/:id",
    async (request, reply) => {
      try {
        const { id } = request.params
        const updates = request.body as any

        const parcel = await fastify.prisma.parcel.update({
          where: { id },
          data: {
            ...(updates.name && { name: updates.name }),
            ...(updates.description && { description: updates.description }),
            ...(updates.status && { status: updates.status }),
            ...(updates.metadata && { metadata: updates.metadata }),
          },
          include: {
            owner: true,
          },
        })

        return reply.send(parcel)
      } catch (error) {
        console.error("Error updating parcel:", error)
        return reply.status(500).send({ error: "Failed to update parcel" })
      }
    }
  )
}
