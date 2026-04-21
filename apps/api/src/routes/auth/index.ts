import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import bcrypt from "bcryptjs"
import { SignupSchema, LoginSchema, OnboardingSchema } from "./schemas.js"
import type { SignupData, LoginData, OnboardingData } from "./schemas.js"

const JWT_EXPIRES_IN = "7d"
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export async function authRoutes(fastify: FastifyInstance) {
  // Register/Signup
  fastify.post<{ Body: SignupData }>(
    "/auth/register",
    async (request, reply) => {
      try {
        const body = SignupSchema.parse(request.body)

        // Check if user already exists
        const existingUser = await fastify.prisma.user.findUnique({
          where: { email: body.email },
        })

        if (existingUser) {
          return reply.status(400).send({ error: "Email already registered" })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(body.password, 10)

        // Create user
        const user = await fastify.prisma.user.create({
          data: {
            email: body.email,
            password: hashedPassword,
            firstName: body.firstName,
            lastName: body.lastName,
            companyId: body.companyId,
            position: "", // To be filled during onboarding
          },
        })

        // Generate JWT token
        const token = fastify.jwt.sign(
          { id: user.id, email: user.email },
          { expiresIn: JWT_EXPIRES_IN }
        )

        // Set secure HTTP-only cookie
        reply.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: COOKIE_MAX_AGE,
          path: "/",
        })

        return reply.status(201).send({
          message: "User registered successfully",
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            companyId: user.companyId,
            role: "USER", // Default role for new users
            isOnboarded: !!user.position,
          },
        })
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({ error: error.errors })
        }
        return reply.status(500).send({ error: "Registration failed" })
      }
    }
  )

  // Login
  fastify.post<{ Body: LoginData }>("/auth/login", async (request, reply) => {
    try {
      const body = LoginSchema.parse(request.body)

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      })

      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" })
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(body.password, user.password)

      if (!passwordMatch) {
        return reply.status(401).send({ error: "Invalid credentials" })
      }

      // Update last login
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })

      // Fetch user roles
      const userRoles = await fastify.prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      })

      // Get the first role name, or default to "USER"
      const role = userRoles[0]?.role.name || "USER"

      // Generate JWT token
      const token = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: JWT_EXPIRES_IN }
      )

      // Set secure HTTP-only cookie
      reply.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      })

      return reply.send({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          companyId: user.companyId,
          role,
          isOnboarded: !!user.position,
        },
      })
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: error.errors })
      }
      return reply.status(500).send({ error: "Login failed" })
    }
  })

  // Onboarding - Complete user profile
  fastify.post<{ Body: OnboardingData }>(
    "/auth/onboarding",
    async (request, reply) => {
      try {
        // Verify JWT token
        await request.jwtVerify()
        const userId = (request.user as any).id

        const body = OnboardingSchema.parse(request.body)

        // Update user with onboarding data
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: {
            position: body.position,
            bio: body.bio,
            avatarUrl: body.avatarUrl,
          },
        })

        return reply.send({
          message: "Onboarding completed successfully",
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            companyId: updatedUser.companyId,
            position: updatedUser.position,
            bio: updatedUser.bio,
            isOnboarded: true,
          },
        })
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({ error: error.errors })
        }
        return reply.status(401).send({ error: "Unauthorized" })
      }
    }
  )

  // Refresh token
  fastify.post("/auth/refresh", async (request, reply) => {
    try {
      await request.jwtVerify()
      const userId = (request.user as any).id

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return reply.status(401).send({ error: "User not found" })
      }

      const newToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: JWT_EXPIRES_IN }
      )

      reply.cookie("authToken", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      })

      return reply.send({ token: newToken })
    } catch (error) {
      return reply.status(401).send({ error: "Unauthorized" })
    }
  })

  // Logout
  fastify.post("/auth/logout", async (request, reply) => {
    reply.clearCookie("authToken")
    return reply.send({ message: "Logged out successfully" })
  })
}
