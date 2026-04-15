import { FastifyInstance } from "fastify"

interface CreateRoleBody {
  name: string
  description?: string
  companyId?: string
}

interface UpdateRoleBody {
  name?: string
  description?: string
}

interface AssignPermissionBody {
  slug: string
}

export async function rbacRoutes(fastify: FastifyInstance) {
  // GET /rbac/roles - List all roles
  fastify.get("/rbac/roles", async (request, reply) => {
    try {
      const roles = await fastify.prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      })

      return {
        roles: roles.map((role: any) => ({
          ...role,
          id: role.id.toString(),
          companyId: role.companyId?.toString() || null,
          permissions: role.permissions.map((rp: any) => ({
            ...rp,
            roleId: rp.roleId.toString(),
            permissionId: rp.permissionId.toString(),
            permission: {
              ...rp.permission,
              id: rp.permission.id.toString(),
            },
          })),
        })),
      }
    } catch (error) {
      reply.status(500).send({
        error: "Failed to fetch roles",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // POST /rbac/roles - Create a new role
  fastify.post<{ Body: CreateRoleBody }>(
    "/rbac/roles",
    async (request, reply) => {
      try {
        console.log("Creating role with body:", request.body)
        const { name, description, companyId } = request.body

        if (!name || name.trim() === "") {
          return reply.status(400).send({
            error: "Validation error",
            message: "Role name is required",
          })
        }

        // Convert companyId to BigInt if provided
        let parsedCompanyId: bigint | null = null
        if (companyId) {
          try {
            parsedCompanyId = BigInt(companyId)
          } catch (e) {
            console.error("Error converting companyId:", e)
            return reply.status(400).send({
              error: "Validation error",
              message: "Invalid companyId format",
            })
          }
        }

        // Build data object, only including optional fields if provided
        const roleData: any = {
          name: name.trim(),
        }

        if (description && description.trim()) {
          roleData.description = description.trim()
        }

        if (parsedCompanyId) {
          roleData.companyId = parsedCompanyId
        }

        const role = await fastify.prisma.role.create({
          data: roleData,
        })

        console.log("Role created successfully:", role)

        return {
          id: role.id.toString(),
          name: role.name,
          description: role.description,
          companyId: role.companyId?.toString() || null,
        }
      } catch (error) {
        console.error("Error creating role - Full error:", error)
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error"
        const errorCode = (error as any)?.code
        reply.status(500).send({
          error: "Failed to create role",
          message: errorMessage,
          code: errorCode,
        })
      }
    }
  )

  // GET /rbac/roles/:id - Get a specific role with permissions
  fastify.get<{ Params: { id: string } }>(
    "/rbac/roles/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        const role = await fastify.prisma.role.findUnique({
          where: { id: BigInt(id) },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        })

        if (!role) {
          return reply.status(404).send({
            error: "Not found",
            message: "Role not found",
          })
        }

        return {
          ...role,
          id: role.id.toString(),
          companyId: role.companyId?.toString() || null,
          permissions: role.permissions.map((rp: any) => ({
            ...rp,
            roleId: rp.roleId.toString(),
            permissionId: rp.permissionId.toString(),
            permission: {
              ...rp.permission,
              id: rp.permission.id.toString(),
            },
          })),
        }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch role",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // PUT /rbac/roles/:id - Update a role
  fastify.put<{ Params: { id: string }; Body: UpdateRoleBody }>(
    "/rbac/roles/:id",
    async (request, reply) => {
      try {
        const { id } = request.params
        const { name, description } = request.body

        const role = await fastify.prisma.role.update({
          where: { id: BigInt(id) },
          data: {
            name: name || undefined,
            description: description !== undefined ? description : undefined,
          },
        })

        return {
          id: role.id.toString(),
          name: role.name,
          description: role.description,
          companyId: role.companyId?.toString() || null,
        }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update role",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /rbac/roles/:id - Delete a role
  fastify.delete<{ Params: { id: string } }>(
    "/rbac/roles/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        // Delete all RolePermission associations first
        await fastify.prisma.rolePermission.deleteMany({
          where: { roleId: BigInt(id) },
        })

        // Then delete the role
        await fastify.prisma.role.delete({
          where: { id: BigInt(id) },
        })

        return { success: true }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to delete role",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /rbac/roles/:id/permissions - Assign permission to a role
  fastify.post<{ Params: { id: string }; Body: AssignPermissionBody }>(
    "/rbac/roles/:id/permissions",
    async (request, reply) => {
      try {
        const { id } = request.params
        const { slug } = request.body

        if (!slug) {
          return reply.status(400).send({
            error: "Validation error",
            message: "Permission slug is required",
          })
        }

        // Find or create the permission
        let permission = await fastify.prisma.permission.findUnique({
          where: { slug },
        })

        if (!permission) {
          permission = await fastify.prisma.permission.create({
            data: {
              slug,
              alias: slug,
            },
          })
        }

        // Create the role-permission association
        const rolePermission = await fastify.prisma.rolePermission.create({
          data: {
            roleId: BigInt(id),
            permissionId: permission.id,
          },
        })

        return {
          roleId: rolePermission.roleId.toString(),
          permissionId: rolePermission.permissionId.toString(),
          slug: permission.slug,
        }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to assign permission",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /rbac/roles/:id/permissions/:permissionId - Remove permission from a role
  fastify.delete<{ Params: { id: string; permissionId: string } }>(
    "/rbac/roles/:id/permissions/:permissionId",
    async (request, reply) => {
      try {
        const { id, permissionId } = request.params

        await fastify.prisma.rolePermission.deleteMany({
          where: {
            roleId: BigInt(id),
            permissionId: BigInt(permissionId),
          },
        })

        return { success: true }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to remove permission",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
