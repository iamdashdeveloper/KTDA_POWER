import { FastifyInstance } from "fastify"

export async function articlesRoutes(fastify: FastifyInstance) {
  fastify.get("/articles", async () => {
    return { message: "List articles" }
  })

  fastify.get<{ Params: { id: string } }>("/articles/:id", async (request) => {
    return { id: request.params.id }
  })

  fastify.post<{ Body: any }>("/articles", async (request) => {
    return { message: "Create article", body: request.body }
  })

  fastify.put<{ Params: { id: string }; Body: any }>(
    "/articles/:id",
    async (request) => {
      return { id: request.params.id, body: request.body }
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    "/articles/:id",
    async (request) => {
      return { id: request.params.id }
    }
  )
}
