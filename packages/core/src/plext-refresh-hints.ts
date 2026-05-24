import type {Plext, Portal} from './store';

export interface PlextPortalRefreshHint {
  plextId: string;
  plextTime: number;
  name?: string;
  latE6: number;
  lngE6: number;
  reason: 'portal_activity';
}

export interface ExtractPlextPortalRefreshHintsOptions {
  now?: number;
  maxAgeMs?: number;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
const DEFAULT_PORTAL_COORDINATE_TOLERANCE_E6 = 50;

export function extractPlextPortalRefreshHints(
  plexts: Plext[],
  options: ExtractPlextPortalRefreshHintsOptions = {},
): PlextPortalRefreshHint[] {
  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const hints = new Map<string, PlextPortalRefreshHint>();

  for (const plext of plexts) {
    if (now - plext.time > maxAgeMs) continue;

    for (const [kind, value] of plext.markup) {
      if (kind !== 'PORTAL' && kind !== 'LINK') continue;
      const latE6 = value.latE6;
      const lngE6 = value.lngE6;
      if (typeof latE6 !== 'number' || typeof lngE6 !== 'number') continue;

      const key = `${latE6}:${lngE6}`;
      if (hints.has(key)) continue;
      hints.set(key, {
        plextId: plext.id,
        plextTime: plext.time,
        name: value.name ?? value.plain,
        latE6,
        lngE6,
        reason: 'portal_activity',
      });
    }
  }

  return Array.from(hints.values());
}

export interface ResolvePlextPortalRefreshHintOptions {
  coordinateToleranceE6?: number;
}

export function resolvePlextPortalRefreshHint(
  hint: PlextPortalRefreshHint,
  portals: Iterable<Portal>,
  options: ResolvePlextPortalRefreshHintOptions = {},
): Portal | null {
  const coordinateToleranceE6 = options.coordinateToleranceE6 ?? DEFAULT_PORTAL_COORDINATE_TOLERANCE_E6;
  const normalizedName = hint.name?.trim().toLowerCase();
  let bestPortal: Portal | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const portal of portals) {
    const latDelta = Math.abs(Math.round(portal.lat * 1e6) - hint.latE6);
    const lngDelta = Math.abs(Math.round(portal.lng * 1e6) - hint.lngE6);
    if (latDelta > coordinateToleranceE6 || lngDelta > coordinateToleranceE6) continue;

    const portalName = portal.name?.trim().toLowerCase();
    const namePenalty = normalizedName && portalName && portalName !== normalizedName ? coordinateToleranceE6 : 0;
    const score = latDelta + lngDelta + namePenalty;
    if (score < bestScore) {
      bestScore = score;
      bestPortal = portal;
    }
  }

  return bestPortal;
}
