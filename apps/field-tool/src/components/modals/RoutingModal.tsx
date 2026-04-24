import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { MapPin, Navigation, Loader, AlertCircle } from "lucide-react"
import type { Issue } from "@/lib/issueLoader"

import * as turf from "@turf/turf"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { getFeatureColor } from "../maps/mapUtils"

export type DestinationType = "feature" | "issue" | "parcel"

interface Destination {
  type: DestinationType
  coordinates: [number, number]
  label: string
  id: string
  geometry?: any
}

interface DestinationGroup {
  id: string
  label: string
  destinations: Destination[]
  geometryType?: string
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

  const handleSelectDestination = (destination: Destination) => {
    setSelectedDestination(destination)
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
            // turf.along takes distance in kilometers by default or units option
            // We assume chainage is in meters if not specified, but let's check
            // Usually chainage is meters.
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
      // Close modal after successful route calculation
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error("Failed to calculate route:", error)
    } finally {
      setIsCalculatingRoute(false)
    }
  }

  const getDestinationOptions = (): Destination[] => {
    switch (selectedDestinationType) {
      case "feature":
        return features.map((feature) => ({
          type: "feature" as const,
          coordinates: feature.coordinates,
          label: feature.name,
          id: feature.id,
          geometry: feature.geometry,
        }))
      case "issue":
        return issues
          .map((issue) => {
            // Extract coordinates from metadata
            const meta = issue.metadata as Record<string, any> | undefined
            if (!meta || !meta.longitude || !meta.latitude) {
              return null
            }
            return {
              type: "issue" as const,
              coordinates: [Number(meta.longitude), Number(meta.latitude)] as [
                number,
                number,
              ],
              label: issue.title,
              id: issue.id,
            }
          })
          .filter(Boolean) as Destination[]
      case "parcel":
        // TODO: Implement parcel selection when parcels are available
        return []
      default:
        return []
    }
  }

  const getDestinationGroups = (): DestinationGroup[] => {
    const destinations = getDestinationOptions()

    // Group destinations by parent, mirroring FeatureMap legend logic
    const groupMap = new Map<string, DestinationGroup>()

    destinations.forEach((destination) => {
      const feature = features.find((f) => f.id === destination.id)

      // For features, use the grouping logic from FeatureMap
      if (selectedDestinationType === "feature" && feature) {
        const groupId = feature.parentId || feature.id
        const groupLabel = feature.groupName || feature.parentName

        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id: groupId,
            label: groupLabel,
            destinations: [],
          })
        }
        const group = groupMap.get(groupId)!
        group.destinations.push(destination)
      } else {
        // For issues and parcels, return as a single group
        if (!groupMap.has("default")) {
          groupMap.set("default", {
            id: "default",
            label: selectedDestinationType === "issue" ? "Issues" : "Parcels",
            destinations: [],
          })
        }
        const group = groupMap.get("default")!
        group.destinations.push(destination)
      }
    })

    return Array.from(groupMap.values())
  }

  const isReadyToRoute = startCoordinates && selectedDestination

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            <DialogTitle>Route Navigation</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Start Location Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Start Location
            </label>

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
                  title="Get your current location"
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
                <p className="text-xs text-muted-foreground">
                  Coordinates: {startCoordinates[1].toFixed(4)},{" "}
                  {startCoordinates[0].toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Destination Type Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Destination Type
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(["feature", "issue", "parcel"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedDestinationType(type)
                    setSelectedDestination(null)
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedDestinationType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Destination Selection - Grouped by Parent */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Select Destination
            </label>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/50 p-2">
              {getDestinationOptions().length === 0 ? (
                <p className="p-1 text-sm text-muted-foreground">
                  No {selectedDestinationType}s available for this project.
                </p>
              ) : (
                <div className="space-y-2">
                  {getDestinationGroups().map((group) => {
                    const count = group.destinations.length
                    const geomType = group.geometryType || "Point"
                    const swatch = getFeatureColor(geomType, group.id)

                    return (
                      <div key={group.id} className="rounded-md bg-muted/30">
                        <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-4 w-4">
                              <span
                                className="block h-full w-full rounded-sm border border-white/60"
                                style={{ backgroundColor: swatch }}
                              />
                            </div>
                            <div>
                              <div className="truncate text-sm font-medium text-foreground">
                                {group.label || "Unnamed group"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {geomType} • {count}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                          <table className="w-full table-auto text-sm">
                            <thead>
                              <tr className="text-left text-xs text-muted-foreground">
                                <th className="px-2 py-1">Select</th>
                                {selectedDestinationType === "feature" && (
                                  <>
                                    <th className="px-2 py-1">Coordinates</th>
                                  </>
                                )}
                                {selectedDestinationType === "issue" && (
                                  <>
                                    <th className="px-2 py-1">Title</th>
                                    <th className="px-2 py-1">Date</th>
                                    <th className="px-2 py-1">Description</th>
                                    <th className="px-2 py-1">Coordinates</th>
                                  </>
                                )}
                                {selectedDestinationType === "parcel" && (
                                  <>
                                    <th className="px-2 py-1">Parcel ID</th>
                                    <th className="px-2 py-1">Coordinates</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {group.destinations.map((destination) => {
                                const issue = issues?.find(
                                  (i) => i.id === destination.id
                                )
                                // feature reference intentionally omitted; grouping already applied
                                const createdDate = issue?.createdAt
                                  ? new Date(
                                      issue.createdAt
                                    ).toLocaleDateString()
                                  : ""
                                const coords = `${destination.coordinates[1].toFixed(4)}, ${destination.coordinates[0].toFixed(4)}`
                                const isSelected =
                                  selectedDestination?.id === destination.id

                                return (
                                  <tr
                                    key={destination.id}
                                    className={`cursor-pointer align-top hover:bg-accent ${
                                      isSelected ? "bg-primary/10" : ""
                                    }`}
                                    onClick={() =>
                                      handleSelectDestination(destination)
                                    }
                                  >
                                    <td className="px-2 py-2">
                                      <Checkbox
                                        id={`dest-${destination.id}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) =>
                                          checked
                                            ? handleSelectDestination(
                                                destination
                                              )
                                            : setSelectedDestination(null)
                                        }
                                      />
                                    </td>

                                    {selectedDestinationType === "feature" && (
                                      <>
                                        <td className="px-2 py-2">{coords}</td>
                                      </>
                                    )}

                                    {selectedDestinationType === "issue" && (
                                      <>
                                        <td className="px-2 py-2">
                                          {issue?.title || destination.label}
                                        </td>
                                        <td className="px-2 py-2">
                                          {createdDate}
                                        </td>
                                        <td className="line-clamp-1 px-2 py-2 text-muted-foreground">
                                          {issue?.description || "-"}
                                        </td>
                                        <td className="px-2 py-2">{coords}</td>
                                      </>
                                    )}

                                    {selectedDestinationType === "parcel" && (
                                      <>
                                        <td className="px-2 py-2">
                                          {destination.id}
                                        </td>
                                        <td className="px-2 py-2">{coords}</td>
                                      </>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chainage Options for Line Features */}
          {selectedDestinationType === "feature" && isLineFeature && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-sm font-semibold text-foreground">
                Line Feature Options (Chainage)
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="chainageInterval" className="text-xs">
                    Chainage Interval (m)
                  </Label>
                  <Input
                    id="chainageInterval"
                    type="number"
                    placeholder="e.g. 100"
                    value={chainageInterval}
                    onChange={(e) => setChainageInterval(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chainageValue" className="text-xs">
                    Chainage Value (m)
                  </Label>
                  <Input
                    id="chainageValue"
                    type="number"
                    placeholder="e.g. 500"
                    value={chainageValue}
                    onChange={(e) => setChainageValue(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showChainageMarkers"
                  checked={showChainageMarkers}
                  onCheckedChange={(checked) =>
                    setShowChainageMarkers(!!checked)
                  }
                />
                <Label
                  htmlFor="showChainageMarkers"
                  className="text-xs leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show chainage markers
                </Label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCalculateRoute}
              disabled={!isReadyToRoute || isCalculatingRoute}
              className="flex-1 gap-2"
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
