export const E6 = 1_000_000;

export interface BoundsE6 {
  minLatE6: number;
  minLngE6: number;
  maxLatE6: number;
  maxLngE6: number;
}

export interface LatLngBoundsDegrees {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface LatLngDegrees {
  lat: number;
  lng: number;
}

export interface LatLngE6 {
  latE6: number;
  lngE6: number;
}

export function degreesToE6(value: number): number {
  return Math.round(value * E6);
}

export function e6ToDegrees(value: number): number {
  return value / E6;
}

export function latLngToE6(point: LatLngDegrees): LatLngE6 {
  return {
    latE6: degreesToE6(point.lat),
    lngE6: degreesToE6(point.lng),
  };
}

export function boundsToE6(bounds: LatLngBoundsDegrees): BoundsE6 {
  return {
    minLatE6: degreesToE6(bounds.south),
    minLngE6: degreesToE6(bounds.west),
    maxLatE6: degreesToE6(bounds.north),
    maxLngE6: degreesToE6(bounds.east),
  };
}

export function isFiniteBoundsE6(bounds: BoundsE6): boolean {
  return Number.isFinite(bounds.minLatE6) &&
    Number.isFinite(bounds.minLngE6) &&
    Number.isFinite(bounds.maxLatE6) &&
    Number.isFinite(bounds.maxLngE6);
}

export function normalizeLongitudeDegrees(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function boundsE6ContainsPoint(bounds: BoundsE6, point: LatLngE6): boolean {
  const minLatE6 = Math.min(bounds.minLatE6, bounds.maxLatE6);
  const maxLatE6 = Math.max(bounds.minLatE6, bounds.maxLatE6);
  if (point.latE6 < minLatE6 || point.latE6 > maxLatE6) return false;

  if (bounds.minLngE6 <= bounds.maxLngE6) {
    return point.lngE6 >= bounds.minLngE6 && point.lngE6 <= bounds.maxLngE6;
  }

  return point.lngE6 >= bounds.minLngE6 || point.lngE6 <= bounds.maxLngE6;
}

export function boundsE6ContainsLatLng(bounds: BoundsE6, point: LatLngDegrees): boolean {
  return boundsE6ContainsPoint(bounds, latLngToE6(point));
}

export function boundsE6ContainsBounds(container: BoundsE6, contained: BoundsE6): boolean {
  if (!isFiniteBoundsE6(container) || !isFiniteBoundsE6(contained)) return false;

  const south = Math.min(contained.minLatE6, contained.maxLatE6);
  const north = Math.max(contained.minLatE6, contained.maxLatE6);
  const west = contained.minLngE6;
  const east = contained.maxLngE6;

  return boundsE6ContainsPoint(container, {latE6: south, lngE6: west}) &&
    boundsE6ContainsPoint(container, {latE6: south, lngE6: east}) &&
    boundsE6ContainsPoint(container, {latE6: north, lngE6: west}) &&
    boundsE6ContainsPoint(container, {latE6: north, lngE6: east});
}

function normalizeLongitudeE6(lngE6: number): number {
  return degreesToE6(normalizeLongitudeDegrees(e6ToDegrees(lngE6)));
}

export function estimateBoundsE6FromPreviousViewport(
  previousBounds: BoundsE6 | null | undefined,
  previousZoom: number,
  center: LatLngDegrees,
  zoom: number,
): BoundsE6 | null {
  if (!previousBounds || !isFiniteBoundsE6(previousBounds)) return null;
  if (!Number.isFinite(previousZoom) || !Number.isFinite(zoom)) return null;

  const latSpan = Math.max(1, Math.abs(previousBounds.maxLatE6 - previousBounds.minLatE6));
  const lngSpan = previousBounds.minLngE6 <= previousBounds.maxLngE6
    ? previousBounds.maxLngE6 - previousBounds.minLngE6
    : 360_000_000 - previousBounds.minLngE6 + previousBounds.maxLngE6;
  const scale = Math.max(1 / 64, Math.min(64, 2 ** (previousZoom - zoom)));
  const halfLatSpan = Math.max(1, Math.round((latSpan * scale) / 2));
  const halfLngSpan = Math.max(1, Math.round((Math.max(1, lngSpan) * scale) / 2));
  const centerE6 = latLngToE6(center);

  return {
    minLatE6: Math.max(-90_000_000, centerE6.latE6 - halfLatSpan),
    minLngE6: normalizeLongitudeE6(centerE6.lngE6 - halfLngSpan),
    maxLatE6: Math.min(90_000_000, centerE6.latE6 + halfLatSpan),
    maxLngE6: normalizeLongitudeE6(centerE6.lngE6 + halfLngSpan),
  };
}
