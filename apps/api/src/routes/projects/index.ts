import { FastifyInstance } from "fastify"

interface CreateProjectBody {
  name: string
  description?: string
  companyId: string
  location?: {
    latitude: number
    longitude: number
  }
  metadata?: Record<string, unknown>
  status?: string
  images?: string[]
}

interface UpdateProjectBody {
  name?: string
  description?: string
  location?: {
    latitude: number
    longitude: number
  } | null
  metadata?: Record<string, unknown>
  status?: string
  images?: string[]
}

interface ProjectRow {
  id: string
  name: string
  description: string | null
  metadata: Record<string, unknown> | null
  status: string | null
  images: string[]
  companyId: string
  latitude: number | null
  longitude: number | null
}

function mapProjectRow(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    metadata: row.metadata,
    status: row.status,
    images: row.images,
    companyId: row.companyId,
    location:
      row.latitude !== null && row.longitude !== null
        ? {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          }
        : null,
  }
}

function isValidLocation(
  location:
    | {
        latitude: number
        longitude: number
      }
    | null
    | undefined
) {
  if (!location) {
    return false
  }

  const latitude = Number(location.latitude)
  const longitude = Number(location.longitude)

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

export async function projectsRoutes(fastify: FastifyInstance) {
  const getProjectById = async (id: string) => {
    const rows = (await fastify.prisma.$queryRaw`
      SELECT
        id,
        name,
        description,
        metadata,
        status,
        images,
        "companyId",
        CASE WHEN location IS NOT NULL THEN ST_Y(location) ELSE NULL END AS latitude,
        CASE WHEN location IS NOT NULL THEN ST_X(location) ELSE NULL END AS longitude
      FROM "Project"
      WHERE id = ${id}
      LIMIT 1
    `) as ProjectRow[]

    return rows[0] ?? null
  }

  // GET /projects - List all projects
  fastify.get("/projects", async (request, reply) => {
    try {
      const projects = (await fastify.prisma.$queryRaw`
        SELECT
          id,
          name,
          description,
          metadata,
          status,
          images,
          "companyId",
          CASE WHEN location IS NOT NULL THEN ST_Y(location) ELSE NULL END AS latitude,
          CASE WHEN location IS NOT NULL THEN ST_X(location) ELSE NULL END AS longitude
        FROM "Project"
        ORDER BY "createdAt" DESC
      `) as ProjectRow[]

      return projects.map(mapProjectRow)
    } catch (error) {
      reply.status(500).send({
        error: "Failed to fetch projects",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET /projects/:id - Get project by ID
  fastify.get<{ Params: { id: string } }>(
    "/projects/:id",
    async (request, reply) => {
      try {
        const row = await getProjectById(request.params.id)

        if (!row) {
          return reply.status(404).send({ error: "Project not found" })
        }

        return mapProjectRow(row)
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch project",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /projects - Create project
  fastify.post<{ Body: CreateProjectBody }>(
    "/projects",
    async (request, reply) => {
      try {
        const {
          name,
          description,
          companyId,
          metadata,
          status,
          images,
          location,
        } = request.body

        // Log incoming request for debugging
        console.log("[POST /projects] Incoming request body:", {
          name,
          description,
          companyId,
          metadata,
          status,
          images,
          location,
        })

        if (!name || name.trim().length === 0) {
          return reply.status(400).send({
            error: "Project name is required",
          })
        }

        if (!companyId) {
          return reply.status(400).send({
            error: "Company ID is required",
          })
        }

        if (location !== undefined && !isValidLocation(location)) {
          return reply.status(400).send({
            error: "Invalid project location",
          })
        }

        const projectData: any = {
          name: name.trim(),
          description: description?.trim() || null,
          companyId: companyId,
          metadata: metadata || {},
          status: status || null,
          images: images || [],
        }

        const project = await fastify.prisma.project.create({
          data: projectData,
        })

        if (location && isValidLocation(location)) {
          await fastify.prisma.$executeRaw`
            UPDATE "Project"
            SET location = ST_SetSRID(ST_Point(${location.longitude}, ${location.latitude}), 4326)
            WHERE id = ${project.id}
          `
        }

        const createdProject = await getProjectById(project.id)
        if (!createdProject) {
          return reply.status(500).send({
            error: "Failed to fetch created project",
          })
        }

        return reply.status(201).send(mapProjectRow(createdProject))
      } catch (error) {
        console.error("[POST /projects] Error creating project:", error)
        reply.status(500).send({
          error: "Failed to create project",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // PUT /projects/:id - Update project
  fastify.put<{ Params: { id: string }; Body: UpdateProjectBody }>(
    "/projects/:id",
    async (request, reply) => {
      try {
        const { name, description, metadata, status, images, location } =
          request.body

        if (
          location !== undefined &&
          location !== null &&
          !isValidLocation(location)
        ) {
          return reply.status(400).send({
            error: "Invalid project location",
          })
        }

        const updateData: any = {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(metadata !== undefined && { metadata }),
          ...(status !== undefined && { status }),
          ...(images !== undefined && { images }),
        }

        await fastify.prisma.project.update({
          where: { id: request.params.id },
          data: updateData,
        })

        if (location !== undefined) {
          if (location === null) {
            await fastify.prisma.$executeRaw`
              UPDATE "Project"
              SET location = NULL
              WHERE id = ${request.params.id}
            `
          } else {
            await fastify.prisma.$executeRaw`
              UPDATE "Project"
              SET location = ST_SetSRID(ST_Point(${location.longitude}, ${location.latitude}), 4326)
              WHERE id = ${request.params.id}
            `
          }
        }

        const updatedProject = await getProjectById(request.params.id)
        if (!updatedProject) {
          return reply.status(404).send({ error: "Project not found" })
        }

        return reply.send(mapProjectRow(updatedProject))
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update project",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // PATCH /projects/:id - Partially update project
  fastify.patch<{ Params: { id: string }; Body: UpdateProjectBody }>(
    "/projects/:id",
    async (request, reply) => {
      try {
        const { name, description, metadata, status, images, location } =
          request.body

        if (
          location !== undefined &&
          location !== null &&
          !isValidLocation(location)
        ) {
          return reply.status(400).send({
            error: "Invalid project location",
          })
        }

        const updateData: any = {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(metadata !== undefined && { metadata }),
          ...(status !== undefined && { status }),
          ...(images !== undefined && { images }),
        }

        await fastify.prisma.project.update({
          where: { id: request.params.id },
          data: updateData,
        })

        if (location !== undefined) {
          if (location === null) {
            await fastify.prisma.$executeRaw`
              UPDATE "Project"
              SET location = NULL
              WHERE id = ${request.params.id}
            `
          } else {
            await fastify.prisma.$executeRaw`
              UPDATE "Project"
              SET location = ST_SetSRID(ST_Point(${location.longitude}, ${location.latitude}), 4326)
              WHERE id = ${request.params.id}
            `
          }
        }

        const updatedProject = await getProjectById(request.params.id)
        if (!updatedProject) {
          return reply.status(404).send({ error: "Project not found" })
        }

        return reply.send(mapProjectRow(updatedProject))
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update project",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /projects/:id - Delete project
  fastify.delete<{ Params: { id: string } }>(
    "/projects/:id",
    async (request, reply) => {
      const { id } = request.params
      try {
        // Fetch all related entities' IDs to delete their child relations first
        const [features, activities, issues, chatRooms, complaints] = await Promise.all([
          fastify.prisma.feature.findMany({ where: { projectId: id }, select: { id: true } }),
          fastify.prisma.activity.findMany({ where: { projectId: id }, select: { id: true } }),
          fastify.prisma.issue.findMany({ where: { projectId: id }, select: { id: true } }),
          fastify.prisma.chatRoom.findMany({ where: { projectId: id }, select: { id: true } }),
          fastify.prisma.complaint.findMany({ where: { projectId: id }, select: { id: true } }),
        ])

        const featureIds = features.map((f: any) => f.id)
        const activityIds = activities.map((a: any) => a.id)
        const issueIds = issues.map((i: any) => i.id)
        const chatRoomIds = chatRooms.map((c: any) => c.id)
        const complaintIds = complaints.map((c: any) => c.id)

        // Execute robust cascading delete within a Prisma transaction
        await fastify.prisma.$transaction(async (tx: any) => {
          // 1. Delete ActivityUser mappings
          if (activityIds.length > 0) {
            await tx.activityUser.deleteMany({
              where: { activityId: { in: activityIds } },
            })
          }

          // 2. Delete Activities
          await tx.activity.deleteMany({
            where: { projectId: id },
          })

          // 3. Delete KanbanColumns
          await tx.kanbanColumn.deleteMany({
            where: { projectId: id },
          })

          // 4. Delete IssueAssignments & IssueUpdates
          if (issueIds.length > 0) {
            await tx.issueAssignment.deleteMany({
              where: { issueId: { in: issueIds } },
            })
            await tx.issueUpdate.deleteMany({
              where: { issueId: { in: issueIds } },
            })
          }

          // 5. Delete Issues
          await tx.issue.deleteMany({
            where: { projectId: id },
          })

          // 6. Delete MaintenanceSchedules
          if (featureIds.length > 0) {
            await tx.maintenanceSchedule.deleteMany({
              where: { featureId: { in: featureIds } },
            })
          }

          // 7. Delete Features (cascade child features first by targeting roots, then remaining)
          await tx.feature.deleteMany({
            where: { projectId: id, parentId: null },
          })
          await tx.feature.deleteMany({
            where: { projectId: id },
          })

          // 8. Delete Chat Messages & Participants
          if (chatRoomIds.length > 0) {
            await tx.message.deleteMany({
              where: { roomId: { in: chatRoomIds } },
            })
            await tx.chatParticipant.deleteMany({
              where: { roomId: { in: chatRoomIds } },
            })
          }

          // 9. Delete ChatRooms
          await tx.chatRoom.deleteMany({
            where: { projectId: id },
          })

          // 10. Delete Feedbacks & Complaints
          if (complaintIds.length > 0) {
            await tx.feedback.deleteMany({
              where: { complaintId: { in: complaintIds } },
            })
          }
          await tx.complaint.deleteMany({
            where: { projectId: id },
          })

          // 11. Delete Articles
          await tx.article.deleteMany({
            where: { projectId: id },
          })

          // 12. Delete ProjectMembers
          await tx.projectMember.deleteMany({
            where: { projectId: id },
          })

          // 13. Finally delete the Project itself
          await tx.project.delete({
            where: { id },
          })
        })

        return reply.send({ message: "Project deleted successfully" })
      } catch (error) {
        console.error("Error in transaction project deletion:", error)
        reply.status(500).send({
          error: "Failed to delete project",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
