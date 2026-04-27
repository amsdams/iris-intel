import {EntityLogic, Field, globalSpatialIndex, Portal} from '@iris/core';

export interface MapPoint {
  x: number;
  y: number;
}

export type MapProjector = (lng: number, lat: number) => MapPoint | null;

export interface MapSelectionContext {
  portals: Record<string, Portal>;
  fields: Record<string, Field>;
  point: MapPoint;
  lng: number;
  lat: number;
  zoom: number;
  project: MapProjector;
  portalThreshold?: number;
  coordinateTolerance?: number;
  fastPathPortalCount?: number;
}

export type MapSelectionResult = 
  | { portalId: string; reason: 'portal' }
  | { fieldId: string; reason: 'field' };

function squaredDistance(a: MapPoint, b: MapPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function isNearCoordinates(
  portal: Portal,
  lng: number,
  lat: number,
  tolerance: number
): boolean {
  return Math.abs(portal.lng - lng) <= tolerance && Math.abs(portal.lat - lat) <= tolerance;
}

function getApproxQueryDelta(zoom: number, thresholdPx: number): number {
  const normalizedZoom = Math.max(0, Math.min(24, zoom));
  const degreesPerPixelAtEquator = 360 / (256 * (2 ** normalizedZoom));
  return Math.max(0.002, degreesPerPixelAtEquator * thresholdPx * 1.5);
}

export function resolveMapSelection(context: MapSelectionContext): MapSelectionResult | null {
  const {
    portals,
    fields,
    point,
    lng,
    lat,
    zoom,
    project,
    portalThreshold = 20,
    coordinateTolerance = 0.01,
    fastPathPortalCount = 400,
  } = context;

  const useFastPath = Object.keys(portals).length >= fastPathPortalCount;
  const candidatePortalIds = new Set<string>();
  const candidateFieldIds = new Set<string>();

  if (useFastPath) {
    const queryDelta = getApproxQueryDelta(zoom, portalThreshold);
    const hits = globalSpatialIndex.query({
      minLat: lat - queryDelta,
      minLng: lng - queryDelta,
      maxLat: lat + queryDelta,
      maxLng: lng + queryDelta,
    });

    hits.forEach((hit) => {
      if (hit.type === 'portal') candidatePortalIds.add(hit.id);
      if (hit.type === 'field') candidateFieldIds.add(hit.id);
    });
  }

  let nearestPortal: Portal | null = null;
  let nearestPortalDistanceSq = portalThreshold * portalThreshold;

  for (const portal of Object.values(portals)) {
    if (useFastPath && !candidatePortalIds.has(portal.id)) continue;
    if (!isNearCoordinates(portal, lng, lat, coordinateTolerance)) continue;

    const projected = project(portal.lng, portal.lat);
    if (!projected) continue;

    const distance = squaredDistance(projected, point);
    if (distance < nearestPortalDistanceSq) {
      nearestPortalDistanceSq = distance;
      nearestPortal = portal;
    }
  }

  if (nearestPortal) {
    return {portalId: nearestPortal.id, reason: 'portal'};
  }

  // If no portal hit, check fields
  const fieldList = useFastPath 
    ? Array.from(candidateFieldIds).map(id => fields[id]).filter(f => !!f)
    : Object.values(fields);

  for (const field of fieldList) {
    if (EntityLogic.isPointInField({lng, lat}, field)) {
      return {fieldId: field.id, reason: 'field'};
    }
  }

  return null;
}
