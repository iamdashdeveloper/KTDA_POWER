import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { parseKML } from "../../utils/kml-parser.js"
import { parseKMZ } from "../../utils/kmz-parser.js"
import { parseGeoJSON } from "../../utils/geojson-parser.js"
import path from "path"

export async function featuresRoutes(fastify: FastifyInstance) {
  // Get all features
  fastify.get(
    "/features",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const features = await fastify.prisma.feature.findMany({
          include: {
            project: true,
            subFeatures: true,
          },
        })
        return reply.send(features)
      } catch (error) {
        return reply.code(500).send({ error: "Failed to fetch features" })
      }
    }
  )

  // Get feature by ID
  fastify.get<{ Params: { id: string } }>(
    "/features/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const feature = await fastify.prisma.feature.findUnique({
          where: { id: request.params.id },
          include: {
            project: true,
            subFeatures: true,
            parent: true,
          },
        })

        if (!feature) {
          return reply.code(404).send({ error: "Feature not found" })
        }

        return reply.send(feature)
      } catch (error) {
        return reply.code(500).send({ error: "Failed to fetch feature" })
      }
    }
  )

  // Create feature
  fastify.post<{ Body: any }>(
    "/features",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const { name, projectId, geometry, details, parentId } = request.body

        const feature = await fastify.prisma.feature.create({
          data: {
            name,
            projectId,
            geometry: geometry || null,
            details: details || {},
            parentId: parentId || null,
          },
        })

        return reply.code(201).send(feature)
      } catch (error) {
        console.error("Error creating feature:", error)
        return reply.code(400).send({ error: "Failed to create feature" })
      }
    }
  )

  // Upload features from KML, KMZ, or GeoJSON
  fastify.post<{ Body: any }>(
    "/features/upload",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file()

        if (!data) {
          return reply.code(400).send({ error: "No file provided" })
        }

        const filename = data.filename
        const fileBuffer = await data.toBuffer()
        const fileType = path.extname(filename).toLowerCase()

        let features: any[] = []

        try {
          if (fileType === ".kml") {
            features = await parseKML(fileBuffer)
          } else if (fileType === ".kmz") {
            features = await parseKMZ(fileBuffer)
          } else if (fileType === ".geojson" || fileType === ".json") {
            features = await parseGeoJSON(fileBuffer)
          } else {
            return reply.code(400).send({ error: "Unsupported file type" })
          }

          // Get default project or create one
          let project = await fastify.prisma.project.findFirst()
          if (!project) {
            project = await fastify.prisma.project.create({
              data: {
                name: "Default Project",
                description: "Auto-created project for imported features",
                companyId: "", // Get from auth or first company
              },
            })
          }

          // Save features to database
          const savedFeatures = []
          for (const feature of features) {
            const savedFeature = await fastify.prisma.feature.create({
              data: {
                name:
                  feature.name || feature.properties?.name || "Unnamed Feature",
                projectId: project.id,
                geometry: feature.geometry,
                details: feature.properties || {},
              },
            })
            savedFeatures.push(savedFeature)
          }

          return reply.code(201).send({
            success: true,
            count: savedFeatures.length,
            features: savedFeatures,
          })
        } catch (parseError) {
          console.error("Error parsing file:", parseError)
          return reply.code(400).send({
            error: "Failed to parse file",
            message:
              parseError instanceof Error
                ? parseError.message
                : "Unknown error",
          })
        }
      } catch (error) {
        console.error("Error uploading file:", error)
        return reply.code(500).send({ error: "Failed to upload file" })
      }
    }
  )

  // Update feature
  fastify.put<{ Params: { id: string }; Body: any }>(
    "/features/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, geometry, details, parentId } = request.body

        const feature = await fastify.prisma.feature.update({
          where: { id: request.params.id },
          data: {
            name,
            geometry: geometry || undefined,
            details: details || undefined,
            parentId: parentId || undefined,
          },
        })

        return reply.send(feature)
      } catch (error) {
        console.error("Error updating feature:", error)
        return reply.code(400).send({ error: "Failed to update feature" })
      }
    }
  )

  // Delete feature
  fastify.delete<{ Params: { id: string } }>(
    "/features/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const feature = await fastify.prisma.feature.delete({
          where: { id: request.params.id },
        })

        return reply.send({ success: true, feature })
      } catch (error) {
        console.error("Error deleting feature:", error)
        return reply.code(400).send({ error: "Failed to delete feature" })
      }
    }
  )
}
