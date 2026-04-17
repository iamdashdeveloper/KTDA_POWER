import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { parseSpatialFile } from "../../utils/spatial-parser.js"
import path from "path"

export async function featuresRoutes(fastify: FastifyInstance) {
  // Get all features
  fastify.get(
    "/features",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const features = await fastify.prisma.feature.findMany({
          include: {
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
        const { name, projectId, geometry, details, parentId } =
          request.body as any

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
        console.log("[Upload] Starting file upload handler")

        // Get the first file from the request
        const file = await request.file()

        if (!file) {
          console.error("[Upload] No file found in request")
          return reply.code(400).send({ error: "No file provided" })
        }

        const filename = file.filename
        let fileBuffer: Buffer

        try {
          fileBuffer = await file.toBuffer()
          console.log(
            `[Upload] ✓ File read: ${filename} (${fileBuffer.length} bytes)`
          )
        } catch (err) {
          console.error("[Upload] ✗ Failed to read file buffer:", err)
          return reply.code(400).send({ error: "Failed to read file" })
        }

        // Log file content preview
        const preview = fileBuffer.toString("utf-8").substring(0, 300)
        console.log(`[Upload] File content preview:\n${preview}`)

        // Now get the remaining form fields
        let projectId: string = ""
        let detailsStr: string = ""

        try {
          const parts = request.parts()
          for await (const part of parts) {
            if (part.type === "field") {
              const fieldValue = part.value as string
              console.log(`[Upload] Field: ${part.fieldname} = ${fieldValue}`)
              if (part.fieldname === "projectId") {
                projectId = fieldValue
              } else if (part.fieldname === "details") {
                detailsStr = fieldValue
              }
            }
          }
        } catch (err) {
          console.log(
            "[Upload] Note: No form fields found or error reading them, continuing..."
          )
        }

        // Determine file type and parse
        const fileType = path.extname(filename).toLowerCase()
        console.log(`[Upload] File type detected: ${fileType}`)

        let features: any[] = []

        try {
          features = await parseSpatialFile(fileBuffer, filename)

          console.log(`[Upload] ✓ Parser returned ${features.length} features`)

          if (features.length === 0) {
            console.warn("[Upload] ⚠ Parser returned 0 features")
            return reply.code(201).send({
              success: true,
              count: 0,
              features: [],
              message: "File parsed but contained no features",
            })
          }

          console.log(
            `[Upload] First feature: ${JSON.stringify(features[0]).substring(0, 200)}...`
          )

          // Create a parent feature for this upload (group all features from this file)
          const parentFeatureName = filename.replace(/\.[^/.]+$/, "")
          console.log(`[Upload] Creating parent feature: ${parentFeatureName}`)
          const parentFeature = await fastify.prisma.feature.create({
            data: {
              name: parentFeatureName,
              projectId: projectId || null,
              details: {
                uploadedFile: filename,
                uploadedAt: new Date().toISOString(),
                featureCount: features.length,
                ...(detailsStr && { uploadDetails: detailsStr }),
              },
            },
          })
          console.log(`[Upload] ✓ Parent feature created: ${parentFeature.id}`)

          // Save features
          const savedFeatures = []
          for (const feature of features) {
            try {
              const featureName =
                feature.name || feature.properties?.name || "Unnamed"
              const featureDetails = {
                ...feature.properties,
                ...(detailsStr && { uploadDetails: detailsStr }),
                // Store geometry in details since Unsupported type can't be written through Prisma
                geometry: feature.geometry,
              }

              console.log(`  → Creating feature: ${featureName}`)

              const saved = await fastify.prisma.feature.create({
                data: {
                  name: featureName,
                  projectId: projectId || null,
                  details: featureDetails || {},
                  parentId: parentFeature.id,
                },
              })

              console.log(`    ✓ Saved as ID: ${saved.id}`)
              savedFeatures.push(saved)
            } catch (featureErr) {
              console.error(`    ✗ Error creating feature:`, featureErr)
              throw featureErr
            }
          }

          console.log(
            `[Upload] ✓ SUCCESS: ${savedFeatures.length} features saved`
          )
          return reply.code(201).send({
            success: true,
            count: savedFeatures.length,
            features: savedFeatures,
          })
        } catch (parseErr) {
          console.error("[Upload] ✗ Error during parse/save:", parseErr)
          return reply.code(400).send({
            error: "Failed to process file",
            message:
              parseErr instanceof Error ? parseErr.message : "Unknown error",
          })
        }
      } catch (error) {
        console.error("[Upload] ✗ CRITICAL ERROR:", error)
        return reply.code(500).send({ error: "Internal server error" })
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
        const { name, geometry, details, parentId } = request.body as any

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
