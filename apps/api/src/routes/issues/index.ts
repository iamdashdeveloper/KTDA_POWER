import { FastifyInstance } from "fastify"

interface CreateIssueBody {
  title: string
  description?: string
  projectId: string
  featureId?: string
  priority: number
  status?: string
  location?: {
    latitude: number
    longitude: number
  }
  images?: string[]
  metadata?: Record<string, unknown>
}

interface UpdateIssueBody {
  title?: string
  description?: string
  priority?: number
  status?: string
  images?: string[]
  metadata?: Record<string, unknown>
}

interface CreateIssueUpdateBody {
  content: string
  images?: string[]
  statusChange?: string
}

export async function issuesRoutes(fastify: FastifyInstance) {
  // GET /issues - List all issues (admin)
  fastify.get("/issues", async (request, reply) => {
    try {
      const issues = await fastify.prisma.issue.findMany({
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      })

      return issues
    } catch (error) {
      reply.status(500).send({
        error: "Failed to fetch issues",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET /projects/:projectId/issues - Get issues for a specific project
  fastify.get<{ Params: { projectId: string } }>(
    "/projects/:projectId/issues",
    async (request, reply) => {
      try {
        const { projectId } = request.params

        // Verify project exists
        const project = await fastify.prisma.project.findUnique({
          where: { id: projectId },
        })

        if (!project) {
          return reply.status(404).send({ error: "Project not found" })
        }

        const issues = await fastify.prisma.issue.findMany({
          where: { projectId },
          include: {
            updates: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        })

        return issues
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch project issues",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // GET /projects/:projectId/issues/map - Get issues for map rendering
  fastify.get<{ Params: { projectId: string } }>(
    "/projects/:projectId/issues/map",
    async (request, reply) => {
      try {
        const { projectId } = request.params

        const issues = (await fastify.prisma.$queryRaw`
          SELECT 
            id,
            "projectId",
            "featureId",
            title,
            status,
            priority,
            images,
            "createdAt",
            description,
            CASE 
              WHEN location IS NOT NULL THEN ST_AsGeoJSON(location)::jsonb
              ELSE NULL
            END as location,
            metadata
          FROM "Issue"
          WHERE "projectId" = ${projectId}
          ORDER BY "createdAt" DESC
        `) as any[]

        return reply.send(
          issues.map((issue) => ({
            ...issue,
            location:
              issue.location && typeof issue.location === "string"
                ? JSON.parse(issue.location)
                : issue.location,
          }))
        )
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch project issues",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // GET /issues/:id - Get issue by ID
  fastify.get<{ Params: { id: string } }>(
    "/issues/:id",
    async (request, reply) => {
      try {
        const issue = await fastify.prisma.issue.findUnique({
          where: { id: request.params.id },
          include: {
            project: { select: { id: true, name: true } },
            updates: {
              orderBy: { createdAt: "desc" },
            },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        })

        if (!issue) {
          return reply.status(404).send({ error: "Issue not found" })
        }

        return issue
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch issue",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /issues - Create new issue
  fastify.post<{ Body: CreateIssueBody }>("/issues", async (request, reply) => {
    try {
      const {
        title,
        description,
        projectId,
        featureId,
        priority,
        status = "OPEN",
        location,
        images = [],
        metadata = {},
      } = request.body

      // Validation
      if (!title || title.trim().length === 0) {
        return reply.status(400).send({
          error: "Issue title is required",
        })
      }

      if (!projectId) {
        return reply.status(400).send({
          error: "Project ID is required",
        })
      }

      // Verify project exists
      const project = await fastify.prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
        })
      }

      // Create issue with PostGIS geometry
      if (
        location &&
        location.latitude !== undefined &&
        location.longitude !== undefined
      ) {
        try {
          // Use raw SQL for PostGIS geometry only, let Prisma handle the rest
          const issueId = crypto.randomUUID()

          await fastify.prisma.$executeRaw`
            INSERT INTO "Issue" (
              id,
              title,
              description,
              "projectId",
              "featureId",
              priority,
              status,
              location,
              "createdAt"
            )
            VALUES (
              ${issueId},
              ${title.trim()},
              ${description?.trim() || null},
              ${projectId},
              ${featureId || null},
              ${priority},
              ${status},
              ST_SetSRID(ST_Point(${location.longitude}, ${location.latitude}), 4326),
              NOW()
            )
          `

          // Update with images and metadata using Prisma (handles array/JSON properly)
          const newIssue = await fastify.prisma.issue.update({
            where: { id: issueId },
            data: {
              images: images && images.length > 0 ? images : [],
              metadata: metadata || {},
            },
          })

          reply.status(201).send(newIssue)
        } catch (error) {
          console.error("Failed to create issue with location:", error)
          reply.status(500).send({
            error: "Failed to create issue",
            message: error instanceof Error ? error.message : "Unknown error",
          })
        }
      } else {
        // Create without location
        const newIssue = await fastify.prisma.issue.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            projectId,
            featureId: featureId || null,
            priority,
            status,
            images: images && images.length > 0 ? images : [],
            metadata: metadata || {},
          },
        })

        reply.status(201).send(newIssue)
      }
    } catch (error) {
      console.error("Failed to create issue:", error)
      reply.status(500).send({
        error: "Failed to create issue",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // PUT /issues/:id - Update issue
  fastify.put<{ Params: { id: string }; Body: UpdateIssueBody }>(
    "/issues/:id",
    async (request, reply) => {
      try {
        const { id } = request.params
        const { title, description, priority, status, images, metadata } =
          request.body

        // Verify issue exists
        const issue = await fastify.prisma.issue.findUnique({
          where: { id },
        })

        if (!issue) {
          return reply.status(404).send({ error: "Issue not found" })
        }

        const updated = await fastify.prisma.issue.update({
          where: { id },
          data: {
            ...(title && { title: title.trim() }),
            ...(description !== undefined && {
              description: description?.trim() || null,
            }),
            ...(priority !== undefined && { priority }),
            ...(status && { status }),
            ...(images && { images }),
            ...(metadata && { metadata }),
          },
        })

        reply.send(updated)
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update issue",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /issues/:id - Delete issue
  fastify.delete<{ Params: { id: string } }>(
    "/issues/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        // Verify issue exists
        const issue = await fastify.prisma.issue.findUnique({
          where: { id },
        })

        if (!issue) {
          return reply.status(404).send({ error: "Issue not found" })
        }

        // Delete related records first
        await fastify.prisma.issueUpdate.deleteMany({
          where: { issueId: id },
        })

        await fastify.prisma.issueAssignment.deleteMany({
          where: { issueId: id },
        })

        // Then delete the issue
        const deleted = await fastify.prisma.issue.delete({
          where: { id },
        })

        reply.send(deleted)
      } catch (error) {
        reply.status(500).send({
          error: "Failed to delete issue",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /issues/:id/updates - Add issue update/note
  fastify.post<{
    Params: { id: string }
    Body: CreateIssueUpdateBody
  }>("/issues/:id/updates", async (request, reply) => {
    try {
      const { id } = request.params
      const { content, images = [], statusChange } = request.body

      try {
        await request.jwtVerify()
      } catch {
        return reply.status(401).send({ error: "Unauthorized" })
      }

      const userId = String(
        (request.user as any)?.sub || (request.user as any)?.id || ""
      )

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" })
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return reply.status(401).send({ error: "User not found" })
      }

      // Verify issue exists
      const issue = await fastify.prisma.issue.findUnique({
        where: { id },
      })

      if (!issue) {
        return reply.status(404).send({ error: "Issue not found" })
      }

      // If status is being changed, update the issue
      if (statusChange) {
        await fastify.prisma.issue.update({
          where: { id },
          data: { status: statusChange },
        })
      }

      // Create the update/note
      const update = await fastify.prisma.issueUpdate.create({
        data: {
          issueId: id,
          userId,
          content: content.trim(),
          images,
          statusChange: statusChange || null,
        },
      })

      reply.status(201).send(update)
    } catch (error) {
      reply.status(500).send({
        error: "Failed to create issue update",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // POST /issues/:id/assign - Assign issue to user
  fastify.post<{
    Params: { id: string }
    Body: { userId: string }
  }>("/issues/:id/assign", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      // Verify issue and user exist
      const issue = await fastify.prisma.issue.findUnique({
        where: { id },
      })

      if (!issue) {
        return reply.status(404).send({ error: "Issue not found" })
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return reply.status(404).send({ error: "User not found" })
      }

      // Check if already assigned
      const existing = await fastify.prisma.issueAssignment.findUnique({
        where: {
          issueId_userId: {
            issueId: id,
            userId,
          },
        },
      })

      if (existing) {
        return reply.status(400).send({
          error: "User already assigned to this issue",
        })
      }

      const assignment = await fastify.prisma.issueAssignment.create({
        data: {
          issueId: id,
          userId,
        },
      })

      reply.status(201).send(assignment)
    } catch (error) {
      reply.status(500).send({
        error: "Failed to assign issue",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // DELETE /issues/:id/assign/:userId - Unassign issue from user
  fastify.delete<{
    Params: { id: string; userId: string }
  }>("/issues/:id/assign/:userId", async (request, reply) => {
    try {
      const { id, userId } = request.params

      await fastify.prisma.issueAssignment.deleteUnique({
        where: {
          issueId_userId: {
            issueId: id,
            userId,
          },
        },
      })

      reply.send({ success: true })
    } catch (error) {
      reply.status(500).send({
        error: "Failed to unassign issue",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
