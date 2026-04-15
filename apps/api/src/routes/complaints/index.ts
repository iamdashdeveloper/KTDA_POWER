import { FastifyInstance } from "fastify"

export default async function complaintsRoutes(fastify: FastifyInstance) {
  /**
   * POST /complaints
   * Create a new complaint
   */
  fastify.post<{
    Body: {
      parcelId: string
      ownerId: string
      complaintType: string
      title: string
      description: string
      severity?: string
      images?: string[]
    }
  }>("/complaints", async (request, reply) => {
    try {
      const {
        parcelId,
        ownerId,
        complaintType,
        title,
        description,
        severity = "medium",
        images = [],
      } = request.body

      const complaint = await fastify.prisma.complaint.create({
        data: {
          parcelId,
          ownerId,
          complaintType,
          title,
          description,
          severity,
          images,
          status: "open",
        },
        include: {
          parcel: true,
          owner: true,
        },
      })

      return reply.status(201).send(complaint)
    } catch (error) {
      console.error("Error creating complaint:", error)
      return reply.status(500).send({ error: "Failed to create complaint" })
    }
  })

  /**
   * GET /complaints
   * Get all complaints with optional filtering
   */
  fastify.get<{
    Querystring: {
      parcelId?: string
      ownerId?: string
      status?: string
      complaintType?: string
    }
  }>("/complaints", async (request, reply) => {
    try {
      const { parcelId, ownerId, status, complaintType } = request.query

      const complaints = await fastify.prisma.complaint.findMany({
        where: {
          ...(parcelId && { parcelId }),
          ...(ownerId && { ownerId }),
          ...(status && { status }),
          ...(complaintType && { complaintType }),
        },
        include: {
          parcel: true,
          owner: true,
          feedbacks: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return reply.send({ complaints })
    } catch (error) {
      console.error("Error fetching complaints:", error)
      return reply.status(500).send({ error: "Failed to fetch complaints" })
    }
  })

  /**
   * GET /complaints/:id
   * Get a single complaint with all feedback
   */
  fastify.get<{ Params: { id: string } }>(
    "/complaints/:id",
    async (request, reply) => {
      try {
        const { id } = request.params

        const complaint = await fastify.prisma.complaint.findUnique({
          where: { id },
          include: {
            parcel: true,
            owner: true,
            feedbacks: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        })

        if (!complaint) {
          return reply.status(404).send({ error: "Complaint not found" })
        }

        return reply.send(complaint)
      } catch (error) {
        console.error("Error fetching complaint:", error)
        return reply.status(500).send({ error: "Failed to fetch complaint" })
      }
    }
  )

  /**
   * PATCH /complaints/:id
   * Update complaint status and other fields
   */
  fastify.patch<{
    Params: { id: string }
    Body: any
  }>("/complaints/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const updates = request.body as any

      const complaint = await fastify.prisma.complaint.update({
        where: { id },
        data: {
          ...(updates.status && { status: updates.status }),
          ...(updates.severity && { severity: updates.severity }),
          ...(updates.title && { title: updates.title }),
          ...(updates.description && { description: updates.description }),
          ...(updates.images && { images: updates.images }),
          ...(updates.metadata && { metadata: updates.metadata }),
        },
        include: {
          parcel: true,
          owner: true,
          feedbacks: true,
        },
      })

      return reply.send(complaint)
    } catch (error) {
      console.error("Error updating complaint:", error)
      return reply.status(500).send({ error: "Failed to update complaint" })
    }
  })

  /**
   * POST /complaints/:id/feedback
   * Add feedback/comment to a complaint
   */
  fastify.post<{
    Params: { id: string }
    Body: {
      ownerId: string
      feedbackType: string
      message: string
      rating?: number
    }
  }>("/complaints/:id/feedback", async (request, reply) => {
    try {
      const { id } = request.params
      const { ownerId, feedbackType, message, rating } = request.body

      const feedback = await fastify.prisma.feedback.create({
        data: {
          complaintId: id,
          ownerId,
          feedbackType,
          message,
          rating,
        },
        include: {
          complaint: true,
          owner: true,
        },
      })

      return reply.status(201).send(feedback)
    } catch (error) {
      console.error("Error creating feedback:", error)
      return reply.status(500).send({ error: "Failed to create feedback" })
    }
  })
}
