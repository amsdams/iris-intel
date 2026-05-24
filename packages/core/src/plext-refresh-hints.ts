import type {Plext} from './store';

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
