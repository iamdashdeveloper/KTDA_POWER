// src/plugins/prisma.ts
import fp from "fastify-plugin"
import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

export default fp(async (fastify) => {
  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool)

  // Instantiate PrismaClient with adapter (required in Prisma 7)
  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  })

  fastify.decorate("prisma", prisma)

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect()
  })
})
