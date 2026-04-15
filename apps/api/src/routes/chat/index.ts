import { FastifyInstance } from "fastify"

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.get("/chat/rooms", async () => {
    return { message: "List chat rooms" }
  })

  fastify.post<{ Body: any }>("/chat/rooms", async (request) => {
    return { message: "Create chat room", body: request.body }
  })

  fastify.get<{ Params: { roomId: string } }>(
    "/chat/rooms/:roomId/messages",
    async (request) => {
      return { roomId: request.params.roomId }
    }
  )
}
