import { z } from "zod"

// Company validation schema
export const CompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.any()).default({}),
  images: z.array(z.string().url()).default([]),
})

export type CompanyFormData = z.infer<typeof CompanyFormSchema>

// Project validation schema
export const ProjectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().max(1000).optional(),
  companyId: z.string().min(1, "Company is required"),
  status: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  images: z.array(z.string().url()).default([]),
})

export type ProjectFormData = z.infer<typeof ProjectFormSchema>

// Issue validation schema
export const IssueFormSchema = z.object({
  title: z.string().min(1, "Issue title is required").max(255),
  description: z.string().max(2000).optional(),
  projectId: z.string().min(1, "Project is required"),
  featureId: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "RESOLVED"]).default("OPEN"),
  priority: z.number().int().min(0).max(10).default(0),
  images: z.array(z.string().url()).default([]),
  metadata: z.record(z.any()).default({}),
})

export type IssueFormData = z.infer<typeof IssueFormSchema>

// User validation schema
export const UserFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  companyId: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required").max(255),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.any()).default({}),
})

export type UserFormData = z.infer<typeof UserFormSchema>

// Activity validation schema
export const ActivityFormSchema = z.object({
  title: z.string().min(1, "Activity title is required").max(255),
  projectId: z.string().min(1, "Project is required"),
  columnId: z.string().optional(),
  position: z.number().int().default(0),
  details: z
    .object({
      tags: z.array(z.string()).default([]),
      subtasks: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            completed: z.boolean().default(false),
          })
        )
        .default([]),
    })
    .default({ tags: [], subtasks: [] }),
  images: z.array(z.string().url()).default([]),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
})

export type ActivityFormData = z.infer<typeof ActivityFormSchema>
