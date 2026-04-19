# Parent-Child Features: Quick Guide

## What Changed

**Parent features are now containers only** - they group child features together but don't render on the map themselves.

Only **child features with geometry** render on the map.

## How It Works

### Upload Flow

```
Upload KML file
  ↓
Parser creates features from file
  ↓
Parent "filename" created as container
  ↓
Each feature becomes a child under parent
  ↓
Only children with geometry saved to DB
```

### Display Flow

```
API: Fetch parents + all children with geometry
  ↓
Group children under their parents
  ↓
Map: Show only children from visible groups
  ↓
LayerControl: Toggle parent = toggle all children
```

## Parent Controls

### Visibility

- Click checkbox next to parent name in LayerControl
- All children in that group show/hide on map

### Selection

- Select parent → all children selected
- Select child → only that child selected

### Deletion

- Delete parent → all children deleted too
- Delete child → only that child deleted

## Data Structure

Parent has `children` array (not `subFeatures`):

```typescript
interface FeatureGroup {
  id: string
  name: string
  isGroup: true
  children: Feature[]  // Only children with geometry
}
```

## API Response

```json
[
  {
    "id": "parent-123",
    "name": "tea_factories",
    "isGroup": true,
    "children": [
      {
        "id": "child-456",
        "name": "Factory A",
        "geometry": { "type": "Point", "coordinates": [...] }
      }
    ]
  }
]
```

## Code Usage

### Get groups with children

```typescript
const response = await apiClient.get("/features")
const featureGroups = response.data  // Already grouped
```

### Flatten for table

```typescript
const flattened = []
for (const group of featureGroups) {
  flattened.push(group)
  if (group.children) flattened.push(...group.children)
}
```

### Render visible children

```typescript
for (const group of featureGroups) {
  if (visibleLayers.has(group.id)) {
    // Add group.children to map
  }
}
```

## Expected Behavior

✅ Upload file with 10 features
→ Creates 1 parent + 10 children
→ 10 features appear on map (parent doesn't show)
→ Toggle parent group hides all 10 features
→ Delete parent deletes all 10 features

✅ Select parent in table
→ All children highlighted on map

✅ Expand group in LayerControl
→ Shows all children, indicates which have geometry

## Console Output

When map loads:

```
[FeatureMap] Rendering:
  totalGroups: 1
  visibleLayers: ['tea_factories']
  allChildren: [
    { id: 'child-1', name: 'Factory A', hasGeometry: true }
    { id: 'child-2', name: 'Factory B', hasGeometry: true }
  ]
```

When API fetches:

```
[Features] Fetched 1 parent groups and 10 child features with geometry
  Parent: "tea_factories" → 10 children with geometry
```

## Troubleshooting

**"No features on map but groups exist"**
→ Check LayerControl - parent group checkbox unchecked
→ Click checkbox to show group and its children

**"Some children not showing"**
→ They don't have geometry - check database
→ Only children with `geometry IS NOT NULL` are fetched

**"Parent deletes but children remain"**
→ Database constraint might not be enforced
→ Manually delete children first

## Files Modified

- `GET /features` endpoint - now groups by parent
- `FeatureMap.tsx` - renders grouped structure
- `Features.tsx` - handles grouped data
- `LayerControl.tsx` - shows group hierarchy
