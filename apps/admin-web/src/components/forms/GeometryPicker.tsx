import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"
import { MapPin, Search, Navigation } from "lucide-react"
import { showError, showSuccess } from "@/lib/errorHandler"
import MapComponent from "./MapComponent"

export interface GeometryValue {
  latitude: number
  longitude: number
}

interface GeometryPickerProps {
  value?: GeometryValue
  onChange: (value: GeometryValue) => void
  title?: string
}

export function GeometryPicker({
  value = { latitude: -1.283611, longitude: 36.818611 },
  onChange,
  title = "Location",
}: GeometryPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [lat, setLat] = useState(value.latitude)
  const [lng, setLng] = useState(value.longitude)
  const [loading, setLoading] = useState(false)

  // Sync with prop value changes
  useEffect(() => {
    if (value) {
      setLat(value.latitude)
      setLng(value.longitude)
    }
  }, [value])

  // Search location using Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showError("Please enter a location")
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      )
      const data = await response.json()

      if (data.length === 0) {
        showError("Location not found")
        return
      }

      const result = data[0]
      const newCoords = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      }

      setLat(newCoords.latitude)
      setLng(newCoords.longitude)
      onChange(newCoords)
      showSuccess(`Found: ${result.display_name}`)
    } catch (err) {
      showError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  // Get current GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError("Geolocation not supported in your browser")
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setLat(newCoords.latitude)
        setLng(newCoords.longitude)
        onChange(newCoords)
        setLoading(false)
        showSuccess("Location found successfully!")
      },
      () => {
        showError("Failed to get current location. Please check permissions.")
        setLoading(false)
      }
    )
  }

  const handleLatChange = (newLat: number) => {
    setLat(newLat)
    onChange({ latitude: newLat, longitude: lng })
  }

  const handleLngChange = (newLng: number) => {
    setLng(newLng)
    onChange({ latitude: lat, longitude: newLng })
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <MapPin className="h-5 w-5" />
        {title}
      </h3>

      {/* Search Section */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search location (e.g., 'New York', '123 Main St')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            disabled={loading}
          />
          <Button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={loading}
          className="w-full gap-2"
        >
          <Navigation className="h-4 w-4" />
          Use Current Location
        </Button>
      </div>

      {/* Coordinates */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Latitude</label>
          <Input
            type="float"
            value={lat}
            onChange={(e) => handleLatChange(parseFloat(e.target.value))}
            placeholder="Latitude"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Longitude</label>
          <Input
            type="float"
            value={lng}
            onChange={(e) => handleLngChange(parseFloat(e.target.value))}
            placeholder="Longitude"
          />
        </div>
      </div>

      {/* Map */}
      <MapComponent lat={lat} lng={lng} onChange={onChange} />

      {/* Coordinates Display */}
      <div className="mt-4 rounded bg-card p-3 font-mono text-sm">
        <div>Latitude: {lat}</div>
        <div>Longitude: {lng}</div>
      </div>
    </Card>
  )
}
