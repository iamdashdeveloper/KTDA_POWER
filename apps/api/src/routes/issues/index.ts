import { FastifyInstance } from "fastify"

export async function issuesRoutes(fastify: FastifyInstance) {
  fastify.get("/issues", async () => {
    return { message: "List issues endpoint" }
  })

  fastify.get<{ Params: { id: string } }>("/issues/:id", async (request) => {
    return { id: request.params.id }
  })

  fastify.post<{ Body: any }>("/issues", async (request) => {
    return { message: "Create issue endpoint", body: request.body }
  })

  fastify.put<{ Params: { id: string }; Body: any }>(
    "/issues/:id",
    async (request) => {
      return { id: request.params.id, body: request.body }
    }
  )

  fastify.delete<{ Params: { id: string } }>("/issues/:id", async (request) => {
    return { id: request.params.id }
  })
}
