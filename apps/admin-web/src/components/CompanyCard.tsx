"use client"

import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Building2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface CompanyCardProps {
  id: string
  name: string
  description?: string
  image?: string
}

export function CompanyCard({
  id,
  name,
  description,
  image,
}: CompanyCardProps) {
  const navigate = useNavigate()

  const handleCardClick = () => {
    navigate(`/companies/${id}`)
  }

  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg">
      {/* Image Section */}
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <Building2 className="mb-2 h-16 w-16" />
            <span className="text-sm font-medium">No Image</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">
            {name}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleCardClick}
          variant="outline"
          className="mt-auto w-full"
        >
          View Details
        </Button>
      </div>
    </Card>
  )
}
