import {INGRESS_ENTITY_STYLE} from './ingress-map-style';
import type {PortalResonator} from './store';

export type PortalHealthBucket = 25 | 50 | 75 | 100;

export const RESONATOR_MAX_ENERGY_BY_LEVEL = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000] as const;

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

export function getMaxResonatorEnergy(level: number | null | undefined): number {
  if (!Number.isInteger(level) || level === null || level === undefined) return 0;
  return RESONATOR_MAX_ENERGY_BY_LEVEL[level] ?? 0;
}

export function getResonatorEnergyPercent(resonator: Pick<PortalResonator, 'level' | 'energy'> | null | undefined): number {
  if (!resonator) return 0;
  const maxEnergy = getMaxResonatorEnergy(resonator.level);
  if (maxEnergy <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((resonator.energy / maxEnergy) * 100)));
}

export function getPortalResonatorEnergySummary(resonators: PortalResonator[] | null | undefined): {
  totalEnergy: number;
  maxEnergy: number;
} {
  const activeResonators = resonators ?? [];
  return activeResonators.reduce((summary, resonator) => ({
    totalEnergy: summary.totalEnergy + resonator.energy,
    maxEnergy: summary.maxEnergy + getMaxResonatorEnergy(resonator.level),
  }), {
    totalEnergy: 0,
    maxEnergy: 0,
  });
}
