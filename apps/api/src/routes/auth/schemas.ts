import { z } from "zod"

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  companyId: z.string().min(1, "Company is required"),
})

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const OnboardingSchema = z.object({
  position: z.string().min(1, "Position is required").max(255),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
})

export type SignupData = z.infer<typeof SignupSchema>
export type LoginData = z.infer<typeof LoginSchema>
export type OnboardingData = z.infer<typeof OnboardingSchema>
