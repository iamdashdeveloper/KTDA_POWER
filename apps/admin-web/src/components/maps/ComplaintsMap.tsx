"use client"

import { useEffect, useRef, useState } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import OSM from "ol/source/OSM"
import GeoJSON from "ol/format/GeoJSON"
import { Style, Stroke, Fill } from "ol/style"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { ChevronUp, X } from "lucide-react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable"
import apiClient from "@/lib/api"
import "ol/ol.css"
import Overlay from "ol/Overlay"

type ComplaintData = {
  id: string
  name: string
  phoneNumber: string
  complaintType: string
  description: string
  plotNumber?: string
  severity: string
  status: string
  projectName: string
  feedbackCount: number
  createdAt: string
  updatedAt: string
}

type LayerVisibility = {
  parcels: boolean
  cadastre: boolean
}

export function ComplaintsMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const tooltipContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const complaintParcelsSource = useRef<VectorSource | null>(null)
  const complaintParcelsLayerRef = useRef<VectorLayer | null>(null)
  const cadastreSource = useRef<VectorSource | null>(null)
  const cadastreLayerRef = useRef<VectorLayer | null>(null)
  const tooltipRef = useRef<Overlay | null>(null)

  const [complaints, setComplaints] = useState<ComplaintData[]>([])
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    parcels: true,
    cadastre: true,
  })
  const [showTable, setShowTable] = useState(true)
  const [tooltipText, setTooltipText] = useState<string>("")

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Complaint Parcels Source and Layer (Red highlight)
    complaintParcelsSource.current = new VectorSource()
    complaintParcelsLayerRef.current = new VectorLayer({
      source: complaintParcelsSource.current,
      style: new Style({
        fill: new Fill({ color: "rgba(239, 68, 68, 0.25)" }),
        stroke: new Stroke({ color: "#ef4444", width: 3 }),
      }),
    })

    // Cadastre Source and Layer
    cadastreSource.current = new VectorSource()
    cadastreLayerRef.current = new VectorLayer({
      source: cadastreSource.current,
      style: new Style({
        fill: new Fill({ color: "rgba(0, 0, 255, 0.1)" }),
        stroke: new Stroke({ color: "#000000", width: 2 }),
      }),
    })

    // Initialize map
    map.current = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        cadastreLayerRef.current,
        complaintParcelsLayerRef.current,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    })

    // Create tooltip overlay
    if (tooltipContainer.current) {
      tooltipRef.current = new Overlay({
        element: tooltipContainer.current,
        offset: [10, 0],
        positioning: "center-left",
      })
      map.current.addOverlay(tooltipRef.current)
    }

    // Add hover interaction for tooltip
    map.current.on("pointermove", (event: any) => {
      let tooltipText = ""
      map.current?.forEachFeatureAtPixel(event.pixel, (feature: any) => {
        if (
          complaintParcelsSource.current?.getFeatures().includes(feature as any)
        ) {
          const complaintType = feature.get("complaintType") || ""
          tooltipText = complaintType
          return true
        }
      })

      if (tooltipText) {
        setTooltipText(tooltipText)
        tooltipRef.current?.setPosition(event.coordinate)
      } else {
        setTooltipText("")
      }
    })

    // Fetch cadastre data
    const fetchCadastreData = async () => {
      try {
        const response = await apiClient.get("/cadastre")
        const geojson = response.data

        if (geojson.features && geojson.features.length > 0) {
          const geoJsonFormat = new GeoJSON()
          try {
            const features = geoJsonFormat.readFeatures(geojson, {
              featureProjection: "EPSG:3857",
            })

            cadastreSource.current?.addFeatures(features)

            // Fit map to cadastre data bounds
            if (features.length > 0) {
              const extent = cadastreSource.current?.getExtent()
              if (extent && extent[0] !== Infinity) {
                map.current
                  ?.getView()
                  .fit(extent, { padding: [50, 50, 50, 50] })
              }
            }
          } catch (parseError) {
            console.error(
              "Error parsing GeoJSON features:",
              parseError,
              geojson
            )
          }
        }
      } catch (error) {
        console.error("Error fetching cadastre data:", error)
      }
    }

    // Fetch complaints data with parcel geometries
    const fetchComplaintsData = async () => {
      try {
        const response = await apiClient.get("/cadastre/complaints")
        const data = response.data

        if (data && data.features) {
          const complaintsList: ComplaintData[] = data.features.map(
            (feature: any) => ({
              id: feature.id,
              name: feature.properties.name,
              phoneNumber: feature.properties.phoneNumber,
              complaintType: feature.properties.complaintType,
              description: feature.properties.description,
              plotNumber: feature.properties.plotNumber,
              severity: feature.properties.severity,
              status: feature.properties.status,
              projectName: feature.properties.projectName,
              feedbackCount: 0,
              createdAt: feature.properties.createdAt,
              updatedAt: feature.properties.updatedAt,
            })
          )
          setComplaints(complaintsList)

          // Add complaint parcels to the map
          const geoJsonFormat = new GeoJSON()
          complaintParcelsSource.current?.clear()

          data.features.forEach((feature: any) => {
            if (feature.geometry) {
              try {
                const olFeature = geoJsonFormat.readFeature(feature, {
                  dataProjection: "EPSG:4326",
                  featureProjection: "EPSG:3857",
                })

                // Handle both single feature and array of features
                const features = Array.isArray(olFeature)
                  ? olFeature
                  : [olFeature]

                features.forEach((f: any) => {
                  if (f) {
                    f.set("complaintType", feature.properties.complaintType)
                    complaintParcelsSource.current?.addFeature(f)
                  }
                })
              } catch (error) {
                console.error(
                  "Error parsing complaint parcel geometry:",
                  feature,
                  error
                )
              }
            }
          })
        }
      } catch (error) {
        console.error("Error fetching complaints:", error)
      }
    }

    // Execute fetches
    fetchCadastreData()
    fetchComplaintsData()

    return () => {
      if (map.current) {
        map.current.setTarget(undefined)
        map.current = null
      }
    }
  }, [])

  const toggleLayerVisibility = (layer: "parcels" | "cadastre") => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }))

    if (layer === "parcels" && complaintParcelsLayerRef.current) {
      complaintParcelsLayerRef.current.setVisible(!layerVisibility.parcels)
    } else if (layer === "cadastre" && cadastreLayerRef.current) {
      cadastreLayerRef.current.setVisible(!layerVisibility.cadastre)
    }
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-2">
            <h2 className="text-lg font-semibold">Complaints Management</h2>
            <div className="flex items-center gap-2">
              {/* Layer Control */}
              <div className="flex items-center gap-1 rounded-md border p-1">
                <label className="flex items-center gap-2 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layerVisibility.parcels}
                    onChange={() => toggleLayerVisibility("parcels")}
                    className="h-4 w-4 rounded"
                  />
                  <span>Complaint Locations</span>
                </label>
                <div className="mx-1 h-6 border-l" />
                <label className="flex items-center gap-2 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layerVisibility.cadastre}
                    onChange={() => toggleLayerVisibility("cadastre")}
                    className="h-4 w-4 rounded"
                  />
                  <span>Cadastre Reference</span>
                </label>
              </div>

              <Button
                onClick={() => setShowTable(!showTable)}
                variant="outline"
                size="sm"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          <ResizablePanel defaultSize={70} minSize={40}>
            <Card className="relative m-2 h-full overflow-hidden">
              <div
                ref={mapContainer}
                className="h-full w-full bg-gray-100 dark:bg-gray-900"
              />
              <div
                ref={tooltipContainer}
                className={`absolute z-50 rounded bg-red-600 px-2 py-1 text-xs text-white transition-opacity ${
                  tooltipText ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {tooltipText}
              </div>
            </Card>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle />

          {/* Bottom Panel - Complaints Data Table */}
          {showTable && (
            <ResizablePanel defaultSize={30} minSize={15}>
              <Card className="flex h-full flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b">
                  <h3 className="text-sm font-semibold">Complaints</h3>
                  <Button
                    onClick={() => setShowTable(false)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-x-auto">
                  {complaints.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-medium">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Severity
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Project
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Phone
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {complaints.map((complaint) => (
                          <tr
                            key={complaint.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="px-3 py-2 font-medium">
                              {complaint.name}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {complaint.complaintType}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getSeverityColor(complaint.severity)}`}
                              >
                                {complaint.severity}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getStatusColor(complaint.status)}`}
                              >
                                {complaint.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {complaint.projectName}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {complaint.phoneNumber}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No complaints yet.
                    </div>
                  )}
                </div>
              </Card>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  )
}
