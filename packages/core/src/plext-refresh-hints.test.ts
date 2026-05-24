import {describe, expect, it} from 'vitest';
import {extractPlextPortalRefreshHints, resolvePlextPortalRefreshHint} from './plext-refresh-hints';
import type {Plext, Portal} from './store';

function plext(id: string, time: number, type: Plext['type'] = 'PLAYER_GENERATED'): Plext {
  return {
    id,
    time,
    text: 'agent deployed a Resonator on Portal A',
    team: 'E',
    categories: 1,
    type,
    markup: [
      ['PLAYER', {plain: 'agent', team: 'E'}],
      ['TEXT', {plain: ' deployed a Resonator on '}],
      ['PORTAL', {name: 'Portal A', latE6: 52000000, lngE6: 4000000}],
    ],
  };
}

describe('extractPlextPortalRefreshHints', () => {
  it('extracts recent player-generated portal activity coordinates', () => {
    expect(extractPlextPortalRefreshHints([plext('p1', 1000)], {now: 2000})).toEqual([
      {
        plextId: 'p1',
        plextTime: 1000,
        name: 'Portal A',
        latE6: 52000000,
        lngE6: 4000000,
        reason: 'portal_activity',
      },
    ]);
  });

  it('extracts coordinates from link markup as portal activity', () => {
    const linkPlext = plext('p1', 1000);
    linkPlext.markup = [
      ['PLAYER', {plain: 'agent', team: 'E'}],
      ['TEXT', {plain: ' destroyed the Link '}],
      ['LINK', {name: 'Portal A', latE6: 52000000, lngE6: 4000000}],
    ];

    expect(extractPlextPortalRefreshHints([linkPlext], {now: 2000})).toEqual([
      expect.objectContaining({
        latE6: 52000000,
        lngE6: 4000000,
      }),
    ]);
  });


  it('deduplicates portal coordinates and ignores stale plexts', () => {
    const result = extractPlextPortalRefreshHints([
      plext('p1', 1000),
      plext('p2', 1100),
      plext('old', 1),
      plext('system', 1200, 'SYSTEM_NARROWCAST'),
    ], {now: 2000, maxAgeMs: 1500});

    expect(result).toHaveLength(1);
    expect(result[0]?.plextId).toBe('p1');
  });

  it('ignores portal markup without coordinates', () => {
    const withoutCoords = plext('p1', 1000);
    withoutCoords.markup = [['PORTAL', {name: 'Portal A'}]];

    expect(extractPlextPortalRefreshHints([withoutCoords], {now: 2000})).toEqual([]);
  });
});

describe('resolvePlextPortalRefreshHint', () => {
  const hint = {
    plextId: 'p1',
    plextTime: 1000,
    name: 'Portal A',
    latE6: 52000000,
    lngE6: 4000000,
    reason: 'portal_activity' as const,
  };

  function portal(id: string, latE6: number, lngE6: number, name = 'Portal A'): Portal {
    return {
      id,
      lat: latE6 / 1e6,
      lng: lngE6 / 1e6,
      team: 'E',
      name,
    };
  }

  it('resolves the closest portal within coordinate tolerance', () => {
    const portals = [
      portal('far', 52000200, 4000200),
      portal('near', 52000020, 4000010),
    ];

    expect(resolvePlextPortalRefreshHint(hint, portals)?.id).toBe('near');
  });

  it('penalizes mismatched names when multiple portals are nearby', () => {
    const portals = [
      portal('wrong-name', 52000000, 4000000, 'Portal B'),
      portal('right-name', 52000010, 4000000, 'Portal A'),
    ];

    expect(resolvePlextPortalRefreshHint(hint, portals)?.id).toBe('right-name');
  });

  it('returns null when no portal is within tolerance', () => {
    expect(resolvePlextPortalRefreshHint(hint, [
      portal('far', 52000100, 4000000),
    ])).toBeNull();
  });
});
