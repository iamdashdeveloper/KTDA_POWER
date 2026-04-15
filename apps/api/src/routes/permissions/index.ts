import { FastifyInstance } from "fastify"

interface CreatePermissionBody {
  slug: string
  alias: string
  description?: string
}

export async function permissionsRoutes(fastify: FastifyInstance) {
  // GET /permissions - List all permissions
  fastify.get("/permissions", async () => {
    try {
      const permissions = await fastify.prisma.permission.findMany({
        select: {
          id: true,
          slug: true,
          alias: true,
        },
      })

      return permissions.map((p: any) => ({
        id: p.id.toString(),
        slug: p.slug,
        alias: p.alias,
      }))
    } catch (error) {
      return {
        error: "Failed to fetch permissions",
        message: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  // GET /permissions/:id - Get permission by ID
  fastify.get<{ Params: { id: string } }>(
    "/permissions/:id",
    async (request, reply) => {
      try {
        const permission = await fastify.prisma.permission.findUnique({
          where: { id: BigInt(request.params.id) },
        })

        if (!permission) {
          return reply.status(404).send({
            error: "Permission not found",
          })
        }

        return {
          ...permission,
          id: permission.id.toString(),
        }
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to fetch permission",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /permissions - Create permission
  fastify.post<{ Body: CreatePermissionBody }>(
    "/permissions",
    async (request, reply) => {
      try {
        const { slug, alias, description } = request.body

        if (!slug || slug.trim().length === 0) {
          return reply.status(400).send({
            error: "Permission slug is required",
          })
        }

        if (!alias || alias.trim().length === 0) {
          return reply.status(400).send({
            error: "Permission alias is required",
          })
        }

        // Check if permission already exists
        const existing = await fastify.prisma.permission.findUnique({
          where: { slug },
        })

        if (existing) {
          return reply.status(409).send({
            error: "Permission already exists",
            slug,
          })
        }

        const permission = await fastify.prisma.permission.create({
          data: {
            slug: slug.trim(),
            alias: alias.trim(),
          },
        })

        return reply.status(201).send({
          id: permission.id.toString(),
          slug: permission.slug,
          alias: permission.alias,
          message: "Permission created successfully!",
        })
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to create permission",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // PUT /permissions/:id - Update permission
  fastify.put<{ Params: { id: string }; Body: Partial<CreatePermissionBody> }>(
    "/permissions/:id",
    async (request, reply) => {
      try {
        const { alias, description } = request.body

        const permission = await fastify.prisma.permission.update({
          where: { id: BigInt(request.params.id) },
          data: {
            ...(alias && { alias }),
          },
        })

        return reply.send({
          ...permission,
          id: permission.id.toString(),
        })
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to update permission",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /permissions/:id - Delete permission
  fastify.delete<{ Params: { id: string } }>(
    "/permissions/:id",
    async (request, reply) => {
      try {
        await fastify.prisma.permission.delete({
          where: { id: BigInt(request.params.id) },
        })

        return reply.send({
          message: "Permission deleted successfully!",
        })
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to delete permission",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
