import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Search, MapPin, Loader2, X } from "lucide-react"
import { useMapStore } from "@/store/useMapStore"

interface LocateModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
}

export function LocateModal({ isOpen, onClose }: LocateModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const executeCommand = useMapStore((state) => state.executeCommand)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery("")
      setResults([])
    }
  }, [isOpen])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`
      )
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Geocoding error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (result: SearchResult) => {
    executeCommand("locate-to", {
      longitude: parseFloat(result.lon),
      latitude: parseFloat(result.lat),
      zoom: 16,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-4 bg-primary text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin size={20} />
            Locate
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-background">
          <form onSubmit={handleSearch} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                ref={inputRef}
                placeholder="Search for a location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-10 ring-offset-background focus-visible:ring-1"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button type="submit" disabled={isLoading} size="sm" className="h-10 px-4">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Search"}
            </Button>
          </form>

          <div className="mt-4 space-y-1 max-h-[300px] overflow-auto custom-scrollbar">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-xs">Searching Nominatim...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelect(result)}
                  className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors flex items-start gap-3 group"
                >
                  <MapPin size={16} className="mt-1 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-sm font-medium line-clamp-1">{result.display_name.split(',')[0]}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-2">{result.display_name}</span>
                  </div>
                </button>
              ))
            ) : query && !isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <span className="text-xs">No locations found.</span>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground opacity-50 flex flex-col items-center gap-2">
                <Search size={32} />
                <span className="text-xs">Enter a place name to start searching.</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
