# Drawing Tool Quick Reference

## How to Use

### Drawing Features (3 Steps)

#### 1. Select Drawing Mode

In the **Clipboard** toolbar, click one of these buttons:

- **Draw Line** (Pen icon) - Draw continuous lines/paths
- **Draw Point** (Circle icon) - Draw individual points
- **Draw Polygon** (Square icon) - Draw enclosed areas

#### 2. Draw on Map

- **Point**: Single click on the map
- **Line**: Click multiple times to create line segments, double-click to finish
- **Polygon**: Click to create vertices, double-click to close the shape

#### 3. Save Features

Click **Save & Upload** button to open the save dialog:

1. Enter a **Feature Name** (required)
2. Add optional **Description**
3. Choose or modify **Group Name** (auto-filled with date)
4. Click **Save** to upload to database

### Editing Features

After drawing, you can:

- **Modify**: Click a feature to select it (turns blue), then drag vertices to edit
- **Select**: Click a feature to highlight it
- **Delete**: Select a feature and press Delete or use the Delete button

### Clearing Features

Click the **Clear** button to remove all drawn features from the map.

## Feature Types

| Type    | Icon   | Use Case                        |
| ------- | ------ | ------------------------------- |
| Point   | Circle | Locations, landmarks, incidents |
| Line    | Pen    | Routes, boundaries, corridors   |
| Polygon | Square | Areas, zones, regions           |

## Keyboard Shortcuts

- **Esc**: Cancel current drawing operation
- **Delete**: Remove selected feature
- **Enter**: Finish drawing (alternative to double-click)

## File Format

Drawn features are saved as GeoJSON with the following structure:

```json
{
  "type": "Feature",
  "id": "1705328194523_abc123",
  "geometry": {
    "type": "Point|LineString|Polygon",
    "coordinates": [lon, lat]
  },
  "properties": {
    "name": "Feature Name",
    "description": "Optional description",
    "groupName": "2024-01-15",
    "id": "1705328194523_abc123"
  }
}
```

## Status Indicators

- **Red features**: Being drawn
- **Blue features**: Selected/highlighted
- **Blue vertices**: Edit handles on selected features
- **Feature count**: Shows in Save dialog

## Tips & Tricks

1. **Accurate Drawing**: Zoom in before drawing for better precision
2. **Undo Modifications**: Click elsewhere to deselect, then re-edit
3. **Bulk Operations**: Draw multiple features before saving once
4. **Naming Convention**: Use descriptive names with dates/references
5. **Grouping**: Use Group Name to organize related features

## Troubleshooting

### "Feature count shows 0"

- Make sure you've actually drawn something on the map
- Check that features are visible (not covered by other layers)
- Try zooming to a different map area

### "Save button is disabled"

- Ensure Feature Name is not empty
- Verify at least one feature is drawn
- Check browser console for errors

### "Features disappear after drawing"

- Make sure the drawing layer is not hidden
- Check that the map isn't zoomed too far out
- Try clicking "Save & Upload" to confirm features exist

### "Can't edit features"

- Click the feature first to select it (should turn blue)
- Only selected features can be modified
- Try double-clicking a vertex to delete it

## Limitations

- Features are not persisted if you refresh the page (until saved to database)
- Maximum of ~1000 features recommended before performance degrades
- No automatic validation of geometry (e.g., self-intersecting polygons)
- Coordinates are in WGS84 (EPSG:4326) format

## Integration Points

### Accessing Drawn Features (For Developers)

```typescript
// Get map instance
const mapElement = document.querySelector("[data-map-instance]") as any
const map = mapElement?.__mapInstance

// Get all drawn features as GeoJSON
const features = map.__getDrawnFeatures()

// Clear all drawn features
map.__clearDrawnFeatures()

// Delete specific feature
map.__deleteDrawnFeature("1705328194523_abc123")
```

### API Integration

Drawn features are sent to:

```
POST /projects/{projectId}/features
```

With payload:

```json
{
  "features": [
    {
      "name": "Street Name",
      "description": "Optional details",
      "geometry": {...}
    }
  ],
  "groupName": "2024-01-15"
}
```

## Related Tools

- **Zoom Box**: Zoom to specific area before drawing
- **Identify**: Click features to get information
- **Measure**: Measure distances and areas
- **Generate Chainage**: Create markers along a line

## Support Resources

- Check [DRAWING_TOOL_IMPLEMENTATION.md](./DRAWING_TOOL_IMPLEMENTATION.md) for technical details
- OpenLayers documentation: https://openlayers.org/en/latest/doc/
- GeoJSON format: https://geojson.org/
