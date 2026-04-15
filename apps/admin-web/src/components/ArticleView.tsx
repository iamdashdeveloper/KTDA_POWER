import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Edit, MapPin } from "lucide-react"
import { ImageCarousel } from "./ImageCarousel"

interface ArticleViewProps {
  title: string
  description: string
  images?: string[]
  location?: {
    latitude: number
    longitude: number
  }
  metadata?: Record<string, any>
  status?: string
  onEdit: () => void
}

export function ArticleView({
  title,
  description,
  images = [],
  location,
  metadata,
  status,
  onEdit,
}: ArticleViewProps) {
  return (
    <div className="space-y-6">
      {/* Carousel with Overlay Title */}
      <div className="group relative rounded-lg">
        <div className="overflow-hidden rounded-lg">
          {images.length > 0 ? (
            <ImageCarousel images={images} />
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
              <div className="flex aspect-video w-full items-center justify-center">
                <div className="text-center text-slate-400">
                  <p className="text-lg font-medium">No Images Available</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dark Overlay for Text Visibility - only on top portion */}
        <div className="pointer-events-none absolute top-0 right-0 left-0 h-32 rounded-t-lg bg-gradient-to-b from-black/60 to-transparent" />

        {/* Title and Status - top left, non-interactive overlay */}
        <div className="pointer-events-none absolute top-8 left-8 z-10">
          <div>
            <h1 className="mb-4 text-5xl font-bold text-white drop-shadow-lg">
              {title}
            </h1>
            {status && (
              <div className="inline-block rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-900">
                {status}
              </div>
            )}
          </div>
        </div>

        {/* Edit Button - top right, interactive */}
        <div className="absolute top-6 right-6 z-20">
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="gap-2 bg-white/95 hover:bg-white"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        <div className="prose prose-sm max-w-none space-y-4">
          {/* Description */}
          <div>
            <h2 className="mb-3 text-xl font-semibold">Overview</h2>
            <p className="leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>

          {/* Location */}
          {location && (
            <div className="border-t pt-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <p className="text-sm">
                Latitude: {location.latitude.toFixed(6)} | Longitude:{" "}
                {location.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Metadata */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-4 font-semibold">Properties</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {Object.entries(metadata).map(([key, value], index) => (
                      <tr
                        key={key}
                        className={`border-b ${
                          index % 2 === 0
                            ? "bg-slate-50 dark:bg-slate-900/30"
                            : "bg-white dark:bg-slate-950/20"
                        }`}
                      >
                        <td className="w-32 px-4 py-3 align-top font-medium text-slate-700 dark:text-slate-300">
                          {key}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {Array.isArray(value) ? (
                            <div className="space-y-1">
                              {value.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 pl-2 before:text-slate-400 before:content-['•']"
                                >
                                  {typeof item === "object"
                                    ? JSON.stringify(item)
                                    : String(item)}
                                </div>
                              ))}
                            </div>
                          ) : typeof value === "object" ? (
                            <pre className="overflow-x-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            String(value)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
