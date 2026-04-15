"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import apiClient from "@/lib/api"
import { handleFormError } from "@/lib/errorHandler"
import { UserCompanyBar } from "@/components/charts/UserCompanyBar"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  position: string
  bio?: string
  company: {
    id: string
    name: string
  }
  createdAt: string
  isEmailVerified: boolean
}

interface UserStats {
  totalUsers: number
  verifiedUsers: number
  unverifiedUsers: number
}

interface RoleStats {
  [key: string]: {
    [company: string]: number
  }
}

type SortKey = keyof User
type SortOrder = "asc" | "desc"

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
  })
  const [roleStats, setRoleStats] = useState<RoleStats>({})

  // Filtering & Sorting
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [verificationFilter, setVerificationFilter] = useState<
    "all" | "verified" | "unverified"
  >("all")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get("/users")
        const fetchedUsers = response.data.users.map((user: any) => ({
          ...user,
          id: user.id.toString(),
          company: {
            ...user.company,
            id: user.company.id.toString(),
          },
        }))
        setUsers(fetchedUsers)

        // Calculate stats
        const verified = fetchedUsers.filter(
          (u: User) => u.isEmailVerified
        ).length
        setStats({
          totalUsers: fetchedUsers.length,
          verifiedUsers: verified,
          unverifiedUsers: fetchedUsers.length - verified,
        })

        // Calculate role stats (position-based)
        const positionStats: RoleStats = {}
        fetchedUsers.forEach((user: User) => {
          if (!positionStats[user.position]) {
            positionStats[user.position] = {}
          }
          if (!positionStats[user.position][user.company.name]) {
            positionStats[user.position][user.company.name] = 0
          }
          positionStats[user.position][user.company.name]++
        })
        setRoleStats(positionStats)
      } catch (err) {
        handleFormError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Filter and sort users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.position.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCompany =
      !selectedCompanyName || user.company.name === selectedCompanyName

    const matchesVerification =
      verificationFilter === "all" ||
      (verificationFilter === "verified" && user.isEmailVerified) ||
      (verificationFilter === "unverified" && !user.isEmailVerified)

    return matchesSearch && matchesCompany && matchesVerification
  })

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return 0
  })

  // Paginate users
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const companies = Array.from(new Set(users.map((u) => u.company.name)))

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4" />
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="mt-2 text-muted-foreground">Manage system users</p>
        </div>
        <Button asChild>
          <a href="/users/create">
            <Plus className="mr-2 h-4 w-4" /> Add User
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.verifiedUsers}
            </p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Unverified</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.unverifiedUsers}
            </p>
          </div>
        </Card>
      </div>

      {/* Role Statistics Chart */}
      <div>
        <UserCompanyBar />
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Filters & Search</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name, email, position..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company</label>
            <Select
              value={selectedCompanyName || "all"}
              onValueChange={(value) =>
                setSelectedCompanyName(value === "all" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Status</label>
            <Select
              value={verificationFilter}
              onValueChange={(value: any) => setVerificationFilter(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Results</label>
            <div className="flex items-center justify-between rounded border bg-muted px-3 py-2">
              <span className="text-sm">
                {sortedUsers.length} of {users.length}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  <Checkbox />
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  <button
                    onClick={() => toggleSort("firstName")}
                    className="flex items-center gap-2 hover:text-foreground"
                  >
                    Name {getSortIcon("firstName")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  <button
                    onClick={() => toggleSort("email")}
                    className="flex items-center gap-2 hover:text-foreground"
                  >
                    Email {getSortIcon("email")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  <button
                    onClick={() => toggleSort("position")}
                    className="flex items-center gap-2 hover:text-foreground"
                  >
                    Position {getSortIcon("position")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  <button
                    onClick={() => toggleSort("createdAt")}
                    className="flex items-center gap-2 hover:text-foreground"
                  >
                    Created {getSortIcon("createdAt")}
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Checkbox />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.bio && (
                          <p className="text-xs text-muted-foreground">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                        {user.position}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{user.company.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.isEmailVerified ? (
                        <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {format(new Date(user.createdAt), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="rounded p-1 hover:bg-muted">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1 hover:bg-muted">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1 text-red-600 hover:bg-red-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t bg-muted px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} • Showing{" "}
              {paginatedUsers.length} of {sortedUsers.length} users
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, currentPage - 2),
                  Math.min(totalPages, currentPage + 1)
                )
                .map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
