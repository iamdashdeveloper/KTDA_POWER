import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { MapPin, Navigation, Loader, AlertCircle, Search, Layers3 } from "lucide-react"
import type { Issue } from "@/lib/issueLoader"
import { parseIssueCoordinates } from "@/lib/mapData"

import * as turf from "@turf/turf"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"

export type DestinationType = "feature" | "issue" | "parcel"

interface Destination {
  type: DestinationType
  coordinates: [number, number]
  label: string
  id: string
  geometry?: any
  metadata?: Record<string, any>
}

interface RoutingModalProps {
  isOpen: boolean
  onClose: () => void
  onRouteSelect?: (
    startCoord: [number, number],
    endCoord: [number, number],
    destinationType: DestinationType,
    chainageOptions?: {
      interval: number
      showMarkers: boolean
      geometry: any
    }
  ) => void
  issues?: Issue[]
  features?: Array<{
    id: string
    name: string
    coordinates: [number, number]
    parentId?: string | null
    parentName?: string | null
    groupName?: string | null
    geometry?: any
  }>
}

export function RoutingModal({
  isOpen,
  onClose,
  onRouteSelect,
  issues = [],
  features = [],
}: RoutingModalProps) {
  const [startInput, setStartInput] = useState("")
  const [startCoordinates, setStartCoordinates] = useState<
    [number, number] | null
  >(null)
  const [selectedDestinationType, setSelectedDestinationType] =
    useState<DestinationType>("feature")
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [chainageInterval, setChainageInterval] = useState<string>("100")
  const [chainageValue, setChainageValue] = useState<string>("")
  const [showChainageMarkers, setShowChainageMarkers] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState("")

  const isLineFeature =
    selectedDestination?.geometry?.type === "LineString" ||
    selectedDestination?.geometry?.type === "MultiLineString"

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser")
      return
    }

    setIsGeolocating(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ]
        setStartCoordinates(coords)
        setStartInput(`${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`)
        setIsGeolocating(false)
      },
      (error) => {
        console.error("Geolocation error:", error)
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? "Permission denied. Please enable location access."
            : "Failed to get your location. Please try again."
        )
        setIsGeolocating(false)
      }
    )
  }

  const handleCalculateRoute = async () => {
    if (!startCoordinates || !selectedDestination) {
      return
    }

    setIsCalculatingRoute(true)

    try {
      let finalDestinationCoord = selectedDestination.coordinates

      if (isLineFeature && chainageValue) {
        const val = parseFloat(chainageValue)
        if (!isNaN(val)) {
          try {
            const line = selectedDestination.geometry
            const sliced = turf.along(line, val / 1000, { units: "kilometers" })
            finalDestinationCoord = sliced.geometry.coordinates as [
              number,
              number,
            ]
          } catch (e) {
            console.error("Failed to calculate chainage coordinate:", e)
          }
        }
      }

      if (onRouteSelect) {
        onRouteSelect(
          startCoordinates,
          finalDestinationCoord,
          selectedDestinationType,
          isLineFeature
            ? {
                interval: parseFloat(chainageInterval) || 100,
                showMarkers: showChainageMarkers,
                geometry: selectedDestination.geometry,
              }
            : undefined
        )
      }
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error("Failed to calculate route:", error)
    } finally {
      setIsCalculatingRoute(false)
    }
  }

  const getFilteredDestinations = (): Destination[] => {
    let dests: Destination[] = []

    switch (selectedDestinationType) {
      case "feature":
        dests = features.map((f) => ({
          type: "feature" as const,
          coordinates: f.coordinates,
          label: f.name,
          id: f.id,
          geometry: f.geometry,
          metadata: {
            parent: f.parentName || f.groupName || "-",
            type: f.geometry?.type || "Unknown"
          }
        }))
        break
      case "issue":
        dests = issues
          .map((issue) => {
            const coords = parseIssueCoordinates(issue)
            if (!coords) return null
            return {
              type: "issue" as const,
              coordinates: coords,
              label: issue.title,
              id: issue.id,
              metadata: {
                status: issue.status,
                priority: issue.priority,
                date: new Date(issue.createdAt).toLocaleDateString(),
                description: issue.description
              }
            }
          })
          .filter(Boolean) as Destination[]
        break
      case "parcel":
        dests = [] // TODO
        break
    }

    if (!searchQuery) return dests

    const query = searchQuery.toLowerCase()
    return dests.filter(d => 
      d.label.toLowerCase().includes(query) || 
      d.id.toLowerCase().includes(query) ||
      (d.metadata?.parent && d.metadata.parent.toLowerCase().includes(query)) ||
      (d.metadata?.description && d.metadata.description.toLowerCase().includes(query))
    )
  }

  const isReadyToRoute = startCoordinates && selectedDestination

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <DialogTitle>Route Navigation</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Start Location Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Start Location</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter start location or use 'My Location'"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  disabled={isGeolocating}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isGeolocating}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {isGeolocating ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  {isGeolocating ? "Locating..." : "My Location"}
                </Button>
              </div>

              {geoError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{geoError}</p>
                </div>
              )}

              {startCoordinates && (
                <p className="text-xs text-muted-foreground font-mono">
                  Coords: {startCoordinates[1].toFixed(6)}, {startCoordinates[0].toFixed(6)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm font-medium">Select Destination</Label>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Destination Type Tabs */}
            <div className="flex border-b border-border">
              {(["feature", "issue", "parcel"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedDestinationType(type)
                    setSelectedDestination(null)
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    selectedDestinationType === type
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}s
                </button>
              ))}
            </div>

            {/* Table Area */}
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 sticky top-0 z-10 border-b">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">Sel</th>
                      <th className="px-4 py-3 font-medium">Name/Label</th>
                      {selectedDestinationType === "feature" && (
                        <>
                          <th className="px-4 py-3 font-medium">Parent Group</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                        </>
                      )}
                      {selectedDestinationType === "issue" && (
                        <>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Priority</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                        </>
                      )}
                      <th className="px-4 py-3 font-medium">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getFilteredDestinations().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                          No {selectedDestinationType}s found matching your search.
                        </td>
                      </tr>
                    ) : (
                      getFilteredDestinations().map((dest) => (
                        <tr 
                          key={dest.id}
                          className={`hover:bg-accent/50 cursor-pointer transition-colors ${
                            selectedDestination?.id === dest.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => setSelectedDestination(dest)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedDestination?.id === dest.id}
                              onCheckedChange={(checked) => {
                                setSelectedDestination(checked ? dest : null)
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {dest.label}
                            {selectedDestinationType === "issue" && dest.metadata?.description && (
                              <p className="text-xs text-muted-foreground font-normal line-clamp-1 mt-0.5">
                                {dest.metadata.description}
                              </p>
                            )}
                          </td>
                          {selectedDestinationType === "feature" && (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">{dest.metadata?.parent}</td>
                              <td className="px-4 py-3 text-muted-foreground italic text-xs">{dest.metadata?.type}</td>
                            </>
                          )}
                          {selectedDestinationType === "issue" && (
                            <>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                  dest.metadata?.status === "OPEN" ? "bg-red-100 text-red-700" :
                                  dest.metadata?.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {dest.metadata?.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">{dest.metadata?.priority}</td>
                              <td className="px-4 py-3 text-muted-foreground">{dest.metadata?.date}</td>
                            </>
                          )}
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {dest.coordinates[1].toFixed(5)}, {dest.coordinates[0].toFixed(5)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Chainage Options for Line Features */}
          {selectedDestinationType === "feature" && isLineFeature && (
            <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Layers3 className="h-4 w-4" />
                Line Feature Options (Chainage)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="chainageInterval" className="text-xs font-medium">
                    Chainage Interval (m)
                  </Label>
                  <Input
                    id="chainageInterval"
                    type="number"
                    placeholder="e.g. 100"
                    value={chainageInterval}
                    onChange={(e) => setChainageInterval(e.target.value)}
                    className="h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chainageValue" className="text-xs font-medium">
                    Chainage Value (m)
                  </Label>
                  <Input
                    id="chainageValue"
                    type="number"
                    placeholder="e.g. 500"
                    value={chainageValue}
                    onChange={(e) => setChainageValue(e.target.value)}
                    className="h-9 bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="showChainageMarkers"
                  checked={showChainageMarkers}
                  onCheckedChange={(checked) => setShowChainageMarkers(!!checked)}
                />
                <Label
                  htmlFor="showChainageMarkers"
                  className="text-xs font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show chainage markers along the entire line
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCalculateRoute}
            disabled={!isReadyToRoute || isCalculatingRoute}
            className="flex-1 gap-2 shadow-lg"
          >
            {isCalculatingRoute ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4" />
                Get Directions
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
