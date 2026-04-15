"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import OSM from "ol/source/OSM"
import Draw from "ol/interaction/Draw"
import Modify from "ol/interaction/Modify"
import Select from "ol/interaction/Select"
import GeoJSON from "ol/format/GeoJSON"
import { Style, Stroke, Fill, Circle } from "ol/style"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip,
} from "@workspace/ui/components/tooltip"
import {
  Trash2,
  Square,
  Circle as CircleIcon,
  Pen,
  Save,
  ChevronUp,
  X,
} from "lucide-react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable"
import { SaveParcelDialog, type ParcelFormData } from "./SaveParcelDialog"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import "ol/ol.css"

interface MapState {
  drawing: boolean
  drawType: "Polygon" | "LineString" | "Circle" | null
}

type ParcelData = {
  id: string
  name: string | null
  owner?: {
    name: string | null
    email: string | null
    phone?: string | null
  }
  area: number | null
  status: string | null
  createdAt?: string
}

type LayerVisibility = {
  parcels: boolean
  cadastre: boolean
}

export function CadastreMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const vectorSource = useRef<VectorSource | null>(null)
  const vectorLayer = useRef<VectorLayer | null>(null)
  const parcelsSource = useRef<VectorSource | null>(null)
  const parcelsLayerRef = useRef<VectorLayer | null>(null)
  const cadastreSource = useRef<VectorSource | null>(null)
  const cadastreLayerRef = useRef<VectorLayer | null>(null)
  const drawInteraction = useRef<Draw | null>(null)

  const [mapState, setMapState] = useState<MapState>({
    drawing: false,
    drawType: null,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [drawnFeature, setDrawnFeature] = useState<any>(null)
  const [parcels, setParcels] = useState<ParcelData[]>([])
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    parcels: true,
    cadastre: true,
  })
  const [showTable, setShowTable] = useState(true)

  // Fetch parcels data - memoized so it can be called from multiple places
  const fetchParcels = useCallback(async () => {
    try {
      const response = await apiClient.get("/parcels")
      const data = response.data

      // API now returns array directly
      const parcelsList = Array.isArray(data) ? data : data.parcels || []

      // Store parcel data for the table
      setParcels(parcelsList)

      if (parcelsList && parcelsList.length > 0) {
        // Convert each parcel to a GeoJSON feature
        const geoJsonFormat = new GeoJSON()
        const parcelFeatures: any[] = []

        for (const parcel of parcelsList) {
          // Parcels now have geometry as GeoJSON from API
          if (parcel.geometry) {
            try {
              const feature = geoJsonFormat.readFeature(
                {
                  type: "Feature",
                  id: parcel.id,
                  properties: {
                    parcelId: parcel.id,
                    ownerName: parcel.owner?.name || "Unknown",
                    ownerEmail: parcel.owner?.email,
                    parcelName: parcel.name,
                    area: parcel.area,
                    status: parcel.status,
                  },
                  geometry: parcel.geometry,
                },
                {
                  dataProjection: "EPSG:4326",
                  featureProjection: "EPSG:3857",
                }
              ) as any
              if (Array.isArray(feature)) {
                const f = feature[0]
                if (f) parcelFeatures.push(f)
              } else {
                // Add all features with valid geometry
                if (feature) {
                  parcelFeatures.push(feature)
                }
              }
            } catch (error) {
              console.error("Error parsing parcel:", parcel, error)
            }
          } else {
            console.warn("Parcel has no geometry:", parcel)
          }
        }

        if (parcelFeatures.length > 0) {
          // Clear existing features first
          parcelsSource.current?.clear()
          parcelsSource.current?.addFeatures(parcelFeatures)

          // Fit map to parcels bounds
          const extent = parcelsSource.current?.getExtent()

          if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
            map.current?.getView().fit(extent, { padding: [50, 50, 50, 50] })
          } else {
            console.warn("Extent invalid or infinite:", extent)
          }
        } else {
          console.warn("No parcel features created")
        }
      } else {
        console.warn("No parcels returned from API:", data)
      }
    } catch (error) {
      console.error("Error fetching parcels:", error)
    }
  }, [])

  useEffect(() => {
    if (!mapContainer.current) return
    vectorSource.current = new VectorSource()
    vectorLayer.current = new VectorLayer({
      source: vectorSource.current,
      style: new Style({
        fill: new Fill({
          color: "rgba(255, 0, 0, 0.2)",
        }),
        stroke: new Stroke({
          color: "#ff0000",
          width: 2,
        }),
        image: new Circle({
          radius: 5,
          fill: new Fill({
            color: "#ff0000",
          }),
        }),
      }),
    })

    // Create vector source and layer for cadastre reference data
    cadastreSource.current = new VectorSource()
    cadastreLayerRef.current = new VectorLayer({
      source: cadastreSource.current,
      style: new Style({
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.1)",
        }),
        stroke: new Stroke({
          color: "#000000",
          width: 2,
          // lineDash: [5, 5],
        }),
        image: new Circle({
          radius: 4,
          fill: new Fill({
            color: "#0000ff",
          }),
        }),
      }),
    })

    // Create vector source and layer for saved parcels
    parcelsSource.current = new VectorSource()
    parcelsLayerRef.current = new VectorLayer({
      source: parcelsSource.current,
      style: new Style({
        fill: new Fill({
          color: "rgba(34, 197, 94, 0.15)", // green with transparency
        }),
        stroke: new Stroke({
          color: "#22c55e",
          width: 3,
        }),
        image: new Circle({
          radius: 5,
          fill: new Fill({
            color: "#22c55e",
          }),
        }),
      }),
    })

    // Create map
    map.current = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        cadastreLayerRef.current, // Cadastre reference layer (underneath)
        parcelsLayerRef.current, // Saved parcels layer
        vectorLayer.current, // User-drawn features layer (on top)
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    })

    // Add modify interaction
    const modify = new Modify({ source: vectorSource.current })
    map.current.addInteraction(modify)

    // Add select interaction - only for parcels layer, not cadastre reference
    const select = new Select({
      layers: [parcelsLayerRef.current!],
    })
    map.current.addInteraction(select)

    // Fetch cadastre data
    const fetchCadastreData = async () => {
      try {
        const response = await apiClient.get("/cadastre")
        const geojson = response.data

        if (geojson.features && geojson.features.length > 0) {
          const geoJsonFormat = new GeoJSON()
          try {
            const features = geoJsonFormat.readFeatures(geojson, {
              featureProjection: "EPSG:3857", // Web Mercator projection
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
        } else {
          console.warn("No features found in cadastre response:", geojson)
        }
      } catch (error) {
        console.error("Error fetching cadastre data:", error)
      }
    }

    fetchCadastreData()

    // Fetch parcels data
    const fetchParcels = async () => {
      try {
        const response = await apiClient.get("/parcels")
        const data = response.data

        // API now returns array directly
        const parcelsList = Array.isArray(data) ? data : data.parcels || []

        // Store parcel data for the table
        setParcels(parcelsList)

        if (parcelsList && parcelsList.length > 0) {
          // Convert each parcel to a GeoJSON feature
          const geoJsonFormat = new GeoJSON()
          const parcelFeatures: any[] = []

          for (const parcel of parcelsList) {
            // Parcels now have geometry as GeoJSON from API
            if (parcel.geometry) {
              try {
                const feature = geoJsonFormat.readFeature(
                  {
                    type: "Feature",
                    id: parcel.id,
                    properties: {
                      parcelId: parcel.id,
                      ownerName: parcel.owner?.name || "Unknown",
                      ownerEmail: parcel.owner?.email,
                      parcelName: parcel.name,
                      area: parcel.area,
                      status: parcel.status,
                    },
                    geometry: parcel.geometry,
                  },
                  {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                  }
                ) as any
                if (Array.isArray(feature)) {
                  const f = feature[0]
                  if (f) parcelFeatures.push(f)
                } else {
                  // Add all features with valid geometry
                  if (feature) {
                    parcelFeatures.push(feature)
                  }
                }
              } catch (error) {
                console.error("Error parsing parcel:", parcel, error)
              }
            } else {
              console.warn("Parcel has no geometry:", parcel)
            }
          }

          if (parcelFeatures.length > 0) {
            parcelsSource.current?.addFeatures(parcelFeatures)

            // Fit map to parcels bounds
            const extent = parcelsSource.current?.getExtent()

            if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
              map.current?.getView().fit(extent, { padding: [50, 50, 50, 50] })
            } else {
              console.warn("Extent invalid or infinite:", extent)
            }
          } else {
            console.warn("No parcel features created")
          }
        } else {
          console.warn("No parcels returned from API:", data)
        }
      } catch (error) {
        console.error("Error fetching parcels:", error)
      }
    }

    fetchParcels()

    return () => {
      if (map.current) {
        map.current.setTarget(undefined)
      }
    }
  }, [])

  const startDrawing = (type: "Polygon" | "LineString" | "Circle") => {
    if (!map.current || !vectorSource.current) return

    // Remove existing draw interaction
    if (drawInteraction.current) {
      map.current.removeInteraction(drawInteraction.current)
    }

    // Create new draw interaction
    drawInteraction.current = new Draw({
      source: vectorSource.current,
      type: type,
    })

    map.current.addInteraction(drawInteraction.current)

    drawInteraction.current.on("drawend", (event: any) => {
      const feature = event.feature
      setDrawnFeature(feature)
      map.current?.removeInteraction(drawInteraction.current!)
      setMapState({ drawing: false, drawType: null })
    })

    setMapState({ drawing: true, drawType: type })
  }

  const stopDrawing = () => {
    if (map.current && drawInteraction.current) {
      map.current.removeInteraction(drawInteraction.current)
      drawInteraction.current = null
    }
    setMapState({ drawing: false, drawType: null })
  }

  const clearAll = () => {
    if (vectorSource.current) {
      vectorSource.current.clear()
    }
    stopDrawing()
  }

  const handleSaveParcel = async (formData: ParcelFormData) => {
    if (!drawnFeature) return

    setIsSaving(true)
    try {
      const geoJsonFormat = new GeoJSON()
      const wgs84GeoJSON = geoJsonFormat.writeFeatureObject(drawnFeature, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      })

      // First, create or get the owner
      let ownerId: string
      try {
        // Create new owner - each parcel gets its own owner record
        const ownerResponse = await apiClient.post("/owners", {
          name: formData.ownerName,
          email: formData.ownerEmail,
          phone: formData.ownerPhone || null,
          address: formData.ownerAddress || null,
        })

        const ownerData = ownerResponse.data
        ownerId = ownerData.id
      } catch (error) {
        console.error("Error creating owner:", error)
        throw error
      }

      // Now create the parcel with the WGS84 geometry
      const parcelResponse = await apiClient.post("/parcels", {
        ownerId: ownerId,
        name: formData.parcelName || null,
        description: formData.parcelDescription || null,
        geometry: wgs84GeoJSON.geometry,
        area: formData.area || null,
      })

      const parcelData = parcelResponse.data
      console.log("Parcel created successfully:", parcelData)

      // Refetch parcels to show newly created one in table and map
      await fetchParcels()

      // Clear the drawn feature after successful save
      if (vectorSource.current) {
        vectorSource.current.removeFeature(drawnFeature)
      }
      setDrawnFeature(null)

      // Show success message with sonner
      toast.success(`Parcel saved successfully!`, {
        description: `ID: ${parcelData.id}`,
      })
    } catch (error) {
      console.error("Error saving parcel:", error)
      toast.error("Failed to save parcel", {
        description: "Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        {/* Header with Ribbon Toolbar */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-2">
            <h2 className="text-lg font-semibold">Cadastre Map</h2>
            <div className="flex items-center gap-2">
              {/* Drawing Tools */}
              <div className="flex items-center gap-1 rounded-md border p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => startDrawing("Polygon")}
                      variant={
                        mapState.drawType === "Polygon" ? "default" : "ghost"
                      }
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={
                        mapState.drawing && mapState.drawType !== "Polygon"
                      }
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Draw Polygon</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => startDrawing("LineString")}
                      variant={
                        mapState.drawType === "LineString" ? "default" : "ghost"
                      }
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={
                        mapState.drawing && mapState.drawType !== "LineString"
                      }
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Draw Line</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => startDrawing("Circle")}
                      variant={
                        mapState.drawType === "Circle" ? "default" : "ghost"
                      }
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={
                        mapState.drawing && mapState.drawType !== "Circle"
                      }
                    >
                      <CircleIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Draw Circle</TooltipContent>
                </Tooltip>

                {mapState.drawing && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={stopDrawing}
                        variant="secondary"
                        size="sm"
                        className="h-8 px-2"
                      >
                        Stop
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop Drawing</TooltipContent>
                  </Tooltip>
                )}

                <div className="mx-1 h-6 border-l" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={clearAll}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear All</TooltipContent>
                </Tooltip>

                {drawnFeature && (
                  <>
                    <div className="mx-1 h-6 border-l" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setDialogOpen(true)}
                          variant="default"
                          size="sm"
                          className="h-8 gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Save className="h-4 w-4" />
                          Save Parcel
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save Current Parcel</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Sidebar - Layer Controls */}
            <ResizablePanel defaultSize={25} minSize={12} maxSize={25}>
              <Card className="m-2 h-full overflow-y-auto">
                <div className="p-4">
                  <h3 className="mb-4 font-semibold">Layers</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="parcels-toggle"
                        checked={layerVisibility.parcels}
                        onChange={(e) => {
                          const newVisibility = e.target.checked
                          setLayerVisibility((prev) => ({
                            ...prev,
                            parcels: newVisibility,
                          }))
                          parcelsLayerRef.current?.setVisible(newVisibility)
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <label
                        htmlFor="parcels-toggle"
                        className="cursor-pointer text-sm font-medium"
                      >
                        Parcels
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setShowTable(!showTable)}
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 w-6 p-0"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showTable ? "Hide" : "Show"} Table
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="cadastre-toggle"
                        checked={layerVisibility.cadastre}
                        onChange={(e) => {
                          const newVisibility = e.target.checked
                          setLayerVisibility((prev) => ({
                            ...prev,
                            cadastre: newVisibility,
                          }))
                          cadastreLayerRef.current?.setVisible(newVisibility)
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <label
                        htmlFor="cadastre-toggle"
                        className="cursor-pointer text-sm font-medium"
                      >
                        Cadastre Reference
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle />

            {/* Map Area */}
            <ResizablePanel defaultSize={75} minSize={65}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                {/* Map */}
                <ResizablePanel defaultSize={70} minSize={40}>
                  <Card className="m-2 h-full overflow-hidden">
                    <div
                      ref={mapContainer}
                      className="h-full w-full bg-gray-100 dark:bg-gray-900"
                    />
                  </Card>
                </ResizablePanel>

                {/* Resizable Handle */}
                <ResizableHandle withHandle />

                {/* Bottom Panel - Parcels Data Table */}
                {showTable && (
                  <ResizablePanel defaultSize={30} minSize={15}>
                    <Card className="flex h-full flex-col overflow-hidden">
                      <div className="flex items-center justify-between border-b">
                        <h3 className="text-sm font-semibold">Parcels</h3>
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
                        {parcels.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted">
                              <tr className="border-b">
                                <th className="px-3 py-2 text-left font-medium">
                                  ID
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  Name
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  Owner
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  Email
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  Area
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  Phone
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {parcels.map((parcel) => (
                                <tr
                                  key={parcel.id}
                                  className="border-b hover:bg-muted/50"
                                >
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {parcel.id.substring(0, 8)}...
                                  </td>
                                  <td className="px-3 py-2">
                                    {parcel.name || "-"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {parcel.owner?.name || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    {parcel.owner?.email || "-"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {parcel.area
                                      ? `${parseFloat(parcel.area.toString()).toFixed(2)} m²`
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    {parcel.owner?.phone || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No parcels yet. Draw and save one to get started.
                          </div>
                        )}
                      </div>
                    </Card>
                  </ResizablePanel>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <SaveParcelDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveParcel}
          isLoading={isSaving}
        />
      </div>
    </TooltipProvider>
  )
}
