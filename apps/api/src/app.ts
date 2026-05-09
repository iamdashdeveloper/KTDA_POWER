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
import { hydroModelsRoutes } from "./routes/hydro-models/index.js"
import { ussdService } from "./services/ussdService.js"

import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function createApp() {
  const fastify = Fastify({
    logger: env.NODE_ENV === "development",
    bodyLimit: 52428800,
  })

  // =========================
  // CORS (SINGLE SOURCE OF TRUTH)
  // =========================
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean)

  // Helper to check if origin is allowed (handles wildcards)
  const isOriginAllowed = (origin: string): boolean => {
    return allowedOrigins.some((allowed) => {
      if (allowed === "*") return true
      // Handle wildcards like https://*.onrender.com
      if (allowed.includes("*")) {
        const pattern = allowed.replace(/\./g, "\\.").replace(/\*/g, "[^/]+")
        const regex = new RegExp(`^${pattern}$`)
        return regex.test(origin)
      }
      return origin === allowed
    })
  }

  await fastify.register(cors, {
    origin: (origin, callback) => {
      console.log(`[CORS] Request from: ${origin || "same-origin"}`)

      // allow server-to-server / mobile apps / curl
      if (!origin) return callback(null, true)

      if (isOriginAllowed(origin)) {
        return callback(null, true)
      }

      console.warn(`[CORS] Blocked origin: ${origin}`)
      return callback(new Error("Not allowed by CORS"), false)
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: false, // Don't require credentials for CORS
    allowedHeaders: ["Content-Type", "Authorization"],
  })

  // =========================
  // BODY PARSERS
  // =========================
  fastify.addContentTypeParser("image/*", async (_req: any, payload: any) => {
    const chunks: Buffer[] = []
    for await (const chunk of payload) chunks.push(chunk)
    return Buffer.concat(chunks)
  })

  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ]

  for (const type of imageTypes) {
    fastify.addContentTypeParser(type, async (_req: any, payload: any) => {
      const chunks: Buffer[] = []
      for await (const chunk of payload) chunks.push(chunk)
      return Buffer.concat(chunks)
    })
  }

  // =========================
  // CORE PLUGINS
  // =========================
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  })

  await fastify.register(cookie)

  await fastify.register(multipart, {
    limits: { fileSize: 52428800 },
  })

  await fastify.register(prismPlugin)
  await fastify.register(errorHandler)
  await fastify.register(authPlugin)

  // =========================
  // STATIC FILES
  // =========================
  try {
    const publicPath = path.join(__dirname, "../public")

    await fastify.register(staticPlugin, {
      root: publicPath,
      prefix: "/",
    })
  } catch {
    console.log("Public directory not found")
  }

  // =========================
  // HEALTH / DEBUG
  // =========================
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() }
  })

  fastify.get("/debug", async (request) => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: env.NODE_ENV,
        PORT: env.PORT,
        HOST: env.HOST,
      },
      requestInfo: {
        origin: request.headers.origin,
        referer: request.headers.referer,
        userAgent: request.headers["user-agent"],
      },
      corsConfig: allowedOrigins,
    }
  })

  // =========================
  // ROUTES
  // =========================
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
  await fastify.register(hydroModelsRoutes)
  await fastify.register(ussdService)

  return fastify
}
