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
  }
  metadata?: Record<string, unknown>
  status?: string
  images?: string[]
}

export async function projectsRoutes(fastify: FastifyInstance) {
  // GET /projects - List all projects
  fastify.get("/projects", async (request, reply) => {
    try {
      const projects = await fastify.prisma.project.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          images: true,
        },
      })

      return projects
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
        const project = await fastify.prisma.project.findUnique({
          where: { id: request.params.id },
          select: {
            id: true,
            name: true,
            description: true,
            metadata: true,
            status: true,
            images: true,
            companyId: true,
          },
        })

        if (!project) {
          return reply.status(404).send({ error: "Project not found" })
        }

        return project
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
        const { name, description, companyId, metadata, status, images } =
          request.body

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

        return reply.status(201).send(project)
      } catch (error) {
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

        const updateData: any = {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(metadata && { metadata }),
          ...(status && { status }),
          ...(images && { images }),
          // Note: PostGIS geometry fields (location) cannot be updated directly through Prisma
          // They require raw SQL queries. Location updates should be handled separately if needed.
        }

        const project = await fastify.prisma.project.update({
          where: { id: request.params.id },
          data: updateData,
        })

        return reply.send(project)
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

        const updateData: any = {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(metadata && { metadata }),
          ...(status && { status }),
          ...(images && { images }),
          // Note: PostGIS geometry fields (location) cannot be updated directly through Prisma
          // They require raw SQL queries. Location updates should be handled separately if needed.
        }

        const project = await fastify.prisma.project.update({
          where: { id: request.params.id },
          data: updateData,
        })

        return reply.send(project)
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
      try {
        await fastify.prisma.project.delete({
          where: { id: request.params.id },
        })

        return reply.send({ message: "Project deleted successfully" })
      } catch (error) {
        reply.status(500).send({
          error: "Failed to delete project",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
