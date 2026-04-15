import { z } from "zod"

/**
 * Zod Validation Schemas for all Prisma models
 * String IDs (CUID) are now used directly from Prisma
 */

// --- COMMON PATTERNS ---

const BigIntString = z.string().min(1, "Must be a valid ID")
const OptionalBigIntString = z.string().min(1).optional().or(z.literal(""))

// --- 1. COMPANY ---

export const CompanyMetadataSchema = z.object({
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          zip: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  branding: z
    .object({
      logoUrl: z.string().url().optional(),
      primaryColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .optional(),
    })
    .optional(),
  governance: z
    .object({
      directors: z.array(z.string()).optional(),
    })
    .optional(),
})

export const CompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required").min(2).max(255),
  description: z.string().max(1000).optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  metadata: CompanyMetadataSchema.optional(),
})

export type CompanyFormData = z.infer<typeof CompanyFormSchema>

// --- 2. USER ---

export const UserMetadataSchema = z.object({
  achievements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
})

export const UserFormSchema = z.object({
  companyId: BigIntString,
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  position: z.string().min(1, "Position is required"),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  metadata: UserMetadataSchema.optional(),
})

export type UserFormData = z.infer<typeof UserFormSchema>

// --- 3. PROJECT ---

export const ProjectMetadataSchema = z.object({
  clientName: z.string().optional(),
  budget: z.number().positive().optional(),
  projectGoals: z.array(z.string()).optional(),
})

export const ProjectFormSchema = z.object({
  companyId: BigIntString,
  name: z.string().min(1, "Project name is required").min(2).max(255),
  description: z.string().max(2000).optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  status: z.string().optional(),
  metadata: ProjectMetadataSchema.optional(),
})

export type ProjectFormData = z.infer<typeof ProjectFormSchema>

// --- 4. FEATURE (HYDRO ASSET) ---

export const FeatureDetailsSchema = z.object({
  turbineType: z.string().optional(),
  maxFlowRate: z.number().positive().optional(),
  operatingHead: z.number().positive().optional(),
  efficiency: z.number().min(0).max(100).optional(),
  constructionYear: z.number().int().optional(),
  material: z.string().optional(),
})

export const FeatureFormSchema = z.object({
  projectId: BigIntString,
  parentId: OptionalBigIntString,
  name: z.string().min(1, "Feature name is required"),
  geometry: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  images: z.array(z.string().url()).optional(),
  details: FeatureDetailsSchema.optional(),
})

export type FeatureFormData = z.infer<typeof FeatureFormSchema>

// --- 5. ISSUE ---

export const IssueMetadataSchema = z.object({
  weather: z.string().optional(),
  impactLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  rootCause: z.string().optional(),
  estimatedRepairCost: z.number().positive().optional(),
})

export const IssueFormSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  featureId: z.string().optional(),
  title: z.string().min(1, "Title is required").min(5).max(255),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(0).max(3),
  status: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"]),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  images: z.array(z.string().url()).optional(),
  metadata: IssueMetadataSchema.optional(),
})

export type IssueFormData = z.infer<typeof IssueFormSchema>

// --- 6. ISSUE UPDATE (SITE DIARY) ---

export const IssueUpdateFormSchema = z.object({
  issueId: BigIntString,
  content: z.string().min(1, "Update description is required").min(10),
  images: z.array(z.string().url()).optional(),
  statusChange: z
    .enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"])
    .optional(),
})

export type IssueUpdateFormData = z.infer<typeof IssueUpdateFormSchema>

// --- 7. MAINTENANCE SCHEDULE ---

export const MaintenanceTaskTemplateSchema = z.object({
  taskTitle: z.string().optional(),
  assignedTo: BigIntString.optional(),
  expectedDuration: z.number().positive().optional(), // hours
  checklist: z.array(z.string()).optional(),
})

export const MaintenanceScheduleFormSchema = z.object({
  featureId: BigIntString,
  title: z.string().min(1, "Title is required"),
  intervalDays: z.number().int().positive("Interval must be positive"),
  nextRun: z.date().nullish(),
  taskTemplate: MaintenanceTaskTemplateSchema.optional(),
})

export type MaintenanceScheduleFormData = z.infer<
  typeof MaintenanceScheduleFormSchema
>

// --- 8. ARTICLE ---

export const ArticleFormSchema = z.object({
  title: z.string().min(1, "Title is required").min(5).max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500).optional(),
  author: z.string().optional(),
  companyId: OptionalBigIntString,
  projectId: OptionalBigIntString,
  images: z.array(z.string().url()).optional(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
})

export type ArticleFormData = z.infer<typeof ArticleFormSchema>
