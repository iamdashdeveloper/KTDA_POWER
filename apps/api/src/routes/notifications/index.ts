import { FastifyInstance } from "fastify"

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get("/notifications", async () => {
    return { message: "List notifications" }
  })

  fastify.put<{ Params: { id: string } }>(
    "/notifications/:id/read",
    async (request) => {
      return { id: request.params.id }
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    "/notifications/:id",
    async (request) => {
      return { id: request.params.id }
    }
  )
}
