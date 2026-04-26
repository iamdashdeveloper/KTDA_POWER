import * as Cesium from 'cesium';

export interface ProfilePoint {
  distance: number;
  elevation: number;
  longitude: number;
  latitude: number;
}

/**
 * Interpolates between two points (legacy support)
 */
export function interpolatePoints(start: Cesium.Cartesian3, end: Cesium.Cartesian3, samples: number = 250): Cesium.Cartesian3[] {
  const points: Cesium.Cartesian3[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    points.push(Cesium.Cartesian3.lerp(start, end, t, new Cesium.Cartesian3()));
  }
  return points;
}

/**
 * Densifies a path of multiple points to ensure smooth terrain sampling
 */
export function densifyPath(path: Cesium.Cartesian3[], targetSamples: number = 300): Cesium.Cartesian3[] {
  if (path.length < 2) return path;

  // Calculate total length of the path
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const dist = Cesium.Cartesian3.distance(path[i], path[i + 1]);
    totalLength += dist;
    segmentLengths.push(dist);
  }

  if (totalLength === 0) return path;

  const densified: Cesium.Cartesian3[] = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    const segmentLength = segmentLengths[i];
    
    // Allocate samples to this segment based on its proportion of total length
    const segmentSamples = Math.max(1, Math.round((segmentLength / totalLength) * targetSamples));
    
    for (let j = 0; j < segmentSamples; j++) {
      const t = j / segmentSamples;
      densified.push(Cesium.Cartesian3.lerp(start, end, t, new Cesium.Cartesian3()));
    }
  }
  
  // Add the final point
  densified.push(path[path.length - 1]);
  
  return densified;
}

export function computeProfile(pointsCartesian: Cesium.Cartesian3[], sampledCartographic: Cesium.Cartographic[]): ProfilePoint[] {
  const result: ProfilePoint[] = [];
  let totalDistance = 0;

  for (let i = 0; i < pointsCartesian.length; i++) {
    if (i > 0) {
      totalDistance += Cesium.Cartesian3.distance(
        pointsCartesian[i - 1],
        pointsCartesian[i]
      );
    }

    result.push({
      distance: totalDistance,
      elevation: sampledCartographic[i].height,
      longitude: Cesium.Math.toDegrees(sampledCartographic[i].longitude),
      latitude: Cesium.Math.toDegrees(sampledCartographic[i].latitude),
    });
  }

  return result;
}

export function getHeightFromZoom(zoom: number): number {
  return 20000000 / Math.pow(2, zoom);
}

export function getZoomFromHeight(height: number): number {
  return Math.log2(20000000 / height);
}
