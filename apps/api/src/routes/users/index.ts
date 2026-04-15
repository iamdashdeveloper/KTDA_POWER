import { FastifyInstance } from "fastify"

interface CreateUserBody {
  email: string
  password: string
  firstName: string
  lastName: string
  position: string
  companyId: string
  bio?: string
  avatarUrl?: string
}

interface UpdateUserBody {
  email?: string
  firstName?: string
  lastName?: string
  position?: string
  bio?: string
  avatarUrl?: string
}

export async function usersRoutes(fastify: FastifyInstance) {
  // GET /users - List all users
  fastify.get("/users", async (request, reply) => {
    try {
      const users = await fastify.prisma.user.findMany({
        include: {
          company: true,
          roles: {
            include: {
              role: {
                include: {
                  company: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return { users }
    } catch (error) {
      reply.status(500).send({
        error: "Failed to fetch users",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET /users/:id - Get user by ID
  fastify.get<{ Params: { id: string } }>(
    "/users/:id",
    async (request, reply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.params.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            position: true,
            bio: true,
            avatarUrl: true,
            isEmailVerified: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            createdAt: true,
          },
        })

        if (!user) {
          return reply.status(404).send({
            error: "Not found",
            message: "User not found",
          })
        }

        return {
          ...user,
          id: user.id.toString(),
          company: {
            ...user.company,
            id: user.company.id.toString(),
          },
        }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch user",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /users - Create user
  fastify.post<{ Body: CreateUserBody }>("/users", async (request, reply) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        position,
        companyId,
        bio,
        avatarUrl,
      } = request.body

      // Validate required fields
      if (
        !email ||
        !password ||
        !firstName ||
        !lastName ||
        !position ||
        !companyId
      ) {
        return reply.status(400).send({
          error: "Validation error",
          message:
            "Missing required fields: email, password, firstName, lastName, position, companyId",
        })
      }

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return reply.status(409).send({
          error: "Conflict",
          message: "User with this email already exists",
        })
      }

      const user = await fastify.prisma.user.create({
        data: {
          email,
          password, // In production, this should be hashed
          firstName,
          lastName,
          position,
          companyId,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          position: true,
          bio: true,
          avatarUrl: true,
          isEmailVerified: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
        },
      })

      return user
    } catch (error) {
      reply.status(500).send({
        error: "Failed to create user",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // PUT /users/:id - Update user
  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>(
    "/users/:id",
    async (request, reply) => {
      try {
        const { id } = request.params
        const { email, firstName, lastName, position, bio, avatarUrl } =
          request.body

        const user = await fastify.prisma.user.update({
          where: { id },
          data: {
            email: email || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            position: position || undefined,
            bio: bio !== undefined ? bio : undefined,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            position: true,
            bio: true,
            avatarUrl: true,
            isEmailVerified: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            createdAt: true,
          },
        })

        return user
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update user",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /users/:id - Delete user
  fastify.delete<{ Params: { id: string } }>(
    "/users/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        await fastify.prisma.user.delete({
          where: { id },
        })

        return { success: true }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to delete user",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // GET /users/:id/roles - Get user roles
  fastify.get<{ Params: { id: string } }>(
    "/users/:id/roles",
    async (request, reply) => {
      try {
        const { id } = request.params

        const userRoles = await fastify.prisma.userRole.findMany({
          where: { userId: id },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        })

        return userRoles.map((ur: any) => {
          const rolePermissions = (ur.role.permissions || []).map(
            (rp: any) => ({
              roleId: rp.roleId,
              permissionId: rp.permissionId,
              permission: {
                id: rp.permission.id,
                slug: rp.permission.slug,
                alias: rp.permission.alias,
              },
            })
          )

          return {
            userId: ur.userId,
            roleId: ur.roleId,
            role: {
              id: ur.role.id,
              name: ur.role.name,
              description: ur.role.description,
              companyId: ur.role.companyId || null,
              permissions: rolePermissions,
            },
          }
        })
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch user roles",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /users/:id/roles - Assign role to user
  fastify.post<{ Params: { id: string }; Body: { roleId: string } }>(
    "/users/:id/roles",
    async (request, reply) => {
      try {
        const { id } = request.params
        const { roleId } = request.body

        if (!roleId) {
          return reply.status(400).send({
            error: "Validation error",
            message: "roleId is required",
          })
        }

        // Check if user already has this role
        const existingUserRole = await fastify.prisma.userRole.findUnique({
          where: {
            userId_roleId: {
              userId: id,
              roleId,
            },
          },
        })

        if (existingUserRole) {
          return reply.status(409).send({
            error: "Conflict",
            message: "User already has this role assigned",
          })
        }

        const userRole = await fastify.prisma.userRole.create({
          data: {
            userId: id,
            roleId,
          },
        })

        return {
          userId: userRole.userId,
          roleId: userRole.roleId,
          success: true,
        }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to assign role",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /users/:id/roles/:roleId - Remove role from user
  fastify.delete<{ Params: { id: string; roleId: string } }>(
    "/users/:id/roles/:roleId",
    async (request, reply) => {
      try {
        const { id, roleId } = request.params

        await fastify.prisma.userRole.deleteMany({
          where: {
            userId: id,
            roleId,
          },
        })

        return { success: true }
      } catch (error) {
        reply.status(500).send({
          error: "Failed to remove role",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
