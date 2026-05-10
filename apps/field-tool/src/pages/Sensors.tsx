import { useState, useEffect } from "react"
import { Page } from "konsta/react"
import { CloudRain, Zap, Plus, ArrowLeft, Calendar, Droplets, Activity, MapPin, Loader2, ClipboardList } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Geolocation } from "@capacitor/geolocation"

interface SensorType {
  id: string
  name: string
  description: string
  icon: typeof CloudRain
}

const SENSOR_TYPES: SensorType[] = [
  {
    id: "rainguage",
    name: "Rain Gauge",
    description: "Monitor precipitation levels at the station.",
    icon: CloudRain,
  },
  {
    id: "meter",
    name: "Electricity Meter",
    description: "Track energy consumption and meter readings.",
    icon: Zap,
  },
]

interface RainfallEntry {
  date: string
  amount: number // in mm
  notes?: string
  location?: { lat: number; lng: number }
}

interface MeterEntry {
  date: string
  reading: number // in kWh
  consumption: number
  location?: { lat: number; lng: number }
}

export default function Sensors() {
  const [selectedSensor, setSelectedSensor] = useState<SensorType | null>(null)
  
  // Mock data states
  const [rainfallData, setRainfallData] = useState<RainfallEntry[]>([
    { date: "2024-05-10", amount: 12.5, notes: "Steady rain throughout the morning", location: { lat: -1.286389, lng: 36.817223 } },
    { date: "2024-05-09", amount: 0, notes: "Clear skies", location: { lat: -1.286389, lng: 36.817223 } },
    { date: "2024-05-08", amount: 4.2, notes: "Light drizzle", location: { lat: -1.286389, lng: 36.817223 } },
  ])
  
  const [meterData, setMeterData] = useState<MeterEntry[]>([
    { date: "2024-05-10", reading: 12540.5, consumption: 25.2, location: { lat: -1.286389, lng: 36.817223 } },
    { date: "2024-05-09", reading: 12515.3, consumption: 22.8, location: { lat: -1.286389, lng: 36.817223 } },
    { date: "2024-05-08", reading: 12492.5, consumption: 24.1, location: { lat: -1.286389, lng: 36.817223 } },
  ])

  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
  const [logValue, setLogValue] = useState("")
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    if (isLogDialogOpen) {
      captureLocation()
    }
  }, [isLogDialogOpen])

  const captureLocation = async () => {
    setIsLocating(true)
    try {
      // Check for permissions first
      const permissions = await Geolocation.checkPermissions()
      if (permissions.location !== 'granted') {
        await Geolocation.requestPermissions()
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      })

      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    } catch (error) {
      console.error("Error capturing location with Capacitor:", error)
      // Fallback to web geolocation if capacitor fails
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          },
          (err) => console.error("Web Geolocation fallback failed:", err),
          { enableHighAccuracy: true }
        )
      }
    } finally {
      setIsLocating(false)
    }
  }

  const handleLogReading = () => {
    const today = new Date().toISOString().split('T')[0]
    const value = parseFloat(logValue)
    
    if (isNaN(value)) return

    const location = currentLocation || undefined

    if (selectedSensor?.id === "rainguage") {
      setRainfallData([{ date: today, amount: value, notes: "Manual entry", location }, ...rainfallData])
    } else if (selectedSensor?.id === "meter") {
      const lastReading = meterData[0]?.reading || 0
      setMeterData([{ date: today, reading: value, consumption: value - lastReading, location }, ...meterData])
    }
    
    setLogValue("")
    setCurrentLocation(null)
    setIsLogDialogOpen(false)
  }

  // Reusable Log Dialog Component
  const LogReadingDialog = ({ trigger }: { trigger: React.ReactNode }) => (
    <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="rounded-none border-2 max-w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tight font-black">Record {selectedSensor?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-dashed">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Entry Date</Label>
              <p className="text-sm font-mono font-bold">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right space-y-1">
              <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center justify-end gap-1">
                <MapPin className="h-3 w-3" />
                Geolocation
              </Label>
              {isLocating ? (
                <div className="flex items-center gap-2 text-xs text-primary animate-pulse font-bold uppercase">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fixing GPS...
                </div>
              ) : currentLocation ? (
                <p className="text-[10px] font-mono text-primary font-bold">
                  {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </p>
              ) : (
                <p className="text-[10px] font-mono text-destructive uppercase font-bold">Location Required</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading" className="text-xs uppercase font-black tracking-widest text-muted-foreground">
              Reading Value ({selectedSensor?.id === "rainguage" ? "mm" : "kWh"})
            </Label>
            <Input
              id="reading"
              type="number"
              placeholder="0.00"
              value={logValue}
              onChange={(e) => setLogValue(e.target.value)}
              className="rounded-none border-2 h-12 text-lg font-mono font-bold focus-visible:ring-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleLogReading} 
            className="w-full rounded-none h-12 font-black uppercase tracking-widest"
            disabled={isLocating || !logValue}
          >
            Authorize & Save Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (selectedSensor) {
    return (
      <Page>
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="p-4 border-b bg-card sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedSensor(null)} className="rounded-none">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary">
                  <selectedSensor.icon className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">{selectedSensor.name}</h1>
              </div>
            </div>

            <LogReadingDialog 
              trigger={
                <Button className="gap-2 rounded-none h-9 text-xs">
                  <Plus className="h-3 w-3" />
                  New Log
                </Button>
              }
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-auto space-y-6">
            
            <div className="flex flex-row items-center justify-between gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedSensor(null)}
                className="sm:w-auto px-2 rounded-none font-semibold text-sm border-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sensors Menu
              </Button>
              <LogReadingDialog 
                trigger={
                  <Button size="sm" className="sm:w-auto px-2 rounded-none font-semibold text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Reading
                  </Button>
                }
              />
              
            </div>

            <div className="border bg-card shadow-sm">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="font-bold text-xs flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Logging History
                </h3>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1">
                  {rainfallData.length} Records
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/5">
                      <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date / Location</th>
                      <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {selectedSensor.id === "rainguage" ? "Rainfall" : "Reading"}
                      </th>
                      {selectedSensor.id === "meter" && (
                        <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Usage</th>
                      )}
                      <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedSensor.id === "rainguage" ? (
                      rainfallData.map((entry, i) => (
                        <tr key={i} className="hover:bg-muted/5 transition-colors group">
                          <td className="p-4">
                            <div className="text-sm font-mono font-bold">{entry.date}</div>
                            {entry.location && (
                              <div className="text-[9px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {entry.location.lat.toFixed(4)}, {entry.location.lng.toFixed(4)}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-sm font-bold">
                            <span className="inline-flex items-center gap-1.5 text-primary">
                              <Droplets className="h-3.5 w-3.5" />
                              {entry.amount.toFixed(1)} mm
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 px-2 py-0.5">
                              Synced
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      meterData.map((entry, i) => (
                        <tr key={i} className="hover:bg-muted/5 transition-colors">
                          <td className="p-4">
                            <div className="text-sm font-mono font-bold">{entry.date}</div>
                            {entry.location && (
                              <div className="text-[9px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {entry.location.lat.toFixed(4)}, {entry.location.lng.toFixed(4)}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-sm font-bold font-mono">{entry.reading.toFixed(1)} kWh</td>
                          <td className="p-4 text-sm">
                            <span className="inline-flex items-center gap-1 text-primary font-bold">
                              <Activity className="h-3.5 w-3.5" />
                              +{entry.consumption.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 px-2 py-0.5">
                              Synced
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="p-6 mt-16 bg-background min-h-full">
        <header className="mt-2">
          <div className="h-1 w-12 bg-primary mt-2" />
          <p className="text-muted-foreground mt-4 font-medium text-sm">Industrial monitoring & data collection terminal</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {SENSOR_TYPES.map((sensor) => (
            <Card 
              key={sensor.id} 
              className="group cursor-pointer hover:border-primary transition-all rounded-none border-2 active:bg-muted/10 shadow-sm"
              onClick={() => setSelectedSensor(sensor)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="p-3 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <sensor.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold uppercase tracking-tight">{sensor.name}</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground uppercase">{sensor.id === "rainguage" ? "Meteorological" : "Electrical"}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{sensor.description}</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-none border-2 font-black uppercase text-[10px] tracking-widest h-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSensor(sensor);
                    }}
                  >
                    <ClipboardList className="h-3 w-3 mr-1" />
                    History
                  </Button>
                  <Button 
                    size="sm" 
                    className="rounded-none font-black uppercase text-[10px] tracking-widest h-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSensor(sensor);
                      setIsLogDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Quick Log
                  </Button>
                </div>

                <div className="flex items-center justify-between border-t pt-4 border-dashed">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                    Status: Online
                  </div>
                  <div className="text-[9px] font-mono text-primary font-bold">
                    Last: Today
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  )
}

