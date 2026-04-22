import { PrismaClient } from "@prisma/client"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string
      PORT?: string
      HOST?: string
      NODE_ENV?: "development" | "production" | "test"
      JWT_SECRET?: string
      JWT_EXPIRATION?: string
      CORS_ORIGIN?: string
    }
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient
  }

  interface FastifyRequest {
    userId?: string
  }
}

export {}
