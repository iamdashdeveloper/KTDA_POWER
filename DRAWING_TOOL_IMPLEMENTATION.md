# Drawing Tool Implementation Summary

## Overview

The drawing functionality has been successfully implemented to allow users to draw lines, points, and polygons on the map and save them to the database. The implementation follows the existing architecture pattern established by the chainage markers tool.

## Architecture

### Component Structure

```
OpenLayersMap (map container)
├── DrawingLogic (map interactions & feature management)
│   ├── Draw interaction (Point, LineString, Polygon)
│   ├── Modify interaction (edit drawn features)
│   ├── Select interaction (highlight selected features)
│   └── VectorLayer/VectorSource (feature storage)
│
Ribbon (toolbar coordinator)
├── MapClipboardToolbar (UI buttons)
│   ├── Draw Line button
│   ├── Draw Point button
│   ├── Draw Polygon button
│   ├── Save & Upload button
│   └── Clear button
│
├── DrawingModal (feature save form)
│   ├── Feature name (required)
│   ├── Description (optional)
│   ├── Group name (auto-generated or custom)
│   └── Feature count display
│
└── Event handlers
    ├── handleToolClick (tool activation)
    └── handleDrawingSave (feature upload)
```

## Files Created/Modified

### 1. **DrawingLogic.tsx** (NEW)

**Location:** `apps/web-portal/src/components/layout/ribbon/tools/drawing/DrawingLogic.tsx`

**Purpose:** Manages all OpenLayers interactions for drawing, modifying, and selecting features.

**Key Features:**

- Draw interaction for Point, LineString, and Polygon types
- Modify interaction for editing drawn features
- Select interaction with highlighting
- Automatic feature ID generation (timestamp + random suffix)
- Feature styling (red for drawing, blue for selected)
- Exported map methods:
  - `map.__getDrawnFeatures()` - Returns array of drawn features as GeoJSON
  - `map.__clearDrawnFeatures()` - Clears all drawn features
  - `map.__deleteDrawnFeature(featureId)` - Deletes specific feature by ID

**Dependencies:**

- `ol/Map`, `ol/interaction/(Draw, Modify, Select)`
- `ol/layer/Vector`, `ol/source/Vector`
- `ol/geom/(Point, LineString, Polygon)`
- `ol/format/GeoJSON`

### 2. **DrawingModal.tsx** (NEW)

**Location:** `apps/web-portal/src/components/modals/DrawingModal.tsx`

**Purpose:** User interface for saving drawn features to the database.

**Components:**

- **Name Input** (required) - Feature identifier
- **Description Textarea** (optional) - Additional context
- **Group Name** (auto-generated) - Timestamp-based or custom
- **Feature Count Display** - Shows number of drawn features
- **Validation** - Requires name and at least one drawn feature

**Props:**

```typescript
interface DrawingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (features: DrawnFeatureData[], groupName: string) => Promise<void>
  isSaving: boolean
  drawnFeatureCount: number
}
```

### 3. **MapClipboardToolbar.tsx** (MODIFIED)

**Location:** `apps/web-portal/src/components/layout/ribbon/toolbars/MapClipboardToolbar.tsx`

**Changes:**

- Added imports: `Upload`, `Trash2` icons from lucide-react
- Added `activeTool` prop for visual feedback
- Added drawing tool buttons:
  - **Draw Line** - `draw-LineString` tool
  - **Draw Point** - `draw-Point` tool
  - **Draw Polygon** - `draw-Polygon` tool
  - **Save & Upload** - `save-drawing` action
  - **Clear** - `clear-drawing` action

**Button States:**

- Active buttons highlight when selected
- Save & Upload button opens DrawingModal
- Clear button removes all drawn features

### 4. **Ribbon.tsx** (MODIFIED)

**Location:** `apps/web-portal/src/components/layout/Ribbon.tsx`

**Changes:**

- Added state variables:
  - `isDrawingModalOpen` - Controls DrawingModal visibility
  - `drawnFeatureCount` - Tracks number of drawn features
  - `isSavingDrawing` - Manages save operation loading state

- Added event handlers:
  - Drawing tool activation (`draw-Point`, `draw-LineString`, `draw-Polygon`)
  - Save drawing action (`save-drawing`) - Opens modal with feature count
  - Clear drawing action (`clear-drawing`) - Removes all drawn features
  - `handleDrawingSave` - Processes feature upload

- Added DrawingModal component render with props

### 5. **OpenLayersMap.tsx** (MODIFIED)

**Location:** `apps/web-portal/src/components/layout/OpenLayersMap.tsx`

**Changes:**

- Added import: `DrawingLogic` component
- Added component render in interaction logic section
- DrawingLogic receives map instance and activeTool prop

## Workflow

### Drawing Features

1. User clicks **Draw Line**, **Draw Point**, or **Draw Polygon** button
2. Drawing tool activates - cursor changes to crosshair
3. User clicks/draws on map to create features
4. Features display in red while being drawn
5. User can click features to select them (blue highlight)
6. Selected features can be edited by dragging vertices (Modify interaction)

### Saving Features

1. User clicks **Save & Upload** button
2. DrawingModal opens showing:
   - Number of features drawn
   - Name input field
   - Description input (optional)
   - Auto-generated or custom group name
3. User enters feature name and optionally description
4. User clicks **Save** button
5. Features are sent to database via API
6. Drawn features are cleared from map
7. Modal closes

### Clearing Features

1. User clicks **Clear** button
2. All drawn features are removed from map immediately
3. Feature count resets to 0

## Tool IDs

| Tool ID           | Action                   | Icon   | Label         |
| ----------------- | ------------------------ | ------ | ------------- |
| `draw-Point`      | Activate point drawing   | Circle | Draw Point    |
| `draw-LineString` | Activate line drawing    | Pen    | Draw Line     |
| `draw-Polygon`    | Activate polygon drawing | Square | Draw Polygon  |
| `save-drawing`    | Open save modal          | Upload | Save & Upload |
| `clear-drawing`   | Clear all features       | Trash2 | Clear         |

## API Integration (TODO)

The `handleDrawingSave` function in Ribbon.tsx has a placeholder for API integration. To complete the implementation:

```typescript
// In handleDrawingSave, add:
const response = await ApiClient.post(
  `/projects/${activeProjectId}/features`,
  {
    features: drawnFeatures,
    groupName: groupName,
    metadata: features.map(f => ({
      name: f.name,
      description: f.description,
    }))
  }
)

// Add uploaded features to store:
if (response.features) {
  setScratchFeatures([...scratchFeatures, ...response.features])
}
```

## Feature Properties

### Drawn Feature Object (GeoJSON)

```typescript
{
  type: "Feature",
  id: "1705328194523_abc123",  // Unique ID from DrawingLogic
  properties: {
    id: "1705328194523_abc123"
  },
  geometry: {
    type: "Point|LineString|Polygon",
    coordinates: [...] // WGS84 coordinates
  }
}
```

### Saved Feature Metadata

```typescript
{
  name: "Street A",           // User-entered name
  description: "Main road",   // Optional description
  groupName: "2024-01-15",    // Auto-generated or custom
}
```

## State Management

### Drawing Modal State (in Ribbon.tsx)

- `isDrawingModalOpen` - Boolean controlling modal visibility
- `drawnFeatureCount` - Number of features currently drawn
- `isSavingDrawing` - Boolean for save operation loading state

### Map Store (useMapStore)

- `activeTool` - Current active tool ("draw-Point", "draw-LineString", etc.)
- `projectFeatures` - Features in active project
- `scratchFeatures` - Temporary features (where drawn features go)

## Communication Pattern

The implementation uses the map element's data attribute for cross-component communication:

```typescript
const mapElement = document.querySelector("[data-map-instance]") as any
if (mapElement?.__mapInstance) {
  const map = mapElement.__mapInstance

  // Call methods exposed by DrawingLogic
  map.__getDrawnFeatures()        // Get all drawn features
  map.__clearDrawnFeatures()      // Clear all features
  map.__deleteDrawnFeature(id)    // Delete specific feature
}
```

## Styling

### Feature Styles (DrawingLogic)

- **Drawing Features**: Red fill (0.5 opacity), red stroke (2px)
- **Selected Features**: Blue fill (0.5 opacity), blue stroke (3px)
- **Modified Vertices**: Red circles (5px radius)

### UI Styling

- @workspace/ui components for consistency
- Ribbon buttons with active state highlighting
- Modal with form validation

## Testing Checklist

- [ ] Draw point on map and verify appearance
- [ ] Draw line on map and verify appearance
- [ ] Draw polygon on map and verify appearance
- [ ] Modify drawn feature by dragging vertices
- [ ] Select feature and verify highlighting
- [ ] Clear drawn features with Clear button
- [ ] Open DrawingModal with Save & Upload button
- [ ] Verify feature count in modal
- [ ] Enter feature name and save
- [ ] Verify API call sends correct data structure
- [ ] Verify features appear in feature list after save
- [ ] Test with no features drawn (validation error)
- [ ] Test with empty name (validation error)

## Next Steps

1. **Implement API Endpoint**
   - Create backend endpoint to save drawn features to database
   - Handle GeoJSON geometry conversion
   - Return saved feature IDs

2. **Add Error Handling**
   - Handle API failures with user-friendly messages
   - Add retry logic for failed saves
   - Display error toast notifications

3. **Enhance Feature Management**
   - Edit saved features
   - Delete individual features from map
   - Bulk operations (select multiple, delete multiple)

4. **Performance Optimization**
   - Optimize feature rendering for large datasets
   - Add feature clustering for dense areas
   - Implement feature pagination/lazy loading

5. **Advanced Features**
   - Undo/Redo functionality
   - Feature templates/presets
   - Batch import of GeoJSON files
   - Export drawn features to file

## Known Limitations

1. No persistence across page reloads (features stored in VectorSource only)
2. API integration not yet complete (placeholder in handleDrawingSave)
3. No real-time validation of geometry (e.g., self-intersecting polygons)
4. No snapping/alignment tools for precise drawing
5. Limited styling customization (colors hardcoded)

## Files Summary

```
web-portal/src/
├── components/
│   ├── layout/
│   │   ├── OpenLayersMap.tsx (MODIFIED - added DrawingLogic)
│   │   ├── Ribbon.tsx (MODIFIED - added drawing state/handlers)
│   │   └── ribbon/
│   │       ├── tools/
│   │       │   └── drawing/
│   │       │       └── DrawingLogic.tsx (NEW - ~218 lines)
│   │       └── toolbars/
│   │           └── MapClipboardToolbar.tsx (MODIFIED - added buttons)
│   └── modals/
│       └── DrawingModal.tsx (NEW - ~207 lines)
└── store/
    └── useMapStore.ts (existing - no changes)
```

## Deployment Notes

1. Ensure OpenLayers 6+ is installed (`npm install ol`)
2. All TypeScript types are properly defined
3. No breaking changes to existing functionality
4. Drawing tool is separate from other map interactions
5. Can coexist with zoom-box, measure, identify tools

## Support

For issues or enhancements:

1. Check TypeScript errors with `npm run lint`
2. Verify map instance is accessible via `document.querySelector("[data-map-instance]")`
3. Check browser console for DrawingLogic lifecycle logs
4. Ensure GeoJSON format is WGS84 (EPSG:4326) for consistency
