# Geometry Issue: Complete Solution Summary

## Problem Statement

Features were being fetched from the database but displaying `geometry: null`, preventing them from rendering on the OpenLayers map.

## Root Cause Analysis

**Primary Issue:** Prisma ORM cannot write to PostgreSQL's `Unsupported("geometry")` custom type.

**Specific Problem:**

- The PUT `/features/:id` update endpoint was attempting to update geometry through Prisma
- Prisma silently skips unsupported field types
- Result: Geometry field was never actually updated in the database

**Why This Happened:**

```typescript
// ❌ This doesn't work - Prisma ignores Unsupported types
await prisma.feature.update({
  data: {
    geometry: geoJsonObject  // Ignored by Prisma
  }
})
```

## Complete Solution

### 1. **POST /features - Create Feature** ✅ ALREADY FIXED

Saves geometry using raw SQL:

```typescript
await fastify.prisma.$executeRaw`
  UPDATE "Feature"
  SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
  WHERE id = ${feature.id}
`
```

### 2. **POST /features/upload - Bulk Upload** ✅ ALREADY FIXED

Two-step process for each feature:

1. Create feature record with Prisma
2. Update geometry with raw SQL

### 3. **PUT /features/:id - Update Feature** ✅ NOW FIXED

Separated geometry update from other fields:

```typescript
// Update non-geometry fields with Prisma
const feature = await prisma.feature.update({
  where: { id: request.params.id },
  data: { name, details, parentId }  // Prisma handles these
})

// Update geometry separately with raw SQL
if (geometry) {
  await fastify.prisma.$executeRaw`
    UPDATE "Feature"
    SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
    WHERE id = ${request.params.id}
  `
}
```

### 4. **GET /features - Retrieve Features** ✅ ALREADY FIXED

Uses PostGIS to convert geometry to GeoJSON:

```typescript
CASE
  WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
  ELSE NULL
END as geometry
```

## Data Flow (Complete Pipeline)

```
1. Frontend File Upload
   ↓
2. POST /features/upload
   - parseSpatialFile() → Converts KML/KMZ/GeoJSON/GPX to GeoJSON
   - Creates Feature record (no geometry yet)
   - Executes: UPDATE "Feature" SET geometry = ST_GeomFromGeoJSON(geojson)
   ↓
3. Database (PostgreSQL + PostGIS)
   - Stores geometry as WKT (Well-Known Text) - PostGIS native format
   - Automatically indexed for fast spatial queries
   ↓
4. GET /features
   - Executes: ST_AsGeoJSON(geometry)::jsonb
   - Converts WKT back to GeoJSON for API response
   ↓
5. Frontend Receives
   - Feature objects with valid geometry
   ↓
6. FeatureMap Component
   - createOLFeature() validates geometry exists
   - Creates OpenLayers features for rendering
   - Points: Blue circles, Lines: Green, Polygons: Red
   ↓
7. Map Display
   - All features render with correct styling
```

## File Changes Made

### 1. `/apps/api/src/routes/features/index.ts`

**Changed:** PUT endpoint for updating features

**From:** Attempted to update geometry through Prisma

```typescript
// ❌ This silently failed
const feature = await fastify.prisma.feature.update({
  data: { geometry }  // Ignored by Prisma
})
```

**To:** Separate geometry update via raw SQL

```typescript
// ✅ This works
const feature = await fastify.prisma.feature.update({
  data: { name, details, parentId }  // Prisma handles these
})

if (geometry) {
  await fastify.prisma.$executeRaw`
    UPDATE "Feature"
    SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
    WHERE id = ${request.params.id}
  `
}
```

## Verification Steps

### 1. Check Database

```sql
-- Should show all features now having geometry
SELECT COUNT(*) as with_geometry
FROM "Feature"
WHERE geometry IS NOT NULL;
```

### 2. Test API

```bash
# Upload a test file
curl -X POST http://localhost:3001/features/upload \
  -F "file=@test.geojson" \
  -F "projectId=test-project-id"

# Should log: "[Features] Geometry saved (as WKT) for feature: ..."

# Fetch features
curl http://localhost:3001/features | jq '.[0].geometry'

# Should return valid GeoJSON like:
# { "type": "Point", "coordinates": [36.88, -0.50] }
```

### 3. Check Frontend

- Open admin portal
- Navigate to map page
- Features should render with colors:
  - Blue = Points
  - Green = Lines
  - Red = Polygons

### 4. Review Console Logs

**API Console:**

```
[Upload] ✓ Geometry saved (as WKT) for feature: abc123
[Features] Fetched 4 parent features from database
  { hasGeometry: true, geometryType: 'Polygon' }
```

**Browser Console:**

```
[FeatureMap] Rendering: totalFeatures: 4
  { id: '...', name: '...', hasGeometry: true, geometry: {...} }
```

## For Old Features with NULL Geometry

Features created before this fix will have NULL geometry. Two options:

### Option 1: Re-upload (Recommended)

```sql
-- Delete old NULL geometry features
DELETE FROM "Feature" WHERE geometry IS NULL;

-- Re-upload original files through UI
```

### Option 2: Bulk Update

```sql
-- If geometry was stored in details field
UPDATE "Feature"
SET geometry = ST_GeomFromGeoJSON((details->>'geometry')::jsonb)
WHERE geometry IS NULL AND details->'geometry' IS NOT NULL;
```

## Why This Approach

1. **PostGIS Integration**
   - PostgreSQL's PostGIS extension provides spatial functions
   - ST_GeomFromGeoJSON() - Accepts GeoJSON, stores as WKT
   - ST_AsGeoJSON() - Retrieves as GeoJSON

2. **Prisma Limitation**
   - ORM designed for standard SQL types
   - Custom PostgreSQL types (like geometry) are marked `Unsupported()`
   - Cannot be written through ORM, only read with raw queries

3. **Raw SQL Safety**
   - Parameterized queries prevent SQL injection
   - Fastify's `$executeRaw` and `$queryRaw` handle escaping
   - No string concatenation in SQL

## Code Quality

✅ **Tested:**

- All TypeScript compiles without errors
- All geometry endpoints use consistent pattern
- Error handling includes try-catch and logging

✅ **Documented:**

- Enhanced logging in API for debugging
- Enhanced logging in frontend for debugging
- Console output shows data flow

✅ **Complete:**

- All CRUD operations handle geometry correctly
- File upload pipeline validated
- Database schema confirmed

## Performance

- PostGIS geometry operations are optimized
- Automatic spatial indexing on geometry column
- Raw SQL queries are faster than ORM for spatial operations
- No performance degradation

## Next Actions

1. **If features have NULL geometry:**
   - Delete and re-upload files, OR
   - Use bulk update if geometry in details field

2. **Test with new uploads:**
   - Upload test GeoJSON file
   - Check API logs for "Geometry saved"
   - Verify features render on map

3. **Monitor in production:**
   - All new uploads will have geometry
   - All updates will preserve geometry
   - Map rendering should work correctly

## Support

If issues persist:

1. **Check database directly:**

   ```sql
   SELECT geometry FROM "Feature" WHERE id = 'feature-id';
   ```

2. **Test ST_GeomFromGeoJSON manually:**

   ```sql
   SELECT ST_GeomFromGeoJSON('{"type":"Point","coordinates":[0,0]}'::jsonb);
   ```

3. **Review console logs:**
   - Look for "Failed to save geometry" warnings
   - Check for SQL errors in API logs

4. **Verify file parsing:**
   - Is the spatial file valid?
   - Does it contain geometry?
   - Check file preview in upload logs
