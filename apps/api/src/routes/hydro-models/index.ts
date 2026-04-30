import { FastifyInstance } from "fastify"

interface CreateHydroModelBody {
  name: string
  description?: string | null
  parentModelId?: string
}

export async function hydroModelsRoutes(fastify: FastifyInstance) {
  // Create a new hydro model
  fastify.post<{ Body: CreateHydroModelBody }>(
    "/hydro-models",
    async (request, reply) => {
      try {
        const { name, description, parentModelId } = request.body

        if (!name || name.trim().length === 0) {
          return reply.status(400).send({
            error: "Model name is required",
          })
        }

        const hydroModel = await fastify.prisma.hydroModel.create({
          data: {
            name: name.trim(),
            description: description ? description.trim() : null,
            parentModelId: parentModelId || null,
          },
        })

        return reply.status(201).send(hydroModel)
      } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
          error: "Failed to create hydro model",
        })
      }
    }
  )

  // Get all hydro models
  fastify.get("/hydro-models", async (request, reply) => {
    try {
      const hydroModels = await fastify.prisma.hydroModel.findMany({
        include: {
          objects: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return reply.status(200).send(hydroModels)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to fetch hydro models",
      })
    }
  })

  // Get hydro model by ID
  fastify.get<{ Params: { id: string } }>(
    "/hydro-models/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        const hydroModel = await fastify.prisma.hydroModel.findUnique({
          where: { id },
          include: {
            objects: true,
          },
        })

        if (!hydroModel) {
          return reply.status(404).send({
            error: "Hydro model not found",
          })
        }

        return reply.status(200).send(hydroModel)
      } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
          error: "Failed to fetch hydro model",
        })
      }
    }
  )

  // Update hydro model
  fastify.patch<{
    Params: { id: string }
    Body: Partial<CreateHydroModelBody>
  }>("/hydro-models/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { name, description, parentModelId } = request.body

      const hydroModel = await fastify.prisma.hydroModel.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && {
            description: description ? description.trim() : null,
          }),
          ...(parentModelId !== undefined && { parentModelId }),
        },
      })

      return reply.status(200).send(hydroModel)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: "Failed to update hydro model",
      })
    }
  })

  // Delete hydro model
  fastify.delete<{ Params: { id: string } }>(
    "/hydro-models/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        await fastify.prisma.hydroModel.delete({
          where: { id },
        })

        return reply.status(200).send({
          message: "Hydro model deleted successfully",
        })
      } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
          error: "Failed to delete hydro model",
        })
      }
    }
  )
}
