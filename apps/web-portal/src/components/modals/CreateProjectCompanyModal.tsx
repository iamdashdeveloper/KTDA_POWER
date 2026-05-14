import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { ApiClient } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Building2, FolderPlus } from "lucide-react"

interface Company {
  id: string
  name: string
}

interface CreateProjectCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateProjectCompanyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectCompanyModalProps) {
  const [activeTab, setActiveTab] = useState<"project" | "company">("project")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)

  // Company Form State
  const [companyData, setCompanyData] = useState({
    name: "",
    description: "",
  })

  // Project Form State
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    companyId: "",
    status: "planning",
  })

  useEffect(() => {
    if (isOpen && activeTab === "project") {
      fetchCompanies()
    }
  }, [isOpen, activeTab])

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true)
    try {
      const data = await ApiClient.get<Company[]>("/companies")
      const companiesData = Array.isArray(data) ? data : (data as any)?.data || []
      setCompanies(companiesData)
    } catch (error) {
      console.error("Error fetching companies:", error)
      toast.error("Failed to load companies")
    } finally {
      setIsLoadingCompanies(false)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyData.name) {
      toast.error("Company name is required")
      return
    }

    setIsSubmitting(true)
    try {
      await ApiClient.post("/companies", companyData)
      toast.success("Company created successfully")
      setCompanyData({ name: "", description: "" })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Failed to create company")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectData.name || !projectData.companyId) {
      toast.error("Project name and company are required")
      return
    }

    setIsSubmitting(true)
    try {
      await ApiClient.post("/projects", projectData)
      toast.success("Project created successfully")
      setProjectData({
        name: "",
        description: "",
        companyId: "",
        status: "planning",
      })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Failed to create project")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New</DialogTitle>
          <DialogDescription>
            Add a new project or company to the system.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="project" className="flex items-center gap-2">
              <FolderPlus size={16} />
              Project
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 size={16} />
              Company
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 py-4">
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  placeholder="Enter company name"
                  value={companyData.name}
                  onChange={(e) =>
                    setCompanyData({ ...companyData, name: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-desc">Description</Label>
                <Textarea
                  id="company-desc"
                  placeholder="Optional company description"
                  value={companyData.description}
                  onChange={(e) =>
                    setCompanyData({ ...companyData, description: e.target.value })
                  }
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Company
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="project" className="space-y-4 py-4">
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-company">Company *</Label>
                <Select
                  value={projectData.companyId}
                  onValueChange={(val) =>
                    setProjectData({ ...projectData, companyId: val })
                  }
                  disabled={isSubmitting || isLoadingCompanies}
                >
                  <SelectTrigger id="project-company">
                    <SelectValue placeholder={isLoadingCompanies ? "Loading..." : "Select a company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="Enter project name"
                  value={projectData.name}
                  onChange={(e) =>
                    setProjectData({ ...projectData, name: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-desc">Description</Label>
                <Textarea
                  id="project-desc"
                  placeholder="Optional project description"
                  value={projectData.description}
                  onChange={(e) =>
                    setProjectData({ ...projectData, description: e.target.value })
                  }
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-status">Status</Label>
                <Select
                  value={projectData.status}
                  onValueChange={(val) =>
                    setProjectData({ ...projectData, status: val })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="project-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
