# Quick Reference: Geometry Fix

## What Was Fixed

❌ **Before:** Features had `geometry: null`, wouldn't render on map
✅ **After:** Features have valid geometry, render properly

## The Issue

Prisma ORM cannot update PostgreSQL's custom `geometry` type. The PUT endpoint was silently failing to save geometry.

## The Fix

Use raw SQL (`ST_GeomFromGeoJSON()`) for all geometry updates instead of Prisma.

**Code Pattern:**

```typescript
// ✅ Correct way to update geometry
await fastify.prisma.$executeRaw`
  UPDATE "Feature"
  SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
  WHERE id = ${featureId}
`

// ❌ Wrong way (silently fails)
await prisma.feature.update({
  data: { geometry: geomJson }
})
```

## All Endpoints

| Method | Endpoint         | Geometry Handling           | Status   |
| ------ | ---------------- | --------------------------- | -------- |
| POST   | /features        | Raw SQL after Prisma create | ✅ Fixed |
| GET    | /features        | ST_AsGeoJSON() in query     | ✅ Works |
| GET    | /features/:id    | ST_AsGeoJSON() in query     | ✅ Works |
| PUT    | /features/:id    | Raw SQL after Prisma update | ✅ Fixed |
| DELETE | /features/:id    | Standard Prisma delete      | ✅ Works |
| POST   | /features/upload | Raw SQL for each feature    | ✅ Works |

## Quick Test

```bash
# Upload a test file
curl -X POST http://localhost:3001/features/upload \
  -F "file=@test.geojson"

# Check if geometry was saved
curl http://localhost:3001/features | jq '.[0].geometry'

# Should see valid GeoJSON, not null
```

## Database Check

```sql
-- See geometry status
SELECT COUNT(*) as with_geometry FROM "Feature" WHERE geometry IS NOT NULL;
SELECT COUNT(*) as without_geometry FROM "Feature" WHERE geometry IS NULL;

-- See example geometry
SELECT id, name, ST_AsText(geometry) as wkt FROM "Feature" WHERE geometry IS NOT NULL LIMIT 1;
```

## Frontend Verification

1. Open admin portal
2. Go to map page
3. Features should appear:
   - 🔵 Blue circles = Points
   - 🟢 Green lines = LineStrings
   - 🔴 Red fills = Polygons

## If Features Still Have NULL Geometry

**Cause:** Created before fix was applied

**Solution:**

```sql
-- Delete old features
DELETE FROM "Feature" WHERE geometry IS NULL;

-- Re-upload files through UI
```

## Files Modified

- `/apps/api/src/routes/features/index.ts` - PUT endpoint updated

## Verification Checklist

- [ ] Code compiles (no TypeScript errors)
- [ ] API logs show "Geometry saved" messages
- [ ] Database has geometry values (not NULL)
- [ ] GET /features returns valid geometry objects
- [ ] Frontend receives geometry in feature objects
- [ ] Map renders features with correct colors

## Console Log Output

**API (Node):**

```
✓ Geometry saved (as WKT) for feature: abc123
Fetched 4 parent features from database
  { hasGeometry: true, geometryType: 'Polygon' }
```

**Browser:**

```
[FeatureMap] Rendering: totalFeatures: 4
  { id: '...', hasGeometry: true, geometry: {...} }
```

## Storage Format

- **Frontend:** GeoJSON (standard format)
- **Database:** WKT via PostGIS (optimized for spatial queries)
- **API Response:** GeoJSON (converted by ST_AsGeoJSON)

## No More Manual Geometry Management Needed

The pipeline is automated:

1. Upload file
2. Parse to GeoJSON (automatic)
3. Save to database (automatic via ST_GeomFromGeoJSON)
4. Retrieve for map (automatic via ST_AsGeoJSON)
5. Render on map (automatic)

Just upload files and they work!

---

## For Detailed Debugging

See: `GEOMETRY_FIX_COMPLETE.md` for step-by-step verification
See: `DEBUG_MISSING_GEOMETRY.md` for troubleshooting
