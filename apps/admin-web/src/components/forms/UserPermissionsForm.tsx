"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import apiClient from "@/lib/api"
import { handleFormError } from "@/lib/errorHandler"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  position: string
  company: {
    id: string
    name: string
  }
  roles?: Role[]
}

interface Role {
  id: string
  name: string
  description?: string
  company?: {
    id: string
    name: string
  }
}

interface TableUser extends User {
  isUpdating?: boolean
}

export function UserPermissionsForm() {
  const [users, setUsers] = useState<TableUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [usersRes, rolesRes] = await Promise.all([
          apiClient.get("/users"),
          apiClient.get("/rbac/roles"),
        ])

        const fetchedUsers = usersRes.data.users.map((u: any) => ({
          ...u,
          id: u.id.toString(),
          company: {
            ...u.company,
            id: u.company.id.toString(),
          },
          roles: u.roles || [],
        }))

        setUsers(fetchedUsers)

        const fetchedRoles = (rolesRes.data.roles || rolesRes.data).map(
          (r: any) => ({
            ...r,
            id: r.id.toString(),
            company: r.company
              ? { ...r.company, id: r.company.id.toString() }
              : undefined,
          })
        )

        setRoles(fetchedRoles)
        setError(null)
      } catch (err) {
        handleFormError(err)
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      // Find the user
      const user = users.find((u) => u.id === userId)
      if (!user) return

      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, isUpdating: true } : u))
      )

      // Remove all existing roles
      if (user.roles && user.roles.length > 0) {
        for (const role of user.roles) {
          await apiClient.delete(`/users/${userId}/roles/${role.id}`)
        }
      }

      // Assign new role
      await apiClient.post(`/users/${userId}/roles`, { roleId: newRoleId })

      // Update local state with new role
      const selectedRole = roles.find((r) => r.id === newRoleId)
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId
            ? {
                ...u,
                isUpdating: false,
                roles: selectedRole ? [selectedRole] : [],
              }
            : u
        )
      )

      setSuccess(`Permissions updated for ${user.firstName} ${user.lastName}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      handleFormError(err)
      setError("Failed to update permissions")
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, isUpdating: false } : u
        )
      )
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-4">
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Permissions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      {user.position || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">{user.company.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="max-w-xs">
                        <Select
                          value={user.roles?.[0]?.id || ""}
                          onValueChange={(roleId) =>
                            handleRoleChange(user.id, roleId)
                          }
                          disabled={user.isUpdating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                user.isUpdating ? "Updating..." : "Select role"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {roles
                              .filter(
                                (role) =>
                                  !role.company ||
                                  role.company.id === user.company.id
                              )
                              .map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                  {role.description && ` - ${role.description}`}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {user.isUpdating && (
                          <div className="mt-1 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs text-muted-foreground">
                              Updating...
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    {users.length === 0
                      ? "No users found"
                      : "No matching users"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Total Users:</strong> {users.length} |
          <strong className="ml-4">With Permissions:</strong>{" "}
          {users.filter((u) => u.roles?.length).length}
        </p>
      </Card>
    </div>
  )
}
