import { FastifyInstance } from "fastify"

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: any }>("/auth/login", async (request) => {
    return { message: "Login endpoint", body: request.body }
  })

  fastify.post<{ Body: any }>("/auth/register", async (request) => {
    return { message: "Register endpoint", body: request.body }
  })

  fastify.post("/auth/refresh", async () => {
    return { message: "Refresh token endpoint" }
  })
}
