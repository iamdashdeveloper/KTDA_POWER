import { FastifyInstance } from "fastify"

export default async function feedbackRoutes(fastify: FastifyInstance) {
  /**
   * GET /feedback
   * Get all feedback with optional filtering
   */
  fastify.get<{
    Querystring: {
      complaintId?: string
      parcelId?: string
      ownerId?: string
      feedbackType?: string
    }
  }>("/feedback", async (request, reply) => {
    try {
      const { complaintId, parcelId, ownerId, feedbackType } = request.query

      const feedbacks = await fastify.prisma.feedback.findMany({
        where: {
          ...(complaintId && { complaintId }),
          ...(parcelId && { parcelId }),
          ...(ownerId && { ownerId }),
          ...(feedbackType && { feedbackType }),
        },
        include: {
          complaint: true,
          parcel: true,
          owner: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return reply.send({ feedbacks })
    } catch (error) {
      console.error("Error fetching feedback:", error)
      return reply.status(500).send({ error: "Failed to fetch feedback" })
    }
  })

  /**
   * GET /feedback/:id
   * Get a single feedback entry
   */
  fastify.get<{ Params: { id: string } }>(
    "/feedback/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        const feedback = await fastify.prisma.feedback.findUnique({
          where: { id },
          include: {
            complaint: true,
            parcel: true,
            owner: true,
          },
        })

        if (!feedback) {
          return reply.status(404).send({ error: "Feedback not found" })
        }

        return reply.send(feedback)
      } catch (error) {
        console.error("Error fetching feedback:", error)
        return reply.status(500).send({ error: "Failed to fetch feedback" })
      }
    }
  )

  /**
   * PATCH /feedback/:id
   * Update feedback (mainly for internal use like resolution updates)
   */
  fastify.patch<{
    Params: { id: string }
    Body: any
  }>("/feedback/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const updates = request.body as any

      const feedback = await fastify.prisma.feedback.update({
        where: { id },
        data: {
          ...(updates.message && { message: updates.message }),
          ...(updates.feedbackType && { feedbackType: updates.feedbackType }),
          ...(updates.rating && { rating: updates.rating }),
          ...(updates.metadata && { metadata: updates.metadata }),
        },
        include: {
          complaint: true,
          parcel: true,
          owner: true,
        },
      })

      return reply.send(feedback)
    } catch (error) {
      console.error("Error updating feedback:", error)
      return reply.status(500).send({ error: "Failed to update feedback" })
    }
  })

  /**
   * GET /feedback/stats
   * Get feedback statistics for dashboard
   */
  fastify.get("/feedback/stats", async (request, reply) => {
    try {
      const totalFeedback = await fastify.prisma.feedback.count()

      const byType = await fastify.prisma.feedback.groupBy({
        by: ["feedbackType"],
        _count: {
          id: true,
        },
      })

      const avgRating = await fastify.prisma.feedback.aggregate({
        _avg: {
          rating: true,
        },
      })

      return reply.send({
        totalFeedback,
        byType,
        averageRating: avgRating._avg.rating,
      })
    } catch (error) {
      console.error("Error fetching feedback stats:", error)
      return reply.status(500).send({ error: "Failed to fetch feedback stats" })
    }
  })
}
