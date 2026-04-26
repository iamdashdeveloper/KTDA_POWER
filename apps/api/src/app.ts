import Fastify from "fastify"
import cors from "@fastify/cors"
import jwt from "@fastify/jwt"
import cookie from "@fastify/cookie"
import staticPlugin from "@fastify/static"
import multipart from "@fastify/multipart"
import { env } from "./config/env.js"
import prismPlugin from "./plugins/prisma.js"
import errorHandler from "./plugins/error-handler.js"
import authPlugin from "./plugins/auth.js"

// Routes
import { companiesRoutes } from "./routes/companies/index.js"
import { usersRoutes } from "./routes/users/index.js"
import { projectsRoutes } from "./routes/projects/index.js"
import { featuresRoutes } from "./routes/features/index.js"
import { issuesRoutes } from "./routes/issues/index.js"
import { authRoutes } from "./routes/auth/index.js"
import { kanbanRoutes } from "./routes/kanban/index.js"
import { maintenanceRoutes } from "./routes/maintenance/index.js"
import { chatRoutes } from "./routes/chat/index.js"
import { notificationsRoutes } from "./routes/notifications/index.js"
import { articlesRoutes } from "./routes/articles/index.js"
import { rbacRoutes } from "./routes/rbac/index.js"
import { permissionsRoutes } from "./routes/permissions/index.js"
import { uploadsRoutes } from "./routes/uploads/index.js"
import cadastreRoutes from "./routes/cadastre/index.js"
import parcelsRoutes from "./routes/parcels/index.js"
import ownersRoutes from "./routes/owners/index.js"
import complaintsRoutes from "./routes/complaints/index.js"
import feedbackRoutes from "./routes/feedback/index.js"
import { ussdService } from "./services/ussdService.js"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function createApp() {
  const fastify = Fastify({
    logger: env.NODE_ENV === "development",
    bodyLimit: 52428800, // 50MB limit for file uploads
  })

  // Register plugins
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })

  // Add content-type parser for binary image data
  fastify.addContentTypeParser(
    "image/*",
    async (request: any, payload: any) => {
      const chunks: Buffer[] = []
      for await (const chunk of payload) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    }
  )

  // Also register specific image types for better compatibility
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ]
  for (const imageType of imageTypes) {
    fastify.addContentTypeParser(
      imageType,
      async (request: any, payload: any) => {
        const chunks: Buffer[] = []
        for await (const chunk of payload) {
          chunks.push(chunk)
        }
        return Buffer.concat(chunks)
      }
    )
  }

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  })

  await fastify.register(cookie)

  await fastify.register(multipart, {
    limits: {
      fileSize: 52428800, // 50MB limit for file uploads
    },
  })

  await fastify.register(prismPlugin)
  await fastify.register(errorHandler)
  await fastify.register(authPlugin)

  // Register static file serving for uploads
  try {
    const publicPath = path.join(__dirname, "../public")
    await fastify.register(staticPlugin, {
      root: publicPath,
      prefix: "/",
    })
  } catch (err) {
    // Directory might not exist yet, that's okay
    console.log("Public directory not found, will be created on first upload")
  }

  // Health check
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() }
  })

  // Register all routes
  await fastify.register(authRoutes)
  await fastify.register(uploadsRoutes)
  await fastify.register(companiesRoutes)
  await fastify.register(usersRoutes)
  await fastify.register(projectsRoutes)
  await fastify.register(featuresRoutes)
  await fastify.register(issuesRoutes)
  await fastify.register(kanbanRoutes)
  await fastify.register(maintenanceRoutes)
  await fastify.register(chatRoutes)
  await fastify.register(notificationsRoutes)
  await fastify.register(articlesRoutes)
  await fastify.register(rbacRoutes)
  await fastify.register(permissionsRoutes)
  await fastify.register(cadastreRoutes)
  await fastify.register(parcelsRoutes)
  await fastify.register(ownersRoutes)
  await fastify.register(complaintsRoutes)
  await fastify.register(feedbackRoutes)
  await fastify.register(ussdService)

  return fastify
}
