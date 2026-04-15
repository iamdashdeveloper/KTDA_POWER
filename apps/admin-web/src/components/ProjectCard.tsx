"use client"

import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Briefcase } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface ProjectCardProps {
  id: string
  name: string
  description?: string
  image?: string
  status?: string
}

export function ProjectCard({
  id,
  name,
  description,
  image,
  status,
}: ProjectCardProps) {
  const navigate = useNavigate()

  const handleCardClick = () => {
    navigate(`/projects/${id}`)
  }

  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg">
      {/* Image Section */}
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-700 dark:to-blue-800">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-blue-400 dark:text-blue-500">
            <Briefcase className="mb-2 h-16 w-16" />
            <span className="text-sm font-medium">No Image</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-3 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">
              {name}
            </h3>
            {status && (
              <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {status}
              </span>
            )}
          </div>
          {description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
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
