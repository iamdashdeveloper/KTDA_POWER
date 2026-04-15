import fp from "fastify-plugin"
import { FastifyError, FastifyRequest, FastifyReply } from "fastify"

interface CustomError extends FastifyError {
  statusCode: number
  code: string
  message: string
}

export default fp(async (fastify) => {
  fastify.setErrorHandler(
    (error: CustomError, request: FastifyRequest, reply: FastifyReply) => {
      const statusCode = error.statusCode || 500
      const code = error.code || "INTERNAL_ERROR"
      const message = error.message || "An unexpected error occurred"

      fastify.log.error({
        err: error,
        request: {
          method: request.method,
          url: request.url,
        },
      })

      reply.status(statusCode).send({
        error: {
          code,
          message,
          statusCode,
        },
      })
    }
  )
})
