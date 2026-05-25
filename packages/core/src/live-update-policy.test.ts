import {describe, expect, it} from 'vitest';
import {getCurrentViewPlextPortalRefreshHints, selectCommTopologyRefresh} from './live-update-policy';
import type {Plext} from './store';

const now = 1_000_000;

function plext(id: string, latE6: number, lngE6: number, time = now): Plext {
  return {
    id,
    time,
    type: 'SYSTEM_BROADCAST',
    team: 'ENLIGHTENED',
    categories: 1,
    text: 'activity',
    markup: [
      ['PORTAL', {
        plain: 'Portal',
        name: 'Portal',
        address: '',
        latE6,
        lngE6,
        team: 'ENLIGHTENED',
      }],
    ],
  };
}

describe('getCurrentViewPlextPortalRefreshHints', () => {
  it('keeps only recent hints inside current bounds', () => {
    const hints = getCurrentViewPlextPortalRefreshHints([
      plext('inside', 100, 100),
      plext('outside', 999, 999),
      plext('old', 110, 110, now - 10_000),
    ], {
      now,
      maxAgeMs: 5_000,
      bounds: {
        minLatE6: 0,
        minLngE6: 0,
        maxLatE6: 200,
        maxLngE6: 200,
      },
    });

    expect(hints.map((hint) => hint.plextId)).toEqual(['inside']);
  });

  it('returns no hints without bounds', () => {
    expect(getCurrentViewPlextPortalRefreshHints([plext('inside', 100, 100)], {
      bounds: null,
      maxAgeMs: 5_000,
      now,
    })).toEqual([]);
  });
});

describe('selectCommTopologyRefresh', () => {
  it('schedules when there are hints and no gate blocks refresh', () => {
    expect(selectCommTopologyRefresh({
      hintCount: 2,
      tileCount: 4,
      maxTileCount: 8,
      pending: false,
      now,
      lastRefreshAt: 0,
      cooldownMs: 30_000,
    })).toMatchObject({shouldRefresh: true, reason: 'schedule'});
  });

  it('blocks pending, cooldown, and oversized current views', () => {
    expect(selectCommTopologyRefresh({
      hintCount: 2,
      pending: true,
      now,
      lastRefreshAt: 0,
      cooldownMs: 30_000,
    }).reason).toBe('pending');

    expect(selectCommTopologyRefresh({
      hintCount: 2,
      pending: false,
      now,
      lastRefreshAt: now - 1_000,
      cooldownMs: 30_000,
    }).reason).toBe('cooldown');

    expect(selectCommTopologyRefresh({
      hintCount: 2,
      tileCount: 99,
      maxTileCount: 8,
      pending: false,
      now,
      lastRefreshAt: 0,
      cooldownMs: 30_000,
    }).reason).toBe('too_many_tiles');
  });
});
