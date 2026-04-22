import fp from "fastify-plugin"
import { FastifyRequest, FastifyReply } from "fastify"

/**
 * JWT Authentication Plugin
 * Validates JWT tokens and extracts user ID
 */
export default fp(async (fastify) => {
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        })
      }
    }
  )

  // Hook to set user ID on request
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify()
      // @ts-ignore
      request.userId = String(request.user.sub || request.user.id)
    } catch (err) {
      // Request doesn't have a valid token, continue
    }
  })
})

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
  }
}
