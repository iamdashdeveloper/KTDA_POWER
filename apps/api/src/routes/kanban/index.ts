import { FastifyInstance } from "fastify"

export async function kanbanRoutes(fastify: FastifyInstance) {
  fastify.get("/kanban/columns", async () => {
    return { message: "List kanban columns" }
  })

  fastify.post<{ Body: any }>("/kanban/columns", async (request) => {
    return { message: "Create kanban column", body: request.body }
  })

  fastify.get("/kanban/activities", async () => {
    return { message: "List activities" }
  })
}
