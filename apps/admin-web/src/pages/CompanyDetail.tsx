import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import apiClient from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { handleFormError } from "@/lib/errorHandler"
import { ArrowLeft } from "lucide-react"
import { CompanyForm } from "@/components/forms/CompanyForm"
import { ArticleView } from "@/components/ArticleView"

interface Company {
  id: string
  name: string
  description?: string
  images?: string[]
  location?: {
    latitude: number
    longitude: number
  }
  metadata?: Record<string, any>
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) return

      try {
        setLoading(true)
        const response = await apiClient.get(`/companies/${id}`)
        setCompany(response.data)
        setError(null)
      } catch (err) {
        handleFormError(err)
        setError("Failed to fetch company details")
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading company details...</p>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => navigate("/companies")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Button>
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-200">
          {error || "Company not found"}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Button
        variant="ghost"
        className="gap-2"
        onClick={() => navigate("/companies")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Companies
      </Button>

      {isEditMode ? (
        <CompanyForm
          companyId={id}
          initialData={
            company
              ? {
                  id: company.id,
                  name: company.name,
                  description: company.description || "",
                  metadata: company.metadata || {},
                  images: company.images || [],
                }
              : undefined
          }
        />
      ) : (
        <ArticleView
          title={company.name}
          description={company.description || "No description provided"}
          images={company.images}
          location={company.location}
          metadata={company.metadata}
          onEdit={() => setIsEditMode(true)}
        />
      )}
    </div>
  )
}
