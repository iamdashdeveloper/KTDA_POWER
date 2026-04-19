# PostGIS WKT Geometry Storage & Retrieval Guide

## Overview

Your database stores geometry in **WKT (Well-Known Text) format**, which is PostGIS's native binary format. The application handles conversion between GeoJSON (for the API/frontend) and WKT (for database storage).

---

## Data Flow

### 1. **Geometry Storage (Frontend → Database)**

```
GeoJSON Object (from upload file)
        ↓
JSON.stringify() in API
        ↓
ST_GeomFromGeoJSON(jsonb) in PostGIS
        ↓
WKT Format (stored in database)
```

**Example:**

```javascript
// Frontend sends GeoJSON
{
  "type": "LineString",
  "coordinates": [[36.88, -0.50], [36.89, -0.51]]
}
    ↓
// API converts to JSON string
'{"type": "LineString", "coordinates": [[36.88, -0.50], [36.89, -0.51]]}'
    ↓
// PostGIS ST_GeomFromGeoJSON() stores as WKT
LINESTRING(36.88 -0.50, 36.89 -0.51)
```

### 2. **Geometry Retrieval (Database → Frontend)**

```
WKT Format (from database)
        ↓
ST_AsGeoJSON(geometry) in PostGIS
        ↓
JSONB Object returned to API
        ↓
Frontend receives GeoJSON
```

**Example:**

```sql
-- Database stores as WKT
LINESTRING(36.88 -0.50, 36.89 -0.51)
    ↓
-- ST_AsGeoJSON() converts to GeoJSON
SELECT ST_AsGeoJSON(geometry)
    ↓
-- Frontend receives
{
  "type": "LineString",
  "coordinates": [[36.88, -0.50], [36.89, -0.51]]
}
```

---

## How PostGIS Handles It

### Saving Geometry

**API Code:**

```typescript
const geomJson = JSON.stringify(geometry)  // Convert to string
await fastify.prisma.$executeRaw`
  UPDATE "Feature"
  SET geometry = ST_GeomFromGeoJSON(${geomJson}::jsonb)
  WHERE id = ${feature.id}
`
```

**What Happens:**

1. GeoJSON object is stringified
2. Passed to PostGIS as JSONB
3. `ST_GeomFromGeoJSON()` parses GeoJSON
4. Converts to PostGIS internal format (WKT)
5. Stores in `geometry` column

### Retrieving Geometry

**API Code:**

```sql
SELECT
  CASE
    WHEN geometry IS NOT NULL THEN ST_AsGeoJSON(geometry)::jsonb
    ELSE NULL
  END as geometry
FROM "Feature"
```

**What Happens:**

1. Reads WKT geometry from database
2. `ST_AsGeoJSON()` converts to GeoJSON
3. Returns as JSONB object (not string)
4. API sends to frontend

---

## PostGIS Functions Reference

| Function               | Purpose                     | Input                  | Output                           |
| ---------------------- | --------------------------- | ---------------------- | -------------------------------- |
| `ST_GeomFromGeoJSON()` | Convert GeoJSON to geometry | GeoJSON                | PostGIS geometry (stored as WKT) |
| `ST_AsGeoJSON()`       | Convert geometry to GeoJSON | PostGIS geometry (WKT) | GeoJSON                          |
| `ST_AsText()`          | View geometry as WKT string | PostGIS geometry       | WKT text                         |
| `ST_AsEWKT()`          | Extended WKT with SRID      | PostGIS geometry       | Extended WKT                     |

---

## Supported Geometry Types

All GeoJSON geometry types are supported through PostGIS WKT:

| GeoJSON Type    | WKT Format      | Example                                                                      |
| --------------- | --------------- | ---------------------------------------------------------------------------- |
| Point           | POINT           | `POINT(36.88 -0.50)`                                                         |
| LineString      | LINESTRING      | `LINESTRING(36.88 -0.50, 36.89 -0.51)`                                       |
| Polygon         | POLYGON         | `POLYGON((36.88 -0.50, 36.89 -0.50, 36.89 -0.51, 36.88 -0.51, 36.88 -0.50))` |
| MultiPoint      | MULTIPOINT      | `MULTIPOINT(36.88 -0.50, 36.89 -0.51)`                                       |
| MultiLineString | MULTILINESTRING | `MULTILINESTRING((36.88 -0.50, 36.89 -0.51), ...)`                           |
| MultiPolygon    | MULTIPOLYGON    | `MULTIPOLYGON(((36.88 -0.50, ...)))`                                         |

---

## Database Verification

### View WKT Geometry in Database

```sql
-- View WKT format of stored geometries
SELECT id, name, ST_AsText(geometry) as wkt_geometry
FROM "Feature"
WHERE geometry IS NOT NULL
LIMIT 5;
```

**Output example:**

```
 id                      | name            | wkt_geometry
-------------------------|-----------------|--------------------------
 cmo2ph77i000070uhe0... | Iraru canal    | LINESTRING(36.88 -0.50, ...)
 cmo2pjd3c000270uhex... | IRARU project  | POLYGON((36.88 -0.50, ...))
```

### View Geometry Properties

```sql
-- Check geometry validity
SELECT id, name,
  ST_IsValid(geometry) as is_valid,
  ST_GeometryType(geometry) as geom_type,
  ST_Length(geometry) as length_meters
FROM "Feature"
WHERE geometry IS NOT NULL;
```

---

## Current Implementation

### Endpoints

**POST /features** - Create single feature with geometry

- Accepts: GeoJSON geometry object
- Stores: WKT via `ST_GeomFromGeoJSON()`

**POST /features/upload** - Bulk upload spatial files

- Parses: KML, KMZ, GeoJSON, GPX (all converted to GeoJSON)
- Stores: Each geometry as WKT

**GET /features** - Retrieve all features

- Retrieves: WKT from database
- Returns: GeoJSON via `ST_AsGeoJSON()`

**GET /features/:id** - Retrieve single feature

- Retrieves: WKT from database
- Returns: GeoJSON via `ST_AsGeoJSON()`

---

## Geometry Handling in API

### Type Safety

```typescript
// JSONB objects vs strings are handled gracefully
geometry: feature.geometry
  ? (typeof feature.geometry === 'string'
      ? JSON.parse(feature.geometry)
      : feature.geometry)
  : null
```

This handles both cases:

- `ST_AsGeoJSON()::jsonb` returns object
- Legacy string values get parsed

---

## Performance Considerations

### Queries Optimized For:

1. **Geometry Storage**
   - Two-step creation (record → geometry update)
   - Minimal overhead

2. **Geometry Retrieval**
   - Single `ST_AsGeoJSON()` call per query
   - CASE statement only converts if geometry exists
   - No unnecessary conversions

3. **Spatial Queries** (Future)
   - PostGIS indexes available: `CREATE INDEX idx_feature_geom ON "Feature" USING GIST(geometry)`
   - Enables fast spatial queries: `ST_DWithin()`, `ST_Intersects()`, etc.

---

## Troubleshooting

### Geometry Shows as NULL

**Cause:** Geometry column not updated after feature creation

**Check:**

```sql
SELECT id, geometry IS NULL as is_null FROM "Feature" LIMIT 5;
```

**Fix:** Ensure `ST_GeomFromGeoJSON()` was called

### GeoJSON Invalid

**Cause:** Malformed coordinates or missing type

**Check in API logs:**

- Look for geometry save errors
- Verify input GeoJSON structure

**Fix:** Validate GeoJSON before upload

### Slow Queries

**Cause:** Missing spatial index

**Fix:**

```sql
CREATE INDEX idx_feature_geom ON "Feature" USING GIST(geometry);
```

---

## Summary

✅ **Geometry Storage:** GeoJSON → `ST_GeomFromGeoJSON()` → WKT (in database)  
✅ **Geometry Retrieval:** WKT (in database) → `ST_AsGeoJSON()` → GeoJSON  
✅ **Supported:** All GeoJSON geometry types  
✅ **Performance:** Optimized with proper SQL queries  
✅ **Compatibility:** Frontend receives standard GeoJSON
