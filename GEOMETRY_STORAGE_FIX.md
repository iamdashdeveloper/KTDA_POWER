# Geometry Storage Fix - PostGIS GeoJSON Integration

## Problem

Features were being created with `NULL` geometry values in the database, even though GeoJSON geometry was being passed from the upload handler.

## Root Cause

Prisma ORM cannot write directly to PostGIS `Unsupported("geometry")` column types. The geometry field was being ignored during feature creation.

## Solution

Use raw SQL with PostGIS's `ST_GeomFromGeoJSON()` function to properly store geometry after feature creation.

---

## Implementation Details

### Two-Step Feature Creation Process

**Step 1: Create Feature Record**

```typescript
const feature = await fastify.prisma.feature.create({
  data: {
    name,
    projectId,
    details: details || {},
    parentId: parentId || null,
    // Note: geometry field intentionally omitted
  },
})
```

**Step 2: Update Geometry Using Raw SQL**

```typescript
if (geometry) {
  try {
    const geomJson = JSON.stringify(geometry)
    await fastify.prisma.$executeRaw`
      UPDATE "Feature"
      SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
      WHERE id = ${feature.id}
    `
  } catch (geomErr) {
    console.warn(`Failed to save geometry for ${feature.id}:`, geomErr)
  }
}
```

### PostGIS Functions Used

- `ST_GeomFromGeoJSON()` - Converts GeoJSON to PostGIS geometry type
- `::jsonb` - PostgreSQL type casting for JSON to JSONB

---

## Updated Endpoints

### POST /features (Create Single Feature)

- Accepts `{ name, projectId, geometry (GeoJSON), details, parentId }`
- Saves feature metadata first
- Updates geometry in separate raw SQL query
- Returns complete feature

### POST /features/upload (Bulk Upload)

- Parses file (KML, KMZ, GeoJSON, GPX) using unified parser
- Creates parent feature from filename
- Creates child features one-by-one
- For each child, saves geometry using `ST_GeomFromGeoJSON()`
- Returns count of successfully saved features

---

## Data Flow After Fix

```
Frontend (GeoDataUpload)
    ↓
Upload file to POST /features/upload
    ↓
API: Parse file with parseSpatialFile()
    ↓
Extract GeoJSON features array
    ↓
For each feature:
  1. Create feature row (name, projectId, details, parentId)
  2. Extract geometry from feature
  3. Call ST_GeomFromGeoJSON(geometry) via raw SQL
  4. Update feature row with geometry
    ↓
Return response with feature count
    ↓
Frontend: Display success toast
    ↓
User can now view features on map with geometry
```

---

## Geometry Retrieval (Already Fixed)

When fetching features, the API uses:

```sql
SELECT
  id,
  name,
  CASE
    WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
    ELSE NULL
  END as geometry,
  ...
FROM "Feature"
```

This retrieves geometry as valid GeoJSON using PostGIS's `ST_AsGeoJSON()` function.

---

## Testing the Fix

### 1. Upload a GeoJSON file

- Go to Features page
- Click "Upload Spatial Data"
- Select a GeoJSON file
- Click "Upload"
- Should see success message with feature count

### 2. Verify geometry in database

```sql
SELECT id, name, ST_AsText(geometry) as wkt
FROM "Feature"
WHERE geometry IS NOT NULL
LIMIT 5;
```

Should show WKT geometry like:

```
POINT(36.88 -0.50)
LINESTRING(36.88 -0.50, 36.89 -0.51)
POLYGON((36.88 -0.50, 36.89 -0.50, 36.89 -0.51, 36.88 -0.51, 36.88 -0.50))
```

### 3. Check map rendering

- Refresh Features page
- Features should now render on the map with proper styling
- Click features to select them

---

## File Changes

### `/apps/api/src/routes/features/index.ts`

**POST /features endpoint:**

- Creates feature without geometry
- Updates geometry using `ST_GeomFromGeoJSON()` raw SQL query

**POST /features/upload endpoint:**

- For each parsed feature:
  1. Creates base feature record
  2. Updates geometry using raw SQL
  3. Logs success/warning messages

---

## Error Handling

### Geometry Save Failures

- If geometry update fails, feature is still created (graceful degradation)
- Warning logged but upload continues
- Feature can still be used without geometry (for non-spatial data)

### GeoJSON Parsing

- Invalid GeoJSON geometry: Caught by PostGIS and logged as warning
- Malformed JSON: Caught before SQL execution
- NULL geometry: Skipped, feature created without geometry

---

## Performance Notes

- Two-step process adds minimal overhead (one extra UPDATE query)
- Uses parameterized queries (prevents SQL injection)
- Geometry conversion happens in database (efficient)
- No in-memory geometry processing

---

## Supported Geometry Types

All GeoJSON geometry types supported:

- Point
- LineString
- Polygon
- MultiPoint
- MultiLineString
- MultiPolygon
- GeometryCollection

---

## Next Steps (Optional)

1. **Batch Inserts** - For bulk uploads, use multi-row INSERT with geometry
2. **Validation** - Add geometry validation before storage
3. **Simplification** - Simplify complex geometries before storage
4. **Indexing** - Add spatial indexes on geometry column for faster queries

---

## References

- [PostGIS ST_GeomFromGeoJSON()](https://postgis.net/docs/ST_GeomFromGeoJSON.html)
- [PostGIS ST_AsGeoJSON()](https://postgis.net/docs/ST_AsGeoJSON.html)
- [GeoJSON RFC 7946](https://tools.ietf.org/html/rfc7946)
