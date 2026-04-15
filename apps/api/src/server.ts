import { createApp } from "./app.js"
import { env } from "./config/env.js"

async function start() {
  try {
    const fastify = await createApp()

    await fastify.listen({ port: env.PORT, host: env.HOST })

    console.log(`🚀 Server running at http://${env.HOST}:${env.PORT}`)
    console.log(`Environment: ${env.NODE_ENV}`)
  } catch (err) {
    console.error("Failed to start server:", err)
    process.exit(1)
  }
}

start()

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully")
  process.exit(0)
})
