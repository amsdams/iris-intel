import {INGRESS_ENTITY_STYLE} from './ingress-map-style';

export type PortalHealthBucket = 25 | 50 | 75 | 100;

export function getPortalHealthBucket(health: number): PortalHealthBucket {
  if (health <= 25) return 25;
  if (health <= 50) return 50;
  if (health <= 75) return 75;
  return 100;
}

export function isPortalHealthBucketVisible(
  health: number | undefined,
  visibleBuckets: Record<number, boolean>,
): boolean {
  if (health === undefined) return true;
  return visibleBuckets[getPortalHealthBucket(health)] !== false;
}

export function getIngressPortalRadiusForZoom(zoom: number): number {
  const stops = INGRESS_ENTITY_STYLE.portalRadiusStops;
  if (!Number.isFinite(zoom)) return stops[0].radius;

  for (let index = 0; index < stops.length - 1; index += 1) {
    const current = stops[index];
    const next = stops[index + 1];
    if (zoom <= next.zoom) {
      const range = next.zoom - current.zoom;
      if (range <= 0) return next.radius;
      const ratio = Math.max(0, Math.min(1, (zoom - current.zoom) / range));
      return current.radius + ((next.radius - current.radius) * ratio);
    }
  }

  return stops[stops.length - 1].radius;
}
