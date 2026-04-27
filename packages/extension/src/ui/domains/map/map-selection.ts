import {EntityLogic, Field, globalSpatialIndex, Link, Portal} from '@iris/core';

export interface MapPoint {
  x: number;
  y: number;
}

export type MapProjector = (lng: number, lat: number) => MapPoint | null;

export interface MapSelectionContext {
  portals: Record<string, Portal>;
  fields: Record<string, Field>;
  links: Record<string, Link>;
  point: MapPoint;
  lng: number;
  lat: number;
  zoom: number;
  project: MapProjector;
  portalThreshold?: number;
  linkThreshold?: number;
  coordinateTolerance?: number;
  fastPathPortalCount?: number;
}

export type MapSelectionResult = 
  | { portalId: string; reason: 'portal' }
  | { fieldId: string; reason: 'field' }
  | { linkId: string; reason: 'link' };

function squaredDistance(a: MapPoint, b: MapPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function distSqToSegment(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return squaredDistance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return squaredDistance(p, {
    x: a.x + t * dx,
    y: a.y + t * dy,
  });
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
    links,
    point,
    lng,
    lat,
    zoom,
    project,
    portalThreshold = 20,
    linkThreshold = 10,
    coordinateTolerance = 0.01,
    fastPathPortalCount = 400,
  } = context;

  const useFastPath = Object.keys(portals).length >= fastPathPortalCount;
  const candidatePortalIds = new Set<string>();
  const candidateFieldIds = new Set<string>();
  const candidateLinkIds = new Set<string>();

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
      if (hit.type === 'link') candidateLinkIds.add(hit.id);
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

  // If no portal hit, check links (higher priority than fields)
  const linkList = useFastPath
    ? Array.from(candidateLinkIds).map(id => links[id]).filter(l => !!l)
    : Object.values(links);
  
  let nearestLink: Link | null = null;
  let nearestLinkDistSq = linkThreshold * linkThreshold;

  for (const link of linkList) {
    const p1 = project(link.fromLng, link.fromLat);
    const p2 = project(link.toLng, link.toLat);
    if (!p1 || !p2) continue;

    const distSq = distSqToSegment(point, p1, p2);
    if (distSq < nearestLinkDistSq) {
      nearestLinkDistSq = distSq;
      nearestLink = link;
    }
  }

  if (nearestLink) {
    return {linkId: nearestLink.id, reason: 'link'};
  }

  // If no portal or link hit, check fields
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
