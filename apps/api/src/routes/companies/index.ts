import { FastifyInstance } from "fastify"

interface CreateCompanyBody {
  name: string
  description?: string
  location?: {
    latitude: number
    longitude: number
  }
  metadata?: Record<string, unknown>
  images?: string[]
}

interface UpdateCompanyBody {
  name?: string
  description?: string
  location?: {
    latitude: number
    longitude: number
  }
  metadata?: Record<string, unknown>
  images?: string[]
}

export async function companiesRoutes(fastify: FastifyInstance) {
  // GET /companies - List all companies
  fastify.get("/companies", async (request, reply) => {
    try {
      const companies = await fastify.prisma.company.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          images: true,
        },
      })

      // Convert BigInt to string for JSON serialization
      return companies
    } catch (error) {
      reply.status(500).send({
        error: "Failed to fetch companies",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // GET /companies/:id - Get company by ID
  fastify.get<{ Params: { id: string } }>(
    "/companies/:id",
    async (request, reply) => {
      try {
        const company = await fastify.prisma.company.findUnique({
          where: { id: request.params.id },
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })

        if (!company) {
          return reply.status(404).send({
            error: "Company not found",
          })
        }

        // Convert BigInt to string for JSON serialization
        return company
      } catch (error) {
        reply.status(500).send({
          error: "Failed to fetch company",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // POST /companies - Create company
  fastify.post<{ Body: CreateCompanyBody }>(
    "/companies",
    async (request, reply) => {
      try {
        const { name, description, location, metadata, images } = request.body

        if (!name || name.trim().length === 0) {
          return reply.status(400).send({
            error: "Company name is required",
          })
        }

        const companyData: any = {
          name: name.trim(),
          description: description?.trim() || null,
          metadata: metadata || {},
          images: images || [],
        }

        // Handle location with PostGIS
        if (
          location &&
          location.latitude !== undefined &&
          location.longitude !== undefined
        ) {
          try {
            await fastify.prisma.$executeRaw`
            INSERT INTO "Company" (name, description, metadata, images, location, "createdAt")
            VALUES (
              ${companyData.name},
              ${companyData.description},
              ${JSON.stringify(companyData.metadata)}::jsonb,
              ${JSON.stringify(companyData.images)}::text[],
              ST_SetSRID(ST_Point(${location.longitude}, ${location.latitude}), 4326),
              NOW()
            )
          `

            return reply.status(201).send({
              message: "Company created successfully!",
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
            })
          } catch (err) {
            // Fallback: create without location
            const company = await fastify.prisma.company.create({
              data: companyData,
            })

            return reply.status(201).send({
              id: company.id,
              name: company.name,
              message: "Company created successfully (without location)!",
            })
          }
        }

        // Create without location
        const company = await fastify.prisma.company.create({
          data: companyData,
        })

        return reply.status(201).send({
          id: company.id,
          name: company.name,
          message: "Company created successfully!",
        })
      } catch (error) {
        reply.status(500).send({
          error: "Failed to create company",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // PUT /companies/:id - Update company
  fastify.put<{ Params: { id: string }; Body: UpdateCompanyBody }>(
    "/companies/:id",
    async (request, reply) => {
      try {
        const { name, description, metadata, location, images } = request.body

        const company = await fastify.prisma.company.update({
          where: { id: request.params.id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(metadata && { metadata }),
            ...(location && { location }),
            ...(images && { images }),
          },
        })

        return reply.send(company)
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update company",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // PATCH /companies/:id - Partially update company
  fastify.patch<{ Params: { id: string }; Body: UpdateCompanyBody }>(
    "/companies/:id",
    async (request, reply) => {
      try {
        const { name, description, metadata, location, images } = request.body

        const updateData: any = {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(metadata && { metadata }),
          ...(location && { location }),
          ...(images && { images }),
        }

        const company = await fastify.prisma.company.update({
          where: { id: request.params.id },
          data: updateData,
        })

        return reply.send(company)
      } catch (error) {
        reply.status(500).send({
          error: "Failed to update company",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )

  // DELETE /companies/:id - Delete company
  fastify.delete<{ Params: { id: string } }>(
    "/companies/:id",
    async (request, reply) => {
      try {
        await fastify.prisma.company.delete({
          where: { id: request.params.id },
        })

        return reply.send({ message: "Company deleted successfully" })
      } catch (error) {
        reply.status(500).send({
          error: "Failed to delete company",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
  )
}
