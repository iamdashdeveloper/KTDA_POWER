"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers in leaflet
const defaultIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MapComponentProps {
  lat: number
  lng: number
  onChange: (coords: { latitude: number; longitude: number }) => void
}

// Default center: 1°17'01"S, 36°49'07"E
const DEFAULT_LAT = -1.283611
const DEFAULT_LNG = 36.818611

export default function MapComponent({
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG,
  onChange,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView([lat, lng], 13)

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
      {
        maxZoom: 30,
      } as any
    ).addTo(map)

    // Add marker
    const marker = L.marker([lat, lng], { icon: defaultIcon })
      .addTo(map)
      .bindPopup(`Location: ${lat}, ${lng}`)

    markerRef.current = marker
    mapRef.current = map

    // Handle map clicks
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const newLat = e.latlng.lat
      const newLng = e.latlng.lng

      // Update marker position
      marker.setLatLng([newLat, newLng])
      marker.setPopupContent(`Location: ${newLat}, ${newLng}`)

      onChange({
        latitude: newLat,
        longitude: newLng,
      })
    }

    map.on("click", handleMapClick)

    return () => {
      map.off("click", handleMapClick)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update marker when lat/lng changes from outside
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
      markerRef.current.setPopupContent(`Location: ${lat}, ${lng}`)
    }

    if (mapRef.current) {
      mapRef.current.panTo([lat, lng])
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      style={{
        height: "400px",
        width: "100%",
        borderRadius: "8px",
      }}
      className="rounded border border-gray-200"
    />
  )
}
