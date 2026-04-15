import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { handleFormError, handleFormSuccess } from "@/lib/errorHandler"
import apiClient from "@/lib/api"
import { UserForm } from "@/components/forms/UserForm"

interface Company {
  id: string
  name: string
}

export function UserCreate() {
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
      <UserForm />
    </div>
  )
}
