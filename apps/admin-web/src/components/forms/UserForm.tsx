import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"
import apiClient from "@/lib/api"

interface Company {
  id: string
  name: string
}

export function UserForm() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyId: "",
    avatarUrl: "",
    position: "",
    bio: "",
  })

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get("/companies")

        setCompanies(response.data)
      } catch (err) {
        handleFormError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCompanyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      companyId: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.companyId) {
      handleFormError(new Error("Please select a company"))
      return
    }

    try {
      setSubmitting(true)
      await apiClient.post("/users", {
        ...formData,
        companyId: formData.companyId,
      })

      handleFormSuccess("create")
      // Reset form
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        companyId: "",
        avatarUrl: "",
        position: "",
        bio: "",
      })
    } catch (err) {
      handleFormError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Create User</h1>

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-medium"
              >
                First Name *
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-medium"
              >
                Last Name *
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email Address *
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password *
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="companyId"
              className="mb-2 block text-sm font-medium"
            >
              Company *
            </label>
            {loading ? (
              <div className="text-muted-foreground">Loading companies...</div>
            ) : (
              <Select
                value={formData.companyId}
                onValueChange={handleCompanyChange}
                disabled={submitting}
              >
                <SelectTrigger id="companyId">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label
              htmlFor="position"
              className="mb-2 block text-sm font-medium"
            >
              Position *
            </label>
            <Input
              id="position"
              name="position"
              type="text"
              value={formData.position}
              onChange={handleChange}
              placeholder="e.g., Engineer, Technician, Manager"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="avatarUrl"
              className="mb-2 block text-sm font-medium"
            >
              Avatar URL
            </label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              value={formData.avatarUrl}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-2 block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Enter a short bio..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create User"}
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
