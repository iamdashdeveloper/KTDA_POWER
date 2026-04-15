import { FastifyInstance } from "fastify"

export async function maintenanceRoutes(fastify: FastifyInstance) {
  fastify.get("/maintenance/schedules", async () => {
    return { message: "List maintenance schedules" }
  })

  fastify.post<{ Body: any }>("/maintenance/schedules", async (request) => {
    return { message: "Create maintenance schedule", body: request.body }
  })
}
