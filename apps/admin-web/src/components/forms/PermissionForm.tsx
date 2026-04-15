import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import apiClient from "@/lib/api"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"

const RESOURCES = [
  "companies",
  "users",
  "projects",
  "features",
  "issues",
  "activities",
  "articles",
  "roles",
  "permissions",
  "maintenanceSchedules",
  "chatRooms",
  "notifications",
]

const ACTIONS = ["read", "create", "edit", "delete"]

// Preset permission groups
const PRESET_GROUPS: Record<string, Set<string>> = {
  "Admin (Full Access)": new Set(
    RESOURCES.flatMap((res) => ACTIONS.map((act) => `${res}.${act}`))
  ),
  Editor: new Set(RESOURCES.flatMap((res) => [`${res}.read`, `${res}.edit`])),
  Viewer: new Set(RESOURCES.map((res) => `${res}.read`)),
  "Content Manager": new Set([
    "articles.read",
    "articles.create",
    "articles.edit",
    "articles.delete",
    "projects.read",
    "projects.edit",
  ]),
}

export function PermissionForm() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    companyId: "",
  })

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePermissionToggle = (resource: string, action: string) => {
    const slug = `${resource}.${action}`
    const newPermissions = new Set(selectedPermissions)

    if (newPermissions.has(slug)) {
      newPermissions.delete(slug)
    } else {
      newPermissions.add(slug)
    }

    setSelectedPermissions(newPermissions)
  }

  const handleActionToggle = (action: string) => {
    const newPermissions = new Set(selectedPermissions)

    // Check if all permissions for this action are checked
    const allChecked = RESOURCES.every((res) =>
      newPermissions.has(`${res}.${action}`)
    )

    if (allChecked) {
      // Uncheck all
      RESOURCES.forEach((res) => {
        newPermissions.delete(`${res}.${action}`)
      })
    } else {
      // Check all
      RESOURCES.forEach((res) => {
        newPermissions.add(`${res}.${action}`)
      })
    }

    setSelectedPermissions(newPermissions)
  }

  const applyPreset = (presetName: string) => {
    const preset = PRESET_GROUPS[presetName]
    if (preset) {
      setSelectedPermissions(new Set(preset))
      setFormData((prev) => ({
        ...prev,
        name: presetName,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (selectedPermissions.size === 0) {
      setError("Please select at least one permission")
      return
    }

    if (!formData.name.trim()) {
      setError("Please enter a role name")
      return
    }

    try {
      setSubmitting(true)

      // First, create the role
      const roleResponse = await apiClient.post("/rbac/roles", {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        companyId: formData.companyId || undefined,
      })

      const roleId = roleResponse.data.id

      // Then, assign each permission to the role
      // The /rbac/roles/:id/permissions endpoint will create the permission if it doesn't exist
      const permissionPromises = Array.from(selectedPermissions).map((slug) =>
        apiClient.post(`/rbac/roles/${roleId}/permissions`, {
          slug,
        })
      )

      await Promise.all(permissionPromises)

      handleFormSuccess("create")
      setFormData({
        name: "",
        description: "",
        companyId: "",
      })
      setSelectedPermissions(new Set())
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error creating role:", err)
      handleFormError(err)

      let errorMessage = "Failed to create role"
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === "object" && err !== null && "response" in err) {
        const response = (err as any).response?.data
        errorMessage = response?.message || response?.error || errorMessage
      }

      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Create Permission Group (Role)
      </h1>

      <div className="space-y-6">
        {error && (
          <div className="rounded border border-destructive bg-destructive/10 p-3 text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded border border-green-600 bg-green-600/10 p-3 text-green-700 dark:text-green-400">
            Permission group created successfully!
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Role Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Admin, Project Manager, Viewer"
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Unique name for this permission group
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what this role allows..."
                  rows={3}
                  className="w-full rounded-md border border-input px-3 py-2 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Preset Groups */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Quick Presets</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET_GROUPS).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    disabled={submitting}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Click a preset to quickly apply common permission sets
              </p>
            </div>

            {/* Permission Matrix */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Select Permissions</h3>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="border-b border-border px-4 py-3 text-left text-sm font-medium">
                        Resource
                      </th>
                      {ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="border-b border-border px-4 py-3 text-center"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={RESOURCES.every((res) =>
                                selectedPermissions.has(`${res}.${action}`)
                              )}
                              onCheckedChange={() => handleActionToggle(action)}
                              disabled={submitting}
                            />
                            <span className="text-sm font-medium capitalize">
                              {action}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESOURCES.map((resource) => (
                      <tr
                        key={resource}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-sm font-medium capitalize">
                          {resource}
                        </td>
                        {ACTIONS.map((action) => {
                          const slug = `${resource}.${action}`
                          const isChecked = selectedPermissions.has(slug)

                          return (
                            <td
                              key={`${resource}-${action}`}
                              className="border-r border-border px-4 py-3 text-center last:border-r-0"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() =>
                                  handlePermissionToggle(resource, action)
                                }
                                disabled={submitting}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                <p className="font-medium">
                  Selected Permissions ({selectedPermissions.size}):
                </p>
                {selectedPermissions.size > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(selectedPermissions)
                      .sort()
                      .map((perm) => (
                        <span
                          key={perm}
                          className="inline-block rounded bg-primary/15 px-2 py-1 text-primary dark:bg-primary/25"
                        >
                          {perm}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="mt-2 text-muted-foreground">
                    No permissions selected
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Role"}
              </Button>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
