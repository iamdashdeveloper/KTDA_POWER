import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GeoDataUpload } from "../components/GeoDataUpload"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft } from "lucide-react"

export function FeaturesUpload() {
  const navigate = useNavigate()
  const [uploadedCount, setUploadedCount] = useState(0)

  const handleUploadSuccess = (count: number) => {
    setUploadedCount(count)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/features")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Features
        </Button>
      </div>

      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Upload GeoData</h1>
          <p className="mt-2 text-muted-foreground">
            Import geographical features from KML, KMZ, or GeoJSON files. These files will be processed and added to your features database.
          </p>
        </div>

        <GeoDataUpload onUploadSuccess={handleUploadSuccess} />

        {uploadedCount > 0 && (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">
              ✓ Successfully uploaded {uploadedCount} feature{uploadedCount !== 1 ? "s" : ""}!
            </p>
            <p className="mt-2 text-sm text-green-700">
              The features have been added to your database and will appear in the features list.
            </p>
            <Button
              onClick={() => navigate("/features")}
              variant="outline"
              className="mt-4"
            >
              View All Features
            </Button>
          </div>
        )}

        <div className="mt-12 space-y-6 rounded-lg border border-muted bg-muted/50 p-6">
          <div>
            <h3 className="font-semibold">Supported Formats</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• <strong>KML</strong> - Keyhole Markup Language for geographic data</li>
              <li>• <strong>KMZ</strong> - Compressed KML files</li>
              <li>• <strong>GeoJSON</strong> - Open standard for encoding geographic data</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">File Requirements</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Maximum file size: 50 MB</li>
              <li>• Must contain valid geographic coordinates</li>
              <li>• Supported geometry types: Point, LineString, Polygon</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">What Happens After Upload</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• File is parsed and validated</li>
              <li>• Features are extracted from the file</li>
              <li>• Each feature is saved to the database with its geometry</li>
              <li>• Features become visible in your features list</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
