import {describe, expect, it} from 'vitest';
import {extractPlextPortalRefreshHints, resolvePlextPortalRefreshHint} from './plext-refresh-hints';
import {mockPlext, mockPortal} from './mock-intel';
import type {Portal} from './store';

describe('extractPlextPortalRefreshHints', () => {
  it('extracts recent player-generated portal activity coordinates', () => {
    expect(extractPlextPortalRefreshHints([mockPlext({id: 'p1', time: 1000})], {now: 2000})).toEqual([
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
    const linkPlext = mockPlext({id: 'p1', time: 1000});
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
      mockPlext({id: 'p1', time: 1000}),
      mockPlext({id: 'p2', time: 1100}),
      mockPlext({id: 'old', time: 1}),
      mockPlext({id: 'system', time: 1200, type: 'SYSTEM_NARROWCAST'}),
    ], {now: 2000, maxAgeMs: 1500});

    expect(result).toHaveLength(1);
    expect(result[0]?.plextId).toBe('p1');
  });

  it('ignores portal markup without coordinates', () => {
    const withoutCoords = mockPlext({id: 'p1', time: 1000});
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
    return mockPortal({
      id,
      lat: latE6 / 1e6,
      lng: lngE6 / 1e6,
      name,
    });
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
