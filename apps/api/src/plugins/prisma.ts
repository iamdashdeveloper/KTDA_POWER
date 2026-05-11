// src/plugins/prisma.ts
import fp from "fastify-plugin"
import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

export default fp(async (fastify) => {
  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Limit connections in dev
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Return error if connection takes > 5s
  })

  // Handle pool errors to prevent process crashes
  pool.on("error", (err) => {
    console.error("[Postgres Pool Error]", err.message)
  })

  // Verify connection on startup
  try {
    const client = await pool.connect()
    await client.query("SELECT 1")
    client.release()
    console.log("[Database] Connection pool initialized and verified")
  } catch (err) {
    console.error("[Database] Initial connection failed:", err)
  }

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
