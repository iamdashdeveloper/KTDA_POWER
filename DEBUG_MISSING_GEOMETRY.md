# Debugging Missing Geometry Issue

## Problem

Features are being fetched but their geometry is NULL, so they don't render on the map.

## Root Causes

### Cause 1: Geometry Never Saved (Most Likely)

Features were created before the geometry saving code was implemented.

**Check:**

```sql
SELECT id, name, geometry FROM "Feature" LIMIT 5;
```

If `geometry` column shows `NULL` for all rows → **This is the issue**

### Cause 2: Geometry Failed to Save

The `ST_GeomFromGeoJSON()` call failed but the feature was still created.

**Check logs:**

- Look for "Failed to save geometry" warnings in API console
- Check if geometry update queries ran

## Solution

### Option 1: Re-upload Features (Recommended)

If you have the original files (KML, GeoJSON, etc.):

1. Delete existing features with NULL geometry:

```sql
DELETE FROM "Feature" WHERE geometry IS NULL AND "parentId" IS NOT NULL;
DELETE FROM "Feature" WHERE geometry IS NULL AND "parentId" IS NULL;
```

2. Re-upload the files through the UI
3. Features will be created with geometry properly saved

### Option 2: Bulk Update Geometry from Details

If you stored geometry in the `details` JSON field before the fix:

```typescript
// SQL to check if geometry is in details
SELECT id, name, details->>'geometry' as stored_geometry
FROM "Feature"
WHERE geometry IS NULL
AND details->'geometry' IS NOT NULL
LIMIT 5;
```

If geometry is there, bulk update:

```sql
UPDATE "Feature"
SET geometry = ST_GeomFromGeoJSON((details->>'geometry')::jsonb)
WHERE geometry IS NULL
AND details->'geometry' IS NOT NULL;
```

### Option 3: Restore from GeoJSON Files

If you have original GeoJSON files, manually update:

```typescript
// For each feature, update geometry
UPDATE "Feature"
SET geometry = ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [36.88, -0.50]}'::jsonb)
WHERE id = 'feature-id';
```

## Detailed Debugging Steps

### Step 1: Check What's in Database

```sql
-- See all features and their geometry status
SELECT
  id,
  name,
  geometry IS NULL as geom_is_null,
  ST_GeometryType(geometry) as geom_type,
  "parentId"
FROM "Feature"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Step 2: Check API Response

Add these logs (already added):

**API (`/apps/api/src/routes/features/index.ts`):**

```
[Features] Fetched N parent features from database
  { id: ..., name: ..., hasGeometry: true/false, geometryType: ... }
```

**Frontend (`/apps/admin-web/src/components/maps/FeatureMap.tsx`):**

```
[FeatureMap] Rendering:
  allFeatures: [{ id: ..., name: ..., hasGeometry: true/false, geometry: {...} }]
```

### Step 3: Verify JSON Conversion

If API returns geometry but frontend doesn't see it:

```typescript
// Add to frontend FeatureMap.tsx for debugging
const feature = features[0]
console.log('Raw feature object:', feature)
console.log('Geometry value:', feature.geometry)
console.log('Geometry type:', typeof feature.geometry)
console.log('Geometry is object:', feature.geometry && typeof feature.geometry === 'object')
```

## Enhanced Logging Output

After adding the enhanced logs, you'll see:

**API Console:**

```
[Features] Fetched 4 parent features from database
[
  { id: '...', name: 'Iraru canal', hasGeometry: false, geometryType: null },
  { id: '...', name: 'tea_factories', hasGeometry: false, geometryType: null }
]
```

OR (if working):

```
[
  { id: '...', name: 'Iraru canal', hasGeometry: true, geometryType: 'LineString' },
  { id: '...', name: 'tea_factories', hasGeometry: true, geometryType: 'Polygon' }
]
```

**Frontend Console:**

```
[FeatureMap] Rendering:
  totalFeatures: 4
  visibleLayers: ['id1', 'id2', ...]
  allFeatures: [
    { id: '...', name: 'Iraru canal', hasGeometry: false, geometry: null, parentId: null },
    ...
  ]
```

## Quick Fix Commands

### If Geometry in Details Field:

```sql
-- Check if geometry is stored in details
SELECT COUNT(*) FROM "Feature"
WHERE geometry IS NULL
AND details->'geometry' IS NOT NULL;

-- Update all at once
UPDATE "Feature"
SET geometry = ST_GeomFromGeoJSON((details->>'geometry')::jsonb)
WHERE geometry IS NULL
AND details->'geometry' IS NOT NULL;

-- Verify
SELECT COUNT(*) FROM "Feature" WHERE geometry IS NOT NULL;
```

### If No Geometry Anywhere:

Delete and re-upload:

```sql
-- Backup first if needed
-- Then delete
DELETE FROM "Feature" WHERE geometry IS NULL;

-- Re-upload files through UI
```

## Testing the Fix

1. **After fixing, restart API:**

```bash
# API should be running on localhost:3001
curl http://localhost:3001/features | jq '.[0].geometry'
```

2. **Check console logs:**

- API: Should show `hasGeometry: true`
- Frontend: Should show `geometry: { type: ..., coordinates: ... }`

3. **Features should render on map**

## Prevention

The fix implemented ensures:

1. ✅ When features are uploaded, geometry is saved using `ST_GeomFromGeoJSON()`
2. ✅ When features are fetched, geometry is retrieved using `ST_AsGeoJSON()`
3. ✅ Frontend receives valid GeoJSON objects
4. ✅ Map component renders features with proper styling

Going forward, all uploaded features will have proper geometry.

## Next Steps

1. Check database: `SELECT * FROM "Feature" WHERE geometry IS NULL;`
2. If NULL exists, use appropriate solution above
3. Re-upload features if needed
4. Check console logs to verify geometry is present
5. Features should render on map
