# Dynamic GIS Layer Management System

## Overview

The system automatically loads GeoJSON and KML files from project-specific folders based on the active project name. It uses regex-based matching to find the closest project match and intelligently determines file formats.

## Architecture

### Components

1. **mapLoader.ts** - Core utility functions for layer management
2. **projects.json** - Manifest file defining available projects
3. **FeatureMap.tsx** - OpenLayers map component with project layer integration

## How It Works

### 1. Project Matching

When a user selects a project (e.g., "Gura Hydro Project"), the system:

1. Fetches the projects manifest from `/data/projects.json`
2. Uses regex to find the closest matching project by comparing:
   - Project name: "Gura Hydro Project"
   - Folder name: "Gura_Hydro_Project"
3. Returns the matching project entry with its file list

### 2. File Format Detection

For each file in the project, the system determines the format:

```typescript
- *.geojson → GeoJSON format
- *.json    → GeoJSON format
- *.kml     → KML format (with extractStyles: true)
- Other     → Logged as unsupported
```

### 3. Layer Loading

For each file:

1. Create a VectorSource pointing to the file URL
2. Apply appropriate format parser (GeoJSON or KML)
3. Create a VectorLayer with projectId metadata
4. Add layer to the map

### 4. Layer Lifecycle

```
User selects project
    ↓
activeProject updates in Zustand store
    ↓
FeatureMap detects change via useEffect
    ↓
syncProjectLayers() called
    ↓
Clear existing project layers
    ↓
Load new project layers
    ↓
Map displays all project GIS data
```

## API Reference

### Core Functions

#### `syncProjectLayers(activeProjectName, map)`

**Main function to load all layers for a project**

```typescript
import { syncProjectLayers } from "@/lib/mapLoader"

// Called automatically in FeatureMap on project change
await syncProjectLayers("Gura Hydro Project", mapInstance)
```

**Parameters:**

- `activeProjectName` (string): Name of the active project
- `map` (Map): OpenLayers Map instance

**Behavior:**

- Fetches manifest from `/data/projects.json`
- Finds matching project using regex
- Clears old project layers
- Loads all files for new project
- Logs progress to console

#### `findMatchingProject(name, projects)`

**Find a project by name using flexible regex matching**

```typescript
const project = findMatchingProject("Gura", projects)
// Matches: "Gura Hydro Project", "Gura_Hydro_Project", "gura-hydro"
```

#### `getFileFormat(fileName)`

**Determine file format from extension**

```typescript
getFileFormat("buildings.geojson") // "geojson"
getFileFormat("features.kml")       // "kml"
getFileFormat("unknown.txt")        // "unknown"
```

#### `createVectorLayer(fileName, folderPath, projectId)`

**Create a single vector layer from a file**

```typescript
const layer = createVectorLayer(
  "buildings.geojson",
  "Gura_Hydro_Project",
  "gura-hydro-001"
)
map.addLayer(layer)
```

#### `clearProjectLayers(projectId, map)`

**Remove all layers for a specific project**

```typescript
clearProjectLayers("gura-hydro-001", mapInstance)
```

## Manifest Format

The `projects.json` file defines available projects:

```json
{
  "projects": [
    {
      "id": "gura-hydro-001",
      "name": "Gura Hydro Project",
      "folder": "Gura_Hydro_Project",
      "description": "Optional description",
      "files": [
        "buildings.geojson",
        "canal.geojson",
        "forebay.geojson",
        "penstock.geojson",
        "power-station.geojson",
        "roads.geojson"
      ]
    }
  ]
}
```

**Schema:**

- `id` (string): Unique project identifier used as projectId metadata
- `name` (string): Display name for the project
- `folder` (string): Folder name in `/src/assets/data/`
- `description` (string, optional): Project description
- `files` (array): List of GeoJSON/KML files to load

## File Organization

```
field-tool/
├── public/
│   └── data/
│       └── projects.json           # Manifest file
├── src/
│   ├── assets/
│   │   └── data/
│   │       ├── Gura_Hydro_Project/
│   │       │   ├── buildings.geojson
│   │       │   ├── canal.geojson
│   │       │   ├── forebay.geojson
│   │       │   ├── penstock.geojson
│   │       │   ├── power-station.geojson
│   │       │   └── roads.geojson
│   │       └── imenti/
│   ├── lib/
│   │   └── mapLoader.ts            # Layer management utilities
│   └── components/
│       └── maps/
│           └── FeatureMap.tsx       # Map component with layer sync
```

## Layer Metadata

Each loaded layer includes metadata:

```typescript
{
  projectId: "gura-hydro-001",     // Used to group/clear layers
  fileName: "buildings.geojson",    // Original file name
  layerName: "buildings"            // File name without extension
}
```

Access metadata:

```typescript
const projectId = layer.get("projectId")
const fileName = layer.get("fileName")
const layerName = layer.get("layerName")
```

## Regex Matching Algorithm

The system uses flexible regex to match project names:

```
Input: "Gura Hydro"
Regex: /Gura.*Hydro/i (case-insensitive)

Matches:
✓ "Gura Hydro Project"
✓ "Gura_Hydro_Project"
✓ "gura hydro"
✓ "GURA HYDRO PROJECT"
```

Matching tries both project name and folder name:

```typescript
regex.test(project.name) || regex.test(project.folder)
```

## Error Handling

The system handles:

✓ Missing projects.json - Falls back to hardcoded manifest
✓ Unsupported file formats - Logs warning, skips file
✓ Missing files - VectorSource handles gracefully
✓ Invalid project names - Returns early with console warning

```typescript
try {
  await syncProjectLayers(projectName, map)
} catch (error) {
  console.error("Failed to load project layers:", error)
}
```

## KML-Specific Features

For KML files, `extractStyles: true` is enabled:

```typescript
format: new KML({
  extractStyles: true  // Preserves Google Earth Pro styling
})
```

This preserves:

- Line colors and widths
- Polygon fills and outlines
- Text labels and styles
- Custom styling from KML files

## Performance Considerations

**Layer Loading:**

- All files for a project load asynchronously
- Each file is a separate VectorLayer for granular control
- Layers are indexed by projectId for fast clearing

**Manifest:**

- Cached in memory after first fetch
- Can be updated by calling `generateManifestFromDirectory()` again

**Rendering:**

- OpenLayers handles large GeoJSON automatically
- Consider using clustering for high-density features

## Adding New Projects

1. Create folder in `/src/assets/data/` (e.g., `new_project/`)
2. Add GeoJSON or KML files to the folder
3. Update `projects.json`:
   ```json
   {
     "id": "new-project-001",
     "name": "New Project",
     "folder": "new_project",
     "files": ["file1.geojson", "file2.geojson"]
   }
   ```
4. Restart the app (manifest is cached)

## Debugging

Enable console logging to debug layer loading:

```typescript
// Check if project found
// Check if files loaded
// Check file URLs

// In browser console:
console.log(map.getLayers().getArray()) // See all layers
map.getLayers().getArray().forEach(l => {
  console.log(l.get("layerName"), l.get("projectId"))
})
```

## Browser DevTools

To inspect loaded features:

1. Open DevTools (F12)
2. Go to Network tab → Search for "geojson"
3. Check XHR responses to see file contents
4. Use Console to access layer data

## Limitations & Future Enhancements

**Current:**

- Projects defined in hardcoded manifest
- File URLs relative to `/src/assets/data/`
- No layer visibility toggle UI
- No layer styling/customization UI

**Future:**

- [ ] Admin interface to add/edit projects
- [ ] Layer visibility toggle in sidebar
- [ ] Custom layer styling UI
- [ ] Dynamic layer legend generation
- [ ] Layer search/filter functionality
- [ ] Export features to GeoJSON
- [ ] Real-time data updates from API

## Troubleshooting

### Layers not appearing

```
1. Check browser console for errors
2. Verify files exist in `/src/assets/data/{folder}/`
3. Check projects.json has correct folder name and file list
4. Verify GeoJSON is valid (use geojson.io)
5. Check OpenLayers projection is correct (EPSG:3857)
```

### 404 errors on file fetch

```
1. Confirm file path is correct relative to /src/assets/data/
2. Check for typos in projects.json file list
3. Verify vite serves /src/assets/data/ correctly
```

### Features not styled correctly (KML)

```
1. Ensure extractStyles: true is set (default)
2. Validate KML formatting
3. Check if styles are defined in KML file
```

## Example Usage

```typescript
import { syncProjectLayers } from "@/lib/mapLoader"
import { useProjectStore } from "@/store/useProjectStore"
import Map from "ol/Map"

export function MyMapComponent() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const { activeProject } = useProjectStore()

  // Initialize map
  useEffect(() => {
    mapInstance.current = new Map({
      target: mapRef.current,
      // ... map config
    })
  }, [])

  // Load project layers when project changes
  useEffect(() => {
    if (mapInstance.current && activeProject) {
      syncProjectLayers(activeProject.name, mapInstance.current)
    }
  }, [activeProject?.id])

  return <div ref={mapRef} />
}
```
