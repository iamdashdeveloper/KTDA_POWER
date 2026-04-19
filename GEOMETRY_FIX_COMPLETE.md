# Complete Geometry Fix Guide

## Quick Summary

The geometry storage pipeline is now fully fixed:

1. **CREATE** (POST /features) - ✅ Fixed: Uses ST_GeomFromGeoJSON() for geometry
2. **READ** (GET /features) - ✅ Fixed: Uses ST_AsGeoJSON() to retrieve geometry
3. **UPDATE** (PUT /features/:id) - ✅ Fixed: Separate geometry update via ST_GeomFromGeoJSON()
4. **UPLOAD** (POST /features/upload) - ✅ Fixed: Two-step save with geometry

## Step-by-Step Verification

### Step 1: Check Database State

Connect to your PostgreSQL database and run these queries:

```sql
-- Query 1: Summary of geometry status
SELECT
  COUNT(*) as total_features,
  COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as with_geometry,
  COUNT(CASE WHEN geometry IS NULL THEN 1 END) as without_geometry
FROM "Feature";

-- Query 2: Show features with null geometry
SELECT id, name, "parentId", "createdAt"
FROM "Feature"
WHERE geometry IS NULL
ORDER BY "createdAt" DESC
LIMIT 10;

-- Query 3: Show features with valid geometry
SELECT id, name, ST_GeometryType(geometry) as type, "createdAt"
FROM "Feature"
WHERE geometry IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Expected Results:**

- If all features have NULL geometry → Features were created before fix was applied
- If some have geometry → Fix is working for new uploads

### Step 2: Choose Your Action

#### Option A: Re-upload Features (Recommended for New Features)

If you have the original files (KML, GeoJSON, GPX, KMZ):

1. Delete features with NULL geometry:

```sql
-- BACKUP FIRST - This deletes data!
DELETE FROM "Feature" WHERE geometry IS NULL;
```

2. In the UI, upload the files again through the upload form
3. The fixed code will now save geometry properly

#### Option B: Bulk Update Existing Features

If geometry is stored in the `details` JSON field:

```sql
-- Check if geometry is in details field
SELECT COUNT(*) FROM "Feature"
WHERE details->'geometry' IS NOT NULL
AND geometry IS NULL;

-- Update geometry from details field
UPDATE "Feature"
SET geometry = ST_GeomFromGeoJSON((details->>'geometry')::jsonb)
WHERE geometry IS NULL
AND details->'geometry' IS NOT NULL;

-- Verify the update
SELECT COUNT(*) FROM "Feature" WHERE geometry IS NOT NULL;
```

#### Option C: Manual Geometry Entry

For individual features, update via API:

```bash
# Update feature with geometry
curl -X PUT http://localhost:3001/features/{feature-id} \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {
      "type": "Point",
      "coordinates": [36.88, -0.50]
    }
  }'
```

### Step 3: Test the Fix

#### 1. Upload a test file:

```bash
curl -X POST http://localhost:3001/features/upload \
  -F "file=@test-feature.geojson" \
  -F "projectId=your-project-id"
```

Check the API console for:

```
[Upload] ✓ Geometry saved (as WKT) for feature: feature-id-123
```

#### 2. Fetch the features:

```bash
curl http://localhost:3001/features | jq '.[] | {id, name, hasGeometry: (.geometry != null), geometryType: .geometry.type}'
```

Expected output:

```json
{
  "id": "...",
  "name": "...",
  "hasGeometry": true,
  "geometryType": "Polygon"
}
```

#### 3. Check the frontend:

1. Open the admin portal
2. Navigate to the map page
3. Features should render with proper colors:
   - **Blue circles** = Point geometries
   - **Green lines** = LineString geometries
   - **Red fills** = Polygon geometries

### Step 4: Verify Console Logs

**API Console (Node.js):**

```
[Features] Fetched 4 parent features from database
[
  { id: '...', name: 'Feature Name', hasGeometry: true, geometryType: 'Polygon' }
]
[Features] Geometry saved (as WKT) for feature: abc123
```

**Browser Console (Chrome DevTools):**

```
[FeatureMap] Rendering:
  totalFeatures: 4
  visibleLayers: ['feature1', 'feature2', ...]
  allFeatures: [
    { id: '...', name: 'Feature Name', hasGeometry: true, geometry: {...} }
  ]
```

## What Was Fixed

### Issue: Geometry Always Null

**Root Cause:**

- Prisma ORM cannot write to `Unsupported("geometry")` PostgreSQL types
- The PUT update endpoint was trying to use Prisma to save geometry, which silently failed

**Solution Implemented:**

1. ✅ POST /features - Uses raw SQL: `UPDATE ... SET geometry = ST_GeomFromGeoJSON()`
2. ✅ POST /features/upload - Uses raw SQL: `UPDATE ... SET geometry = ST_GeomFromGeoJSON()`
3. ✅ PUT /features/:id - NOW uses raw SQL for geometry, Prisma for other fields

### Technical Details

**Storage Flow:**

```
GeoJSON { "type": "Point", "coordinates": [...] }
    ↓
ST_GeomFromGeoJSON() - Converts GeoJSON to PostGIS geometry
    ↓
Database: Stores as WKT (Well-Known Text) - PostGIS native format
    ↓
ST_AsGeoJSON()::jsonb - Converts back to GeoJSON for API response
    ↓
Frontend receives valid GeoJSON
```

**Code Changes:**

1. POST /features:
   - Create feature without geometry
   - Then UPDATE geometry via raw SQL

2. POST /features/upload:
   - Create parent feature
   - For each child feature: create then update geometry via raw SQL

3. PUT /features/:id (FIXED):
   - Update non-geometry fields with Prisma
   - If geometry provided, UPDATE it via raw SQL separately

## Troubleshooting

### Problem: "Failed to save geometry"

Check:

```sql
-- Verify PostGIS extension
SELECT extname FROM pg_extension WHERE extname = 'postgis';

-- Test ST_GeomFromGeoJSON manually
SELECT ST_GeomFromGeoJSON('{"type":"Point","coordinates":[0,0]}'::jsonb);

-- Check database URL in .env
echo $DATABASE_URL
```

### Problem: Geometry is still null after update

```sql
-- Check if the update statement executed
SELECT id, name, geometry, ST_AsText(geometry) as wkt
FROM "Feature"
WHERE id = 'feature-id';

-- If NULL, check if geometry is valid GeoJSON
SELECT ST_GeomFromGeoJSON('{"type":"Point","coordinates":[36.88,-0.50]}'::jsonb);
```

### Problem: Map shows features but no geometry rendering

1. Check browser console for errors
2. Verify feature.geometry is not null:
   ```bash
   curl http://localhost:3001/features/feature-id | jq '.geometry'
   ```
3. Ensure FeatureMap component receives geometry:
   ```javascript
   // In browser console
   console.log(window.__lastFeatures) // See what was fetched
   ```

## Verification Checklist

- [ ] Database has PostGIS extension loaded
- [ ] Feature table has geometry column of type geometry
- [ ] Migrations applied successfully (7 migrations)
- [ ] API shows "Geometry saved" log messages
- [ ] GET /features returns features with valid geometry objects
- [ ] Frontend receives geometry in Feature objects
- [ ] Features render on map with proper colors
- [ ] New uploads automatically save geometry

## Next Steps After Fix

1. **Delete old NULL geometry features** (if desired):

   ```sql
   DELETE FROM "Feature" WHERE geometry IS NULL AND "parentId" IS NOT NULL;
   DELETE FROM "Feature" WHERE geometry IS NULL AND "parentId" IS NULL;
   ```

2. **Re-upload files** through the UI

3. **Verify map rendering** shows all features

4. **Test geometry operations:**
   - Create new features with geometry via POST /features
   - Update geometry via PUT /features/:id
   - Upload files via POST /features/upload

## Performance Notes

The use of raw SQL queries for geometry operations is intentional and necessary:

- Prisma ORM cannot handle PostGIS geometry types
- Raw SQL with typed parameters prevents SQL injection
- Geometry queries use PostGIS functions which are optimized

Database indexes are created automatically for the geometry column by PostGIS.
