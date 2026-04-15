import { FastifyInstance } from "fastify"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../..", "public", "uploads")

async function ensureUploadsDir() {
  try {
    await fs.access(uploadsDir)
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true })
  }
}

export async function uploadsRoutes(fastify: FastifyInstance) {
  // Initialize uploads directory
  await ensureUploadsDir()

  // POST /upload - Upload image file
  fastify.post<{ Body: Buffer }>("/upload", async (request, reply) => {
    try {
      const contentType = request.headers["content-type"]

      if (!contentType?.startsWith("image/")) {
        return reply.status(400).send({
          error: "Only image files are allowed",
        })
      }

      // Extract file extension from content-type
      const ext = contentType.split("/")[1].split(";")[0]
      if (!["jpeg", "jpg", "png", "gif", "webp"].includes(ext)) {
        return reply.status(400).send({
          error: "Unsupported image format",
        })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const filename = `img-${timestamp}-${random}.${ext === "jpeg" ? "jpg" : ext}`

      // Save file
      const filePath = path.join(uploadsDir, filename)
      await fs.writeFile(filePath, request.body)

      // Return URL path
      const url = `/uploads/${filename}`

      return reply.status(200).send({
        url: url,
        filename: filename,
        path: filePath,
      })
    } catch (error) {
      return reply.status(500).send({
        error: "Failed to upload image",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
