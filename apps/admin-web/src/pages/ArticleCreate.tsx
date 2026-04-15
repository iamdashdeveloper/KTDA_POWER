import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { DetailsEditor } from "@/components/DetailsEditor"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"
import apiClient from "@/lib/api"

interface Company {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

export function ArticleCreate() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    author: "",
    companyId: "",
    projectId: "",
    content: "",
    images: [] as string[],
    published: false,
    featured: false,
  })

  // Fetch companies and projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [companiesRes, projectsRes] = await Promise.all([
          apiClient.get("/companies"),
          apiClient.get("/projects"),
        ])

        setCompanies(companiesRes.data)
        setProjects(projectsRes.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
        handleFormError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleDetailsChange = (details: {
    content: string
    images: string[]
  }) => {
    setFormData((prev) => ({
      ...prev,
      content: details.content,
      images: details.images,
    }))
  }

  // Auto-generate slug from title
  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
    setFormData((prev) => ({
      ...prev,
      slug,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    try {
      setSubmitting(true)
      await apiClient.post("/articles", {
        ...formData,
        companyId: formData.companyId || null,
        projectId: formData.projectId || null,
      })

      handleFormSuccess("create")
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        author: "",
        companyId: "",
        projectId: "",
        content: "",
        images: [],
        published: false,
        featured: false,
      })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      handleFormError(err)
      setError(err instanceof Error ? err.message : "Failed to create article")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Create Article</h1>

      <Card className="max-w-4xl p-6">
        {/* {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )} */}

        {success && (
          <div className="mb-4 rounded border border-green-400 bg-green-100 p-3 text-green-700">
            Article created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium">
                Article Title *
              </label>
              <Input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter article title"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="slug" className="mb-2 block text-sm font-medium">
                URL Slug *
              </label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="article-url-slug"
                  required
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSlug}
                  className="whitespace-nowrap"
                  disabled={submitting}
                >
                  Auto-Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="companyId"
                className="mb-2 block text-sm font-medium"
              >
                Company (Optional)
              </label>
              {loading ? (
                <div className="text-gray-500">Loading companies...</div>
              ) : (
                <select
                  id="companyId"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select a Company --</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="projectId"
                className="mb-2 block text-sm font-medium"
              >
                Project (Optional)
              </label>
              {loading ? (
                <div className="text-gray-500">Loading projects...</div>
              ) : (
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select a Project --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="excerpt" className="mb-2 block text-sm font-medium">
              Excerpt / Summary
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Short summary of the article"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="author"
                className="mb-2 block text-sm font-medium"
              >
                Author
              </label>
              <Input
                id="author"
                name="author"
                type="text"
                value={formData.author}
                onChange={handleChange}
                placeholder="Author name (optional)"
              />
            </div>

            <div>
              <label
                htmlFor="companyId"
                className="mb-2 block text-sm font-medium"
              >
                Company ID
              </label>
              <Input
                id="companyId"
                name="companyId"
                type="number"
                value={formData.companyId}
                onChange={handleChange}
                placeholder="Optional - Link to company"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="projectId"
              className="mb-2 block text-sm font-medium"
            >
              Project ID
            </label>
            <Input
              id="projectId"
              name="projectId"
              type="number"
              value={formData.projectId}
              onChange={handleChange}
              placeholder="Optional - Link to project"
            />
          </div>

          <DetailsEditor
            content={formData.content}
            images={formData.images}
            onChange={handleDetailsChange}
          />

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={handleChange}
                disabled={submitting}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Publish Article</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
                disabled={submitting}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Featured</span>
            </label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Article"}
            </Button>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
