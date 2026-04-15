import { FastifyInstance } from "fastify"

export default async function ownersRoutes(fastify: FastifyInstance) {
  /**
   * POST /owners
   * Create a new owner
   */
  fastify.post<{
    Body: { name: string; email: string; phone?: string; address?: string }
  }>("/owners", async (request, reply) => {
    try {
      const { name, email, phone, address } = request.body

      // Check if owner already exists
      const existingOwner = await fastify.prisma.owner.findUnique({
        where: { email },
      })

      if (existingOwner) {
        return reply
          .status(400)
          .send({ error: "Owner with this email already exists" })
      }

      const owner = await fastify.prisma.owner.create({
        data: {
          name,
          email,
          phone,
          address,
        },
      })

      return reply.status(201).send(owner)
    } catch (error) {
      console.error("Error creating owner:", error)
      return reply.status(500).send({ error: "Failed to create owner" })
    }
  })

  /**
   * GET /owners
   * Get all owners with their parcels and complaints
   */
  fastify.get("/owners", async (request, reply) => {
    try {
      const owners = await fastify.prisma.owner.findMany({
        include: {
          parcels: true,
          complaints: {
            include: {
              parcel: true,
            },
          },
          feedbacks: true,
        },
      })

      return reply.send({ owners })
    } catch (error) {
      console.error("Error fetching owners:", error)
      return reply.status(500).send({ error: "Failed to fetch owners" })
    }
  })

  /**
   * GET /owners/:id
   * Get a single owner with all their data
   */
  fastify.get<{ Params: { id: string } }>(
    "/owners/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        const owner = await fastify.prisma.owner.findUnique({
          where: { id },
          include: {
            parcels: {
              include: {
                complaints: {
                  include: {
                    feedbacks: true,
                  },
                },
              },
            },
            complaints: {
              include: {
                parcel: true,
                feedbacks: true,
              },
            },
            feedbacks: true,
          },
        })

        if (!owner) {
          return reply.status(404).send({ error: "Owner not found" })
        }

        return reply.send(owner)
      } catch (error) {
        console.error("Error fetching owner:", error)
        return reply.status(500).send({ error: "Failed to fetch owner" })
      }
    }
  )

  /**
   * PATCH /owners/:id
   * Update owner information
   */
  fastify.patch<{ Params: { id: string }; Body: any }>(
    "/owners/:id",
    async (request, reply) => {
      try {
        const { id } = request.params
        const updates = request.body as any

        const owner = await fastify.prisma.owner.update({
          where: { id },
          data: {
            ...(updates.name && { name: updates.name }),
            ...(updates.email && { email: updates.email }),
            ...(updates.phone && { phone: updates.phone }),
            ...(updates.address && { address: updates.address }),
            ...(updates.metadata && { metadata: updates.metadata }),
          },
        })

        return reply.send(owner)
      } catch (error) {
        console.error("Error updating owner:", error)
        return reply.status(500).send({ error: "Failed to update owner" })
      }
    }
  )
}
