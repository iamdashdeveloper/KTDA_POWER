import { useState } from "react"
import { X } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel"
import Autoplay from "embla-carousel-autoplay"
interface ImageCarouselProps {
  images: string[]
  title?: string
  onRemove?: (index: number) => void
  canEdit?: boolean
}

export function ImageCarousel({
  images,
  title,
  onRemove,
  canEdit = false,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="rounded-lg bg-muted p-12 text-center">
        <p className="text-muted-foreground">No images available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="font-semibold">{title}</h3>}

      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[Autoplay({ delay: 3000 })]}
          className="w-full"
        >
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <div className="aspect-video w-full">
                    <img
                      src={image}
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Remove Button */}
                  {canEdit && onRemove && (
                    <button
                      onClick={() => onRemove(index)}
                      className="absolute top-4 right-4 rounded-full bg-red-500 p-2 text-white transition-all hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Image Counter */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                      {index + 1} / {images.length}
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Controls */}
          {images.length > 1 && (
            <>
              <CarouselPrevious className="absolute top-1/2 left-4 -translate-y-1/2" />
              <CarouselNext className="absolute top-1/2 right-4 -translate-y-1/2" />
            </>
          )}
        </Carousel>
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                index === currentIndex
                  ? "border-blue-500"
                  : "border-transparent hover:border-gray-400"
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="h-16 w-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
