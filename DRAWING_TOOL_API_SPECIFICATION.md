# Drawing Tool API Specification

## Overview

This document specifies the API endpoints required to complete the drawing tool integration with the backend database.

## Backend Setup Checklist

- [ ] Create endpoint: `POST /projects/{projectId}/features`
- [ ] Add database migration for feature storage
- [ ] Implement geometry validation and storage
- [ ] Set up feature indexing for performance
- [ ] Add authentication/authorization checks

## Endpoints

### 1. Save Drawn Features

**Endpoint:** `POST /projects/{projectId}/features`

**Authentication:** Required (Bearer token)

**Authorization:** User must have write permission on project

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**

```typescript
{
  // Array of features to save
  features: Array<{
    name: string;              // Required: Feature identifier
    description?: string;       // Optional: Additional details
    geometry: {
      type: "Point" | "LineString" | "Polygon";
      coordinates: number[][];  // GeoJSON coordinates in WGS84
    };
  }>;

  // Group identifier for batch operations
  groupName: string;           // e.g., "2024-01-15" or custom name

  // Optional metadata
  metadata?: {
    timestamp?: string;        // ISO 8601 timestamp
    source?: string;          // e.g., "drawing-tool"
    userId?: string;          // Creator ID
  };
}
```

**Response (Success - 201 Created):**

```typescript
{
  success: true;
  data: {
    features: Array<{
      id: string;             // Database ID (auto-generated)
      projectId: string;
      name: string;
      description?: string;
      geometry: GeoJSON;
      groupName: string;
      createdAt: string;      // ISO 8601
      updatedAt: string;      // ISO 8601
      status: "active" | "draft";
    }>;

    // Summary statistics
    stats: {
      total: number;
      saved: number;
      failed: number;
      groupId?: string;       // ID of created group
    };
  };
}
```

**Response (Error - 400 Bad Request):**

```typescript
{
  success: false;
  error: {
    code: "INVALID_GEOMETRY" | "MISSING_NAME" | "INVALID_PROJECT";
    message: string;
    details?: {
      field?: string;
      index?: number;         // For array errors
      value?: any;
    };
  };
}
```

**Response (Error - 403 Forbidden):**

```typescript
{
  success: false;
  error: {
    code: "INSUFFICIENT_PERMISSIONS";
    message: "User does not have write access to this project";
  };
}
```

**Response (Error - 404 Not Found):**

```typescript
{
  success: false;
  error: {
    code: "PROJECT_NOT_FOUND";
    message: "Project with ID {projectId} not found";
  };
}
```

### 2. Get Project Features (Enhanced)

**Endpoint:** `GET /projects/{projectId}/features`

**Query Parameters:**

```
?groupName=2024-01-15    // Filter by group name
&type=Point|LineString|Polygon  // Filter by geometry type
&page=1                  // Pagination
&limit=50                // Results per page
&sort=createdAt|name     // Sort field
&order=asc|desc          // Sort order
```

**Response:**

```typescript
{
  success: true;
  data: {
    features: Array<Feature>;  // Same structure as save response
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
    groups?: Array<{
      name: string;
      count: number;
      createdAt: string;
    }>;
  };
}
```

### 3. Update Feature (Optional)

**Endpoint:** `PUT /projects/{projectId}/features/{featureId}`

**Request Body:**

```typescript
{
  name?: string;
  description?: string;
  geometry?: GeoJSON;      // Re-submit full geometry if modifying
  status?: "active" | "draft" | "archived";
}
```

**Response:** Same as save endpoint

### 4. Delete Feature (Optional)

**Endpoint:** `DELETE /projects/{projectId}/features/{featureId}`

**Response:**

```typescript
{
  success: true;
  data: {
    id: string;
    message: "Feature deleted successfully";
  };
}
```

### 5. Batch Delete Features (Optional)

**Endpoint:** `POST /projects/{projectId}/features/batch-delete`

**Request Body:**

```typescript
{
  featureIds: string[];
  // OR
  groupName: string;  // Delete all features in group
}
```

**Response:**

```typescript
{
  success: true;
  data: {
    deleted: number;
    failed: number;
    message: string;
  };
}
```

## Database Schema

### Features Table

```sql
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,  -- PostGIS for spatial queries
  geometry_type VARCHAR(50) NOT NULL,          -- Point, LineString, Polygon
  group_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',         -- active, draft, archived
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',

  -- Indexes for performance
  CONSTRAINT feature_name_required CHECK (name IS NOT NULL AND name != ''),
  INDEX idx_project_id (project_id),
  INDEX idx_group_name (group_name),
  INDEX idx_created_at (created_at),
  INDEX idx_geometry USING GIST (geometry)
);

-- Feature Groups (optional, for bulk operations)
CREATE TABLE feature_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),

  UNIQUE(project_id, name),
  INDEX idx_project_id (project_id)
);

-- Link features to groups
ALTER TABLE features ADD COLUMN group_id UUID REFERENCES feature_groups(id) ON DELETE SET NULL;
```

### Migration Example (Prisma)

```prisma
// prisma/migrations/xxx_add_drawing_features/migration.sql

CREATE TABLE "Feature" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "geometry" GEOMETRY(GEOMETRY, 4326) NOT NULL,
  "geometryType" VARCHAR(50) NOT NULL,
  "groupName" VARCHAR(255),
  "status" VARCHAR(50) NOT NULL DEFAULT 'active',
  "createdBy" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  "metadata" JSONB DEFAULT '{}',

  CONSTRAINT "Feature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE,
  CONSTRAINT "Feature_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE INDEX "Feature_projectId_idx" ON "Feature"("projectId");
CREATE INDEX "Feature_groupName_idx" ON "Feature"("groupName");
CREATE INDEX "Feature_createdAt_idx" ON "Feature"("createdAt");
CREATE INDEX "Feature_geometry_idx" ON "Feature" USING GIST("geometry");
```

## Implementation Notes

### Geometry Validation

```typescript
// Validate GeoJSON geometry
function validateGeometry(geometry: GeoJSON.Geometry): boolean {
  // Check type
  if (!['Point', 'LineString', 'Polygon'].includes(geometry.type)) {
    throw new Error('Invalid geometry type');
  }

  // Check coordinates
  if (!geometry.coordinates || geometry.coordinates.length === 0) {
    throw new Error('Empty coordinates');
  }

  // Check coordinate format [lon, lat]
  for (const coord of flattenCoordinates(geometry.coordinates)) {
    if (!isValidLngLat(coord[0], coord[1])) {
      throw new Error('Invalid coordinates');
    }
  }

  // Additional checks for specific types
  switch (geometry.type) {
    case 'Polygon':
      if (!isValidRing(geometry.coordinates[0])) {
        throw new Error('Invalid polygon ring');
      }
      break;
  }

  return true;
}
```

### Performance Optimization

```typescript
// Batch insert for multiple features
async function saveFeatures(features: Feature[], projectId: string) {
  // Use transaction
  return await db.$transaction(async (tx) => {
    // Insert all features at once
    const result = await tx.feature.createMany({
      data: features.map(f => ({
        projectId,
        name: f.name,
        description: f.description,
        geometry: {
          type: f.geometry.type,
          coordinates: f.geometry.coordinates
        },
        geometryType: f.geometry.type,
        groupName: f.groupName,
        status: 'active',
        metadata: {
          source: 'drawing-tool',
          timestamp: new Date().toISOString()
        }
      }))
    });

    return result;
  });
}
```

### Spatial Queries

```sql
-- Find features near a point
SELECT * FROM features
WHERE project_id = $1
  AND ST_DWithin(geometry, ST_SetSRID(ST_MakePoint($2, $3), 4326), 1000) -- 1km buffer
ORDER BY ST_Distance(geometry, ST_SetSRID(ST_MakePoint($2, $3), 4326));

-- Find overlapping features
SELECT * FROM features
WHERE project_id = $1
  AND ST_Intersects(geometry, $2);

-- Feature statistics
SELECT
  geometry_type,
  COUNT(*) as count,
  ST_AsText(ST_Extent(geometry)) as bounds
FROM features
WHERE project_id = $1
GROUP BY geometry_type;
```

## Frontend Integration

### Current Frontend Code

```typescript
// In Ribbon.tsx handleDrawingSave()
const handleDrawingSave = async (
  features: Array<{ name: string; description: string; groupName: string }>,
  groupName: string
) => {
  setIsSavingDrawing(true);
  try {
    const mapElement = document.querySelector("[data-map-instance]") as any;
    if (mapElement?.__mapInstance) {
      const map = mapElement.__mapInstance;
      if (map.__getDrawnFeatures) {
        const drawnFeatures = map.__getDrawnFeatures();

        // TODO: Replace this with actual API call
        const response = await ApiClient.post(
          `/projects/${activeProject.id}/features`,
          {
            features: drawnFeatures.map((f, idx) => ({
              name: features[idx]?.name || f.properties?.name || `Feature ${idx + 1}`,
              description: features[idx]?.description,
              geometry: f.geometry
            })),
            groupName: groupName
          }
        );

        // Add to scratchFeatures
        if (response.data?.features) {
          setScratchFeatures([...scratchFeatures, ...response.data.features]);
        }

        // Clear the drawing after saving
        if (map.__clearDrawnFeatures) {
          map.__clearDrawnFeatures();
        }
        setDrawnFeatureCount(0);
        setIsDrawingModalOpen(false);
      }
    }
  } catch (error) {
    console.error("Error saving drawn features:", error);
    // TODO: Show error toast
  } finally {
    setIsSavingDrawing(false);
  }
};
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Check user has write permission on project
3. **Validation**: Always validate geometry on backend
4. **Rate Limiting**: Implement rate limiting (e.g., 100 features per minute)
5. **Input Sanitization**: Validate name/description strings
6. **Data Size**: Limit max features per request (e.g., 1000)
7. **Geometry Complexity**: Reject overly complex geometries (>10000 vertices)

## Testing Endpoints

### Using cURL

```bash
# Save features
curl -X POST \
  'http://localhost:3000/api/projects/abc123/features' \
  -H 'Authorization: Bearer token123' \
  -H 'Content-Type: application/json' \
  -d '{
    "features": [{
      "name": "Test Point",
      "description": "Test feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-73.935242, 40.730610]
      }
    }],
    "groupName": "test-features"
  }'

# Get features
curl -X GET \
  'http://localhost:3000/api/projects/abc123/features?groupName=test-features' \
  -H 'Authorization: Bearer token123'
```

### Using TypeScript/Fetch

```typescript
// Save features
const response = await fetch('/api/projects/abc123/features', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    features: [...],
    groupName: '2024-01-15'
  })
});

const result = await response.json();
```

## Troubleshooting

### Common Issues

1. **"Invalid geometry"**
   - Ensure coordinates are [lon, lat] format
   - Check coordinates are within valid range
   - Verify geometry type matches coordinate structure

2. **"Project not found"**
   - Verify projectId is correct UUID format
   - Check user has access to project

3. **"Insufficient permissions"**
   - Verify user has write role on project
   - Check authentication token is valid

4. **Geometry insertion fails**
   - Enable PostGIS extension: `CREATE EXTENSION postgis;`
   - Check SRID is 4326 (WGS84)
   - Verify geometry is well-formed: `ST_IsValid(geometry)`

## Related Documentation

- [DRAWING_TOOL_IMPLEMENTATION.md](./DRAWING_TOOL_IMPLEMENTATION.md) - Frontend implementation details
- [DRAWING_TOOL_USAGE_GUIDE.md](./DRAWING_TOOL_USAGE_GUIDE.md) - User guide
- PostGIS Documentation: https://postgis.net/documentation/
- GeoJSON RFC 7946: https://tools.ietf.org/html/rfc7946

## Version History

- **v1.0** (2024-01-15): Initial API specification
  - Basic CRUD operations
  - GeoJSON geometry support
  - Project-scoped features
  - Group-based organization
