import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"

export default async function complaintsRoutes(fastify: FastifyInstance) {
  /**
   * POST /complaints
   * Create a new complaint (USSD API)
   *
   * Required fields:
   * - phoneNumber: string - Reporter's phone number
   * - complaintType: string - Type of complaint (e.g., "water shortage", "low pressure", etc)
   * - description: string - Detailed description of the issue
   * - name: string - Reporter's name
   * - projectId: string - Associated hydro project
   *
   * Optional fields:
   * - plotNumber: string - Plot/property number affected
   * - severity: string - "low" | "medium" | "high" (default: "medium")
   */
  fastify.post<{
    Body: {
      phoneNumber: string
      complaintType: string
      description: string
      name: string
      projectId: string
      plotNumber?: string
      severity?: string
    }
  }>(
    "/complaints",
    async (
      request: FastifyRequest<{
        Body: {
          phoneNumber: string
          complaintType: string
          description: string
          name: string
          projectId: string
          plotNumber?: string
          severity?: string
        }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          phoneNumber,
          complaintType,
          description,
          name,
          projectId,
          plotNumber,
          severity = "medium",
        } = request.body

        // Validate required fields
        if (
          !phoneNumber ||
          !complaintType ||
          !description ||
          !name ||
          !projectId
        ) {
          return reply.status(400).send({
            error:
              "Missing required fields: phoneNumber, complaintType, description, name, projectId",
          })
        }

        const complaint = await fastify.prisma.complaint.create({
          data: {
            phoneNumber,
            complaintType,
            description,
            name,
            projectId,
            plotNumber: plotNumber || null,
            severity,
            status: "open",
            metadata: {
              createdVia: "USSD",
              timestamp: new Date().toISOString(),
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        })

        return reply.status(201).send({
          success: true,
          complaintId: complaint.id,
          message: "Complaint submitted successfully",
          complaint,
        })
      } catch (error) {
        console.error("Error creating complaint:", error)
        return reply.status(500).send({
          error: "Failed to create complaint",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * GET /complaints
   * Get all complaints with optional filtering
   *
   * Query parameters:
   * - phoneNumber?: string - Filter by reporter's phone number
   * - projectId?: string - Filter by project
   * - status?: string - Filter by status (open, closed, pending)
   * - complaintType?: string - Filter by complaint type
   */
  fastify.get<{
    Querystring: {
      phoneNumber?: string
      projectId?: string
      status?: string
      complaintType?: string
    }
  }>(
    "/complaints",
    async (
      request: FastifyRequest<{
        Querystring: {
          phoneNumber?: string
          projectId?: string
          status?: string
          complaintType?: string
        }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { phoneNumber, projectId, status, complaintType } = request.query

        const complaints = await fastify.prisma.complaint.findMany({
          where: {
            ...(phoneNumber && { phoneNumber }),
            ...(projectId && { projectId }),
            ...(status && { status }),
            ...(complaintType && { complaintType }),
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            feedbacks: {
              orderBy: {
                createdAt: "desc",
              },
              take: 5, // Latest 5 feedbacks
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })

        return reply.send({
          success: true,
          count: complaints.length,
          complaints,
        })
      } catch (error) {
        console.error("Error fetching complaints:", error)
        return reply.status(500).send({
          error: "Failed to fetch complaints",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * GET /complaints/:id
   * Get a single complaint with all feedback
   */
  fastify.get<{ Params: { id: string } }>(
    "/complaints/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params

        const complaint = await fastify.prisma.complaint.findUnique({
          where: { id },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            feedbacks: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        })

        if (!complaint) {
          return reply.status(404).send({
            error: "Complaint not found",
          })
        }

        return reply.send({
          success: true,
          complaint,
        })
      } catch (error) {
        console.error("Error fetching complaint:", error)
        return reply.status(500).send({
          error: "Failed to fetch complaint",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * GET /complaints/phone/:phoneNumber
   * Get all complaints for a specific phone number (USSD API)
   */
  fastify.get<{ Params: { phoneNumber: string } }>(
    "/complaints/phone/:phoneNumber",
    async (
      request: FastifyRequest<{ Params: { phoneNumber: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { phoneNumber } = request.params

        const complaints = await fastify.prisma.complaint.findMany({
          where: { phoneNumber },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            feedbacks: {
              take: 3,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })

        return reply.send({
          success: true,
          phoneNumber,
          count: complaints.length,
          complaints,
        })
      } catch (error) {
        console.error("Error fetching complaints by phone:", error)
        return reply.status(500).send({
          error: "Failed to fetch complaints",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * PATCH /complaints/:id
   * Update complaint status and other fields
   *
   * Allowed updates:
   * - status: "open" | "pending" | "closed"
   * - severity: "low" | "medium" | "high"
   * - description: string
   * - name: string
   */
  fastify.patch<{
    Params: { id: string }
    Body: {
      status?: string
      severity?: string
      description?: string
      name?: string
    }
  }>(
    "/complaints/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string }
        Body: {
          status?: string
          severity?: string
          description?: string
          name?: string
        }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params
        const { status, severity, description, name } = request.body

        const complaint = await fastify.prisma.complaint.update({
          where: { id },
          data: {
            ...(status && { status }),
            ...(severity && { severity }),
            ...(description && { description }),
            ...(name && { name }),
            metadata: {
              ...(
                await fastify.prisma.complaint.findUnique({
                  where: { id },
                  select: { metadata: true },
                })
              )?.metadata,
              lastUpdated: new Date().toISOString(),
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            feedbacks: {
              take: 5,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        })

        return reply.send({
          success: true,
          message: "Complaint updated successfully",
          complaint,
        })
      } catch (error) {
        console.error("Error updating complaint:", error)
        return reply.status(500).send({
          error: "Failed to update complaint",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * DELETE /complaints/:id
   * Delete a complaint
   */
  fastify.delete<{ Params: { id: string } }>(
    "/complaints/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params

        await fastify.prisma.complaint.delete({
          where: { id },
        })

        return reply.send({
          success: true,
          message: "Complaint deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting complaint:", error)
        if (error instanceof Error && error.message.includes("P2025")) {
          return reply.status(404).send({
            error: "Complaint not found",
          })
        }
        return reply.status(500).send({
          error: "Failed to delete complaint",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * POST /complaints/:id/feedback
   * Add feedback/comment to a complaint
   *
   * Body:
   * - feedbackType: string - Type of feedback (e.g., "update", "resolution", "note")
   * - message: string - Feedback message
   * - rating?: number - Optional rating (1-5)
   */
  fastify.post<{
    Params: { id: string }
    Body: {
      feedbackType: string
      message: string
      rating?: number
    }
  }>(
    "/complaints/:id/feedback",
    async (
      request: FastifyRequest<{
        Params: { id: string }
        Body: {
          feedbackType: string
          message: string
          rating?: number
        }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params
        const { feedbackType, message, rating } = request.body

        // Validate complaint exists
        const complaint = await fastify.prisma.complaint.findUnique({
          where: { id },
        })

        if (!complaint) {
          return reply.status(404).send({
            error: "Complaint not found",
          })
        }

        const feedback = await fastify.prisma.feedback.create({
          data: {
            complaintId: id,
            feedbackType,
            message,
            ...(rating && { rating }),
          },
        })

        return reply.status(201).send({
          success: true,
          message: "Feedback added successfully",
          feedback,
        })
      } catch (error) {
        console.error("Error creating feedback:", error)
        return reply.status(500).send({
          error: "Failed to create feedback",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * GET /complaints/:id/feedbacks
   * Get all feedbacks for a complaint
   */
  fastify.get<{ Params: { id: string } }>(
    "/complaints/:id/feedbacks",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params

        const feedbacks = await fastify.prisma.feedback.findMany({
          where: { complaintId: id },
          orderBy: {
            createdAt: "desc",
          },
        })

        return reply.send({
          success: true,
          complaintId: id,
          count: feedbacks.length,
          feedbacks,
        })
      } catch (error) {
        console.error("Error fetching feedbacks:", error)
        return reply.status(500).send({
          error: "Failed to fetch feedbacks",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  /**
   * GET /complaints/project/:projectId
   * Get all complaints for a specific project
   */
  fastify.get<{ Params: { projectId: string } }>(
    "/complaints/project/:projectId",
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params

        const complaints = await fastify.prisma.complaint.findMany({
          where: { projectId },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            feedbacks: {
              take: 2,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })

        // Calculate statistics
        const stats = {
          total: complaints.length,
          byStatus: {
            open: complaints.filter((c: any) => c.status === "open").length,
            pending: complaints.filter((c: any) => c.status === "pending")
              .length,
            closed: complaints.filter((c: any) => c.status === "closed").length,
          },
          bySeverity: {
            low: complaints.filter((c: any) => c.severity === "low").length,
            medium: complaints.filter((c: any) => c.severity === "medium")
              .length,
            high: complaints.filter((c: any) => c.severity === "high").length,
          },
        }

        return reply.send({
          success: true,
          projectId,
          stats,
          complaints,
        })
      } catch (error) {
        console.error("Error fetching project complaints:", error)
        return reply.status(500).send({
          error: "Failed to fetch complaints",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
