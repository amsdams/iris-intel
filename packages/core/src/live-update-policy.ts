import {boundsE6ContainsPoint, type BoundsE6} from './geo-bounds';
import {extractPlextPortalRefreshHints, type PlextPortalRefreshHint} from './plext-refresh-hints';
import type {Plext} from './store';

export interface CurrentViewPlextHintsOptions {
  bounds: BoundsE6 | null | undefined;
  now?: number;
  maxAgeMs: number;
}

export function getCurrentViewPlextPortalRefreshHints(
  plexts: Plext[],
  options: CurrentViewPlextHintsOptions,
): PlextPortalRefreshHint[] {
  const bounds = options.bounds;
  if (!bounds) return [];

  const hints = extractPlextPortalRefreshHints(plexts, {
    now: options.now,
    maxAgeMs: options.maxAgeMs,
  });

  return hints.filter((hint) => boundsE6ContainsPoint(bounds, hint));
}

export type CommTopologyRefreshDecisionReason =
  | 'schedule'
  | 'no_hints'
  | 'pending'
  | 'cooldown'
  | 'too_many_tiles';

export interface CommTopologyRefreshDecision {
  shouldRefresh: boolean;
  reason: CommTopologyRefreshDecisionReason;
  message: string;
}

export interface SelectCommTopologyRefreshOptions {
  hintCount: number;
  tileCount?: number;
  maxTileCount?: number;
  pending: boolean;
  now?: number;
  lastRefreshAt: number;
  cooldownMs: number;
}

export function selectCommTopologyRefresh(
  options: SelectCommTopologyRefreshOptions,
): CommTopologyRefreshDecision {
  const hintCount = Math.max(0, options.hintCount);
  if (hintCount === 0) {
    return {
      shouldRefresh: false,
      reason: 'no_hints',
      message: 'comm_activity skipped (0 hints)',
    };
  }

  if (options.pending) {
    return {
      shouldRefresh: false,
      reason: 'pending',
      message: `comm_activity coalesced (${hintCount} hints)`,
    };
  }

  const now = options.now ?? Date.now();
  if (now - options.lastRefreshAt < options.cooldownMs) {
    return {
      shouldRefresh: false,
      reason: 'cooldown',
      message: `comm_activity cooldown (${hintCount} hints)`,
    };
  }

  const tileCount = options.tileCount ?? 0;
  const maxTileCount = options.maxTileCount ?? Number.POSITIVE_INFINITY;
  if (tileCount > maxTileCount) {
    return {
      shouldRefresh: false,
      reason: 'too_many_tiles',
      message: `comm_activity skipped (${hintCount} hints, ${tileCount} tiles)`,
    };
  }

  return {
    shouldRefresh: true,
    reason: 'schedule',
    message: `comm_activity scheduled (${hintCount} hints)`,
  };
}
