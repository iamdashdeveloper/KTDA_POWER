"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import apiClient from "@/lib/api"
import { CompanyCard } from "@/components/CompanyCard"
import { Button } from "@workspace/ui/components/button"
import { handleFormError } from "@/lib/errorHandler"
import { Plus } from "lucide-react"

interface Company {
  id: string
  name: string
  description?: string
  images?: string[]
}

export function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get("/companies")
        setCompanies(response.data || [])
        setError(null)
      } catch (err) {
        handleFormError(err)
        setError("Failed to fetch companies")
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [])

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Companies</h1>
            <p className="mt-2 text-muted-foreground">
              Manage and view all companies
            </p>
          </div>
          <Button
            onClick={() => navigate("/companies/create")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading companies...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && companies.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">No companies found</p>
          <Button onClick={() => navigate("/companies/create")}>
            Create First Company
          </Button>
        </div>
      )}

      {!loading && companies.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              id={company.id}
              name={company.name}
              description={company.description}
              image={company.images?.[0]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
