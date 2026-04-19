# Parent-Child Feature Architecture

## Overview

The API now returns features grouped by their parent containers. Parents are **grouping containers** without geometry, while children contain the actual spatial data.

## Data Structure

**Old Structure (Flat):**

```json
[
  { id: "parent1", name: "tea_factories", parentId: null, geometry: null },
  { id: "child1", name: "Factory A", parentId: "parent1", geometry: {...} },
  { id: "child2", name: "Factory B", parentId: "parent1", geometry: {...} }
]
```

**New Structure (Grouped):**

```json
[
  {
    id: "parent1",
    name: "tea_factories",
    isGroup: true,
    parentId: null,
    children: [
      { id: "child1", name: "Factory A", geometry: {...}, parentId: "parent1" },
      { id: "child2", name: "Factory B", geometry: {...}, parentId: "parent1" }
    ]
  }
]
```

## API Changes

### GET /features

**Before:**

- Returned all parent features with `subFeatures` array
- Parent features often had `null` geometry
- Map tried to render parents which had no geometry

**After:**

- Returns parent groups with `children` array
- Only includes children that have geometry
- More efficient query (single parent fetch, single child fetch)
- Map renders only children which have spatial data

```typescript
// Old query returned parents
WHERE "parentId" IS NULL

// New query returns only children with geometry
WHERE "parentId" IS NOT NULL AND geometry IS NOT NULL
```

## Frontend Components Updated

### 1. FeatureMap Component

- **Before:** Accepted flat `features` array, tried to render parents
- **After:** Accepts grouped `featureGroups` array
- Flattens children from visible groups for rendering
- Only children with geometry are rendered on map

```typescript
// Before
<FeatureMap features={features} visibleLayers={visibleLayers} />

// After
<FeatureMap featureGroups={featureGroups} visibleLayers={visibleLayers} />
```

### 2. Features Page

- Fetches grouped data from API
- Flattens for table display (for DataTablePanel)
- Passes groups to FeatureMap
- Passes groups to LayerControl

```typescript
// Fetch returns groups
const groups = response.data
setFeatureGroups(groups)

// Flatten for table
const flattened = []
for (const group of groups) {
  flattened.push(group)
  if (group.children) flattened.push(...group.children)
}
setAllFeatures(flattened)
```

### 3. LayerControl Component

- **Before:** Showed parent features, filtered children from flat array
- **After:** Shows groups with children already nested
- Toggle parent group shows/hides all its children on map
- Child indicators show which ones have geometry

## Selection & Control Behavior

### Parent Group Selection

When you select a parent group:

- All its children are visibly selected on the map
- Toggling parent visibility shows/hides all children

### Delete Parent

When you delete a parent:

- **Cascading delete:** All children are deleted too
- Database constraint: `ON DELETE CASCADE`

```sql
parent      Feature   @relation(fields: [parentId], references: [id])
subFeatures Feature[] @relation("FeatureHierarchy")
```

## Query Optimization

### Before:

1. Query all parents (where parentId IS NULL)
2. For each parent, query children separately
3. Merge results in application

```typescript
// N+1 query problem
const parents = SELECT * FROM Feature WHERE parentId IS NULL
for (parent in parents) {
  children = SELECT * FROM Feature WHERE parentId = parent.id
}
```

### After:

1. Query all parents once
2. Query all children at once
3. Group in application

```typescript
// 2 queries instead of 1+N
const parents = SELECT * FROM Feature WHERE parentId IS NULL
const children = SELECT * FROM Feature WHERE parentId IS NOT NULL AND geometry IS NOT NULL
```

## Rendering Logic

```typescript
// Map only renders children from visible groups
const allChildren: any[] = []
for (const group of featureGroups) {
  if (visibleLayers.has(group.id) && group.children) {
    allChildren.push(...group.children)  // Only children
  }
}

for (const feature of allChildren) {
  const olFeature = createOLFeature(feature)  // Has geometry
  if (olFeature) {
    vectorSource.current.addFeature(olFeature)
  }
}
```

## Console Logs

**API:**

```
[Features] Fetched 1 parent groups and 3 child features with geometry
  Parent: "tea_factories" (id...) → 3 children with geometry
```

**Frontend:**

```
[FeatureMap] Rendering:
  totalGroups: 1
  visibleLayers: ['group-id']
  allChildren: [
    { id: '...', name: 'Factory A', parentId: 'group-id', hasGeometry: true }
  ]
```

## Backward Compatibility

If you need to access flat features in table display:

```typescript
// Flatten for DataTablePanel
const allFeatures: Feature[] = []
for (const group of featureGroups) {
  allFeatures.push(group)
  if (group.children) allFeatures.push(...group.children)
}
<DataTablePanel features={allFeatures} />
```

## Summary of Changes

| Component         | Change               | Impact                                          |
| ----------------- | -------------------- | ----------------------------------------------- |
| GET /features API | Now groups by parent | Map renders children with geometry              |
| FeatureMap        | Now accepts groups   | Only renders children, no empty parents         |
| Features page     | Flattens for table   | Can display both parents and children           |
| LayerControl      | Updated for groups   | Parents control all children visibility         |
| Database          | No changes           | Already has parentId and parent/child relations |

## Benefits

✅ **No empty parent features on map** - Only children with actual geometry render  
✅ **Parent controls children** - Toggle one parent toggles all its features  
✅ **Cascading deletion** - Delete parent deletes all children  
✅ **Better grouping** - Logical organization of spatial data  
✅ **Cleaner code** - Clear separation of containers and features  
✅ **Improved queries** - Fewer database round-trips
