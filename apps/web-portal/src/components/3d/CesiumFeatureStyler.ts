import * as Cesium from 'cesium';
import Feature from 'ol/Feature';
import { Geometry, Polygon, LineString, Point } from 'ol/geom';

/**
 * Handles 3D styling and extrusion of OpenLayers features in Cesium.
 */
export class CesiumFeatureStyler {
  
  /**
   * Custom synchronization for vector features to apply extrusion.
   * ol-cesium allows overriding the default feature conversion.
   */
  public static apply3DStyles(cesiumEntity: Cesium.Entity, olFeature: Feature<Geometry>) {
    const geometry = olFeature.getGeometry();
    if (!geometry) return;

    if (geometry instanceof Polygon) {
      this.stylePolygon(cesiumEntity, olFeature);
    } else if (geometry instanceof LineString) {
      this.styleLine(cesiumEntity, olFeature);
    } else if (geometry instanceof Point) {
      this.stylePoint(cesiumEntity, olFeature);
    }
  }

  private static stylePolygon(entity: Cesium.Entity, feature: Feature) {
    if (!entity.polygon) return;

    // Determine height and extrusion
    // Priority: attribute 'height' or 'extrusion' -> fallback defaults
    const heightAttr = feature.get('height') || feature.get('elevation') || 2;
    const extrusionAttr = feature.get('extrusion') || feature.get('depth') || 10;

    entity.polygon.height = new Cesium.ConstantProperty(heightAttr);
    entity.polygon.extrudedHeight = new Cesium.ConstantProperty(heightAttr + extrusionAttr);
    entity.polygon.heightReference = new Cesium.ConstantProperty(Cesium.HeightReference.RELATIVE_TO_GROUND);
    entity.polygon.extrudedHeightReference = new Cesium.ConstantProperty(Cesium.HeightReference.RELATIVE_TO_GROUND);
    
    // Aesthetic adjustments
    const color = entity.polygon.material?.getValue(Cesium.JulianDate.now())?.color || Cesium.Color.CYAN;
    entity.polygon.material = new Cesium.ColorMaterialProperty(
      color.withAlpha(0.6)
    );
    entity.polygon.outline = new Cesium.ConstantProperty(true);
    entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE);
  }

  private static styleLine(entity: Cesium.Entity, feature: Feature) {
    if (!entity.polyline) return;

    // Lift lines above terrain
    const elevation = feature.get('elevation') || feature.get('height') || 5;
    
    entity.polyline.width = new Cesium.ConstantProperty(4);
    entity.polyline.material = new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW.withAlpha(0.8));
    
    // To truly elevate them, we should ensure they don't clamp to ground
    entity.polyline.clampToGround = new Cesium.ConstantProperty(false);
    
    // If the positions are just [lon, lat], they will be on the ellipsoid.
    // ol-cesium usually converts them to Cartesian3.
    // We can try to add a vertical offset if needed, but often setting clampToGround=false 
    // and having height in the coordinates (if provided) is enough.
    // If no height in coordinates, we can try to "lift" them:
    /*
    const positions = entity.polyline.positions?.getValue(Cesium.JulianDate.now());
    if (positions) {
        const lifted = positions.map((p: Cesium.Cartesian3) => {
            const carto = Cesium.Cartographic.fromCartesian(p);
            carto.height += elevation;
            return Cesium.Cartesian3.fromCartographic(carto);
        });
        entity.polyline.positions = new Cesium.ConstantProperty(lifted);
    }
    */
  }

  private static stylePoint(entity: Cesium.Entity, _feature: Feature) {
    // Point features can be rendered as billboards or points.
    // If it's a point:
    if (entity.point) {
      entity.point.pixelSize = new Cesium.ConstantProperty(10);
      entity.point.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE);
      entity.point.outlineWidth = new Cesium.ConstantProperty(2);
      entity.point.heightReference = new Cesium.ConstantProperty(Cesium.HeightReference.RELATIVE_TO_GROUND);
    }
    
    if (entity.billboard) {
      entity.billboard.heightReference = new Cesium.ConstantProperty(Cesium.HeightReference.RELATIVE_TO_GROUND);
      entity.billboard.verticalOrigin = new Cesium.ConstantProperty(Cesium.VerticalOrigin.BOTTOM);
    }
  }
}
