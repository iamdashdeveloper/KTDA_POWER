# Feature Fetch Flow - Complete Analysis

## Overview

Features are fetched from the database using raw SQL queries with PostGIS geometry conversion, then processed by the frontend to display on the map.

---

## 1. Database Layer - Feature Retrieval

### Location

`/apps/api/src/routes/features/index.ts`

### Endpoint: GET `/features` (All Features)

**SQL Query Used:**

```sql
SELECT
  id,
  "projectId",
  name,
  CASE
    WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
    ELSE NULL
  END as geometry,
  details,
  "createdAt",
  images,
  "parentId"
FROM "Feature"
WHERE "parentId" IS NULL
ORDER BY "createdAt" DESC
```

**Key Features:**

- ✅ Uses raw SQL (`$queryRaw`) instead of ORM to properly handle PostGIS geometry
- ✅ `ST_AsGeoJSON()` converts PostGIS binary geometry to valid GeoJSON
- ✅ Only fetches parent features (`WHERE "parentId" IS NULL`)
- ✅ Results ordered by creation date (newest first)
- ✅ Includes all necessary fields for display (id, name, geometry, details, images, etc.)

**Post-Processing:**

```typescript
// For each parent feature:
// 1. Fetch subfeatures with same query pattern
// 2. Parse geometry JSON strings to objects
// 3. Create nested structure with subFeatures array
// 4. Return complete feature tree
```

### Endpoint: GET `/features/:id` (Single Feature)

**SQL Queries Used:**

**Main Feature:**

```sql
SELECT
  id,
  "projectId",
  name,
  CASE
    WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
    ELSE NULL
  END as geometry,
  details,
  "createdAt",
  images,
  "parentId"
FROM "Feature"
WHERE id = ${featureId}
```

**Subfeatures** (if parent):

```sql
SELECT ... FROM "Feature"
WHERE "parentId" = ${featureId}
ORDER BY "createdAt" DESC
```

**Parent Feature** (if child):

```sql
SELECT ... FROM "Feature"
WHERE id = ${feature.parentId}
```

---

## 2. Network Layer - API Response

### Response Format

**GET `/features` Response:**

```json
[
  {
    "id": "cmo2ph77i000070uhe0a38j4n",
    "name": "Iraru canal",
    "projectId": null,
    "geometry": {
      "type": "LineString",
      "coordinates": [[36.88, -0.50], [36.89, -0.51], ...]
    },
    "details": {},
    "createdAt": "2026-04-17T10:30:00Z",
    "images": [],
    "parentId": null,
    "subFeatures": [
      {
        "id": "sub123",
        "name": "Sub-feature",
        "geometry": { ... },
        ...
      }
    ]
  },
  ...
]
```

### Response Processing

1. Raw SQL returns geometry as JSON string: `"geometry": "{\"type\": \"LineString\", ...}"`
2. `JSON.parse()` converts it to proper object: `"geometry": { "type": "LineString", ... }`
3. Frontend receives valid GeoJSON geometry objects

---

## 3. Frontend Layer - Feature Consumption

### Location

`/apps/admin-web/src/pages/Features.tsx`

### Fetch Function

```typescript
const fetchFeatures = async () => {
  try {
    setLoading(true)
    const response = await apiClient.get("/features")
    const data = response.data || []
    setFeatures(data)

    // Auto-show parent layers on first load
    if (data.length > 0 && visibleLayers.size === 0) {
      const parentIds = new Set<string>(
        data.filter((f: Feature) => !f.parentId).map((f: Feature) => f.id)
      )
      setVisibleLayers(parentIds)
    }
  } catch (error) {
    console.error("Error fetching features:", error)
    toast.error("Failed to load features")
  } finally {
    setLoading(false)
  }
}
```

### Data Flow

1. `apiClient.get("/features")` - Fetch from API
2. Extract `response.data` array
3. Store in React state: `setFeatures(data)`
4. Auto-populate visible layers with parent feature IDs
5. Pass to map component for rendering

### Feature Type

```typescript
export interface Feature {
  id: string
  name: string
  projectId?: string | null
  geometry?: any  // GeoJSON geometry object
  createdAt: string
  details?: any
  images?: string[]
  parentId?: string
  subFeatures?: Feature[]
}
```

---

## 4. Map Layer - Geometry Rendering

### Location

`/apps/admin-web/src/components/maps/FeatureMap.tsx`

### Geometry Extraction

```typescript
const getGeometryFromFeature = (feature: Feature): any => {
  if (feature.geometry) return feature.geometry
  if (feature.details?.geometry) return feature.details.geometry
  return null
}
```

**Processing Steps:**

1. Check if feature has direct `geometry` property
2. Fall back to `details.geometry` if not found
3. Return null if neither exists

### Feature Creation for OpenLayers

```typescript
const createOLFeature = (feature: Feature): OLFeature | null => {
  const geometry = getGeometryFromFeature(feature)
  if (!geometry) return null

  try {
    const geoJSONFormat = new GeoJSON({
      featureProjection: "EPSG:3857",
    })

    const geoJSONFeature: any = {
      type: "Feature",
      geometry: geometry,
      properties: {
        id: feature.id,
        name: feature.name,
        parentId: feature.parentId,
      },
    }

    return geoJSONFormat.readFeature(geoJSONFeature) as OLFeature
  } catch (error) {
    console.error(`[FeatureMap] Failed to create OL feature for ${feature.name}:`, {...})
    return null
  }
}
```

### Map Rendering

- **Points**: Blue circle, 6px radius
- **LineStrings/MultiLineStrings**: Green stroke, 3px width
- **Polygons/MultiPolygons**: Red fill (30% opacity), red stroke, 2px width

---

## 5. File Upload Flow

### Location

`/apps/api/src/routes/features/index.ts` - POST `/features/upload`

### Unified Parser

Uses `parseSpatialFile()` from `/apps/api/src/utils/spatial-parser.ts`

**Supported Formats:**

- **GeoJSON/JSON** - Direct JSON parsing
- **KML** - Parsed via `@tmcw/togeojson`
- **KMZ** - Extracted from ZIP, then parsed as KML
- **GPX** - Parsed via `@tmcw/togeojson`

### Upload Process

1. **Frontend** (`GeoDataUpload.tsx`)
   - Select file via drag-drop or file input
   - Validate file type and size (max 50MB)
   - Send FormData with file to `/features/upload`

2. **Backend Processing**
   - Receive file buffer
   - Call `parseSpatialFile(fileBuffer, filename)`
   - Unified parser detects format and converts to GeoJSON
   - Extract individual features from FeatureCollection
   - Create parent feature (named from filename)
   - Create child features with parent reference

3. **Database Storage**
   - Parent feature: Stores upload metadata
   - Child features: Store individual features with geometry
   - All geometry stored in PostGIS format

4. **Response**
   ```json
   {
     "success": true,
     "count": 3,
     "features": [...],
     "message": "3 features uploaded successfully"
   }
   ```

---

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: Features Page                                 │
│ - fetchFeatures() called on mount                       │
│ - GET /features                                         │
│ - Store in React state                                  │
│ - Pass to FeatureMap component                          │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP GET /features
                  ▼
┌─────────────────────────────────────────────────────────┐
│ API: Features Route                                     │
│ - Query Feature table with PostGIS ST_AsGeoJSON()       │
│ - Fetch parent features only (parentId IS NULL)        │
│ - For each parent: fetch subfeatures                    │
│ - Convert geometry JSON strings to objects              │
│ - Return nested structure                              │
└─────────────────┬───────────────────────────────────────┘
                  │ JSON response with features
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: FeatureMap Component                          │
│ - Extract geometry from each feature                    │
│ - Create OLFeature objects                              │
│ - Apply styling (color, width, etc)                     │
│ - Add to vector layer                                   │
│ - Render on OpenLayers map                              │
└─────────────────────────────────────────────────────────┘

Upload Flow:
┌─────────────────────────────────────────────────────────┐
│ Frontend: GeoDataUpload Component                       │
│ - Select file (KML, KMZ, GeoJSON, GPX)                  │
│ - POST /features/upload with FormData                   │
└─────────────────┬───────────────────────────────────────┘
                  │ File + Metadata
                  ▼
┌─────────────────────────────────────────────────────────┐
│ API: Upload Handler                                     │
│ - Call parseSpatialFile() (unified handler)             │
│ - Detect format, convert to GeoJSON                     │
│ - Extract features array                                │
│ - Create parent feature in DB                           │
│ - Create child features with geometry                   │
│ - Return response with count                            │
└─────────────────┬───────────────────────────────────────┘
                  │ Success response
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: UI                                            │
│ - Show success toast                                    │
│ - Call onUploadSuccess callback                         │
│ - Refresh feature list (optional)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Key Components & Files

| Component            | Purpose                                      | Location                                             |
| -------------------- | -------------------------------------------- | ---------------------------------------------------- |
| **Features Page**    | Main page, fetches & displays all features   | `/apps/admin-web/src/pages/Features.tsx`             |
| **FeatureMap**       | OpenLayers map component, renders geometries | `/apps/admin-web/src/components/maps/FeatureMap.tsx` |
| **GeoDataUpload**    | File upload UI component                     | `/apps/admin-web/src/components/GeoDataUpload.tsx`   |
| **Features Route**   | API endpoints for CRUD                       | `/apps/api/src/routes/features/index.ts`             |
| **Spatial Parser**   | Unified file format parser                   | `/apps/api/src/utils/spatial-parser.ts`              |
| **Geospatial Utils** | PostGIS conversion functions                 | `/apps/api/src/utils/geospatial.ts`                  |

---

## 8. Performance & Optimization

### Current Approach

- ✅ Single request for all parent features
- ✅ N+1 subfeature queries (one per parent)
- ✅ In-memory JSON parsing
- ✅ No pagination/filtering

### Potential Improvements

1. **Batch subfeature queries** - Join subfeatures in single query
2. **Add pagination** - Limit features returned
3. **Add filtering** - By project, type, etc.
4. **Cache geometry** - Don't reparse on every fetch
5. **GeoJSON simplification** - Reduce coordinate precision for network

---

## 9. Error Handling

### Database Level

- Missing geometry: Handled by CASE statement (returns NULL)
- Invalid PostGIS: Caught in try-catch
- Connection errors: Fastify returns 500 status

### Frontend Level

- API errors: Toast notification
- Invalid geometry: Feature skipped with console warning
- Missing data: Handled with optional chaining

### Upload Level

- Invalid file type: Client-side validation
- Unsupported format: Parser throws error
- File size: 50MB limit enforced

---

## 10. Testing

### Available Test File

`/v4/test-parser.ts` - Tests spatial file parsing with:

- GeoJSON files
- KML files
- GPX files (if available)

### Run Tests

```bash
pnpm exec ts-node test-parser.ts
```

---

## Summary

**Features are fetched using:**

1. ✅ **Raw SQL queries** with PostGIS `ST_AsGeoJSON()` for proper geometry handling
2. ✅ **Nested query pattern** (parent + subfeatures)
3. ✅ **JSON parsing** on server-side to convert geometry strings
4. ✅ **Standard GeoJSON format** for easy frontend consumption
5. ✅ **OpenLayers library** for map rendering
6. ✅ **Unified file parser** for uploads

**Architecture is clean, well-structured, and ready for scale.**
