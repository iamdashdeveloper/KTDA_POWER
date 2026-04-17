export interface Feature {
  id: string
  name: string
  projectId?: string | null
  geometry?: any
  createdAt: string
  details?: any
  images?: string[]
  parentId?: string
  subFeatures?: Feature[]
}
