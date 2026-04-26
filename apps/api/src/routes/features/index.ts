import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { parseSpatialFile } from "../../utils/spatial-parser.js"
import { postgisToGeoJSON } from "../../utils/geospatial.js"
import path from "path"

/**
 * Convert feature geometry to GeoJSON format
 */
function normalizeFeatureGeometry(feature: any): any {
  if (!feature) return feature

  return {
    ...feature,
    geometry: feature.geometry ? postgisToGeoJSON(feature.geometry) : null,
    subFeatures: feature.subFeatures
      ? feature.subFeatures.map((sf: any) => normalizeFeatureGeometry(sf))
      : undefined,
  }
}

export async function featuresRoutes(fastify: FastifyInstance) {
  // Get all features with geometry (returns child features grouped by parent)
  fastify.get(
    "/features",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Fetch all parent features (groups)
        const parentFeatures = (await fastify.prisma.$queryRaw`
          SELECT 
            id,
            "projectId",
            name,
            details,
            "createdAt",
            "parentId"
          FROM "Feature"
          WHERE "parentId" IS NULL
          ORDER BY "createdAt" DESC
        `) as any[]

        // Fetch all child features with geometry
        const childFeatures = (await fastify.prisma.$queryRaw`
          SELECT 
            id,
            "projectId",
            name,
            CASE 
              WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
              ELSE NULL
            END as geometry,
            details,
            "createdAt",
            images,
            "parentId"
          FROM "Feature"
          WHERE "parentId" IS NOT NULL
          AND geometry IS NOT NULL
          ORDER BY "createdAt" DESC
        `) as any[]

        console.log(
          `[Features] Fetched ${parentFeatures.length} parent groups and ${childFeatures.length} child features with geometry`
        )

        // Group child features by parent
        const featuresGroupedByParent = parentFeatures.map((parent) => {
          const children = childFeatures.filter(
            (child) => child.parentId === parent.id
          )

          console.log(
            `  Parent: "${parent.name}" (${parent.id}) → ${children.length} children with geometry`
          )

          return {
            ...parent,
            isGroup: true,
            children: children.map((child: any) => ({
              ...child,
              geometry: child.geometry
                ? typeof child.geometry === "string"
                  ? JSON.parse(child.geometry)
                  : child.geometry
                : null,
            })),
          }
        })

        return reply.send(featuresGroupedByParent)
      } catch (error) {
        console.error("[Features] Error fetching features:", error)
        return reply.code(500).send({ error: "Failed to fetch features" })
      }
    }
  )

  // Get all features for a specific project
  fastify.get<{ Params: { projectId: string } }>(
    "/projects/:projectId/features",
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params

        const features = (await fastify.prisma.$queryRaw`
          SELECT 
            f.id,
            f."projectId",
            f.name,
            CASE 
              WHEN f.geometry IS NOT NULL THEN ST_AsGeoJSON(f.geometry)::jsonb
              ELSE NULL
            END as geometry,
            f.details,
            f."createdAt",
            f.images,
            f."parentId",
            p.name as "parentName",
            COALESCE(p.name, f.name) as "groupName"
          FROM "Feature" f
          LEFT JOIN "Feature" p ON p.id = f."parentId"
          WHERE f."projectId" = ${projectId}
            AND f.geometry IS NOT NULL
          ORDER BY f."createdAt" DESC
        `) as any[]

        return reply.send(
          features.map((feature) => ({
            ...feature,
            geometry:
              feature.geometry && typeof feature.geometry === "string"
                ? JSON.parse(feature.geometry)
                : feature.geometry,
          }))
        )
      } catch (error) {
        console.error("[Features] Error fetching project features:", error)
        return reply
          .code(500)
          .send({ error: "Failed to fetch project features" })
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
        // Use raw SQL to get PostGIS geometry as GeoJSON
        const features = (await fastify.prisma.$queryRaw`
          SELECT 
            id,
            "projectId",
            name,
            CASE 
              WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
              ELSE NULL
            END as geometry,
            details,
            "createdAt",
            images,
            "parentId"
          FROM "Feature"
          WHERE id = ${request.params.id}
        `) as any[]

        if (features.length === 0) {
          return reply.code(404).send({ error: "Feature not found" })
        }

        const feature = features[0]

        // Fetch subfeatures
        const subFeatures = (await fastify.prisma.$queryRaw`
          SELECT 
            id,
            "projectId",
            name,
            CASE 
              WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
              ELSE NULL
            END as geometry,
            details,
            "createdAt",
            images,
            "parentId"
          FROM "Feature"
          WHERE "parentId" = ${request.params.id}
          ORDER BY "createdAt" DESC
        `) as any[]

        // Fetch parent feature if it exists
        let parent = null
        if (feature.parentId) {
          const parentFeatures = (await fastify.prisma.$queryRaw`
            SELECT 
              id,
              "projectId",
              name,
              CASE 
                WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
                ELSE NULL
              END as geometry,
              details,
              "createdAt",
              images,
              "parentId"
            FROM "Feature"
            WHERE id = ${feature.parentId}
          `) as any[]
          parent = parentFeatures.length > 0 ? parentFeatures[0] : null
        }

        return reply.send({
          ...feature,
          geometry: feature.geometry
            ? typeof feature.geometry === "string"
              ? JSON.parse(feature.geometry)
              : feature.geometry
            : null,
          parent: parent
            ? {
                ...parent,
                geometry: parent.geometry
                  ? typeof parent.geometry === "string"
                    ? JSON.parse(parent.geometry)
                    : parent.geometry
                  : null,
              }
            : null,
          subFeatures: subFeatures.map((sf: any) => ({
            ...sf,
            geometry: sf.geometry
              ? typeof sf.geometry === "string"
                ? JSON.parse(sf.geometry)
                : sf.geometry
              : null,
          })),
        })
      } catch (error) {
        console.error("[Features] Error fetching feature:", error)
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

        // Create feature without geometry first (since Prisma can't write to Unsupported type)
        const feature = await fastify.prisma.feature.create({
          data: {
            name,
            projectId,
            details: details || {},
            parentId: parentId || null,
          },
        })

        // Update geometry using raw SQL if provided
        if (geometry) {
          try {
            // Convert GeoJSON to PostGIS WKT format
            // ST_GeomFromGeoJSON accepts GeoJSON and stores as WKT internally
            const geomJson = JSON.stringify(geometry)
            await fastify.prisma.$executeRaw`
              UPDATE "Feature"
              SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
              WHERE id = ${feature.id}
            `
            console.log(
              `[Features] Geometry saved (as WKT) for feature: ${feature.id}`
            )
          } catch (geomErr) {
            console.warn(
              `[Features] Failed to save geometry for ${feature.id}:`,
              geomErr
            )
          }
        }

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

        // Read multipart form fields from the same parsed request
        let projectId: string = ""
        let detailsStr: string = ""

        const formFields = file.fields as Record<
          string,
          { value?: unknown } | undefined
        >
        const rawProjectId = formFields.projectId?.value
        const rawDetails = formFields.details?.value

        if (typeof rawProjectId === "string") {
          projectId = rawProjectId.trim()
        }

        if (typeof rawDetails === "string") {
          detailsStr = rawDetails
        }

        console.log(
          `[Upload] Parsed fields: projectId=${projectId || "<none>"}, detailsProvided=${detailsStr.length > 0}`
        )

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
              }

              console.log(`  → Creating feature: ${featureName}`)

              // First create the feature without geometry
              const saved = await fastify.prisma.feature.create({
                data: {
                  name: featureName,
                  projectId: projectId || null,
                  details: featureDetails || {},
                  parentId: parentFeature.id,
                },
              })

              console.log(`    ✓ Saved as ID: ${saved.id}`)

              // Now update the geometry using raw SQL if geometry exists
              if (feature.geometry) {
                try {
                  // Convert GeoJSON to PostGIS WKT format
                  // ST_GeomFromGeoJSON accepts GeoJSON and stores as WKT internally
                  const geomJson = JSON.stringify(feature.geometry)
                  await fastify.prisma.$executeRaw`
                    UPDATE "Feature"
                    SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
                    WHERE id = ${saved.id}
                  `
                  console.log(
                    `    ✓ Geometry saved (as WKT) for feature: ${saved.id}`
                  )
                } catch (geomErr) {
                  console.warn(
                    `    ⚠ Failed to save geometry for ${saved.id}:`,
                    geomErr
                  )
                  // Continue even if geometry fails
                }
              }

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

        // Update non-geometry fields with Prisma
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (details !== undefined) updateData.details = details
        if (parentId !== undefined) updateData.parentId = parentId
        if (projectId !== undefined) updateData.projectId = projectId

        const feature = await fastify.prisma.feature.update({
          where: { id: request.params.id },
          data: updateData,
        })

        // Update geometry separately using raw SQL if provided
        if (geometry !== undefined) {
          try {
            const geomJson = JSON.stringify(geometry)
            await fastify.prisma.$executeRaw`
              UPDATE "Feature"
              SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
              WHERE id = ${request.params.id}
            `
            console.log(
              `[Features] Geometry updated (as WKT) for feature: ${request.params.id}`
            )
          } catch (geomErr) {
            console.warn(
              `[Features] Failed to update geometry for ${request.params.id}:`,
              geomErr
            )
            // Continue - the feature was updated even if geometry failed
          }
        }

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
