import {describe, expect, it} from 'vitest';
import {extractPlextPortalRefreshHints} from './plext-refresh-hints';
import type {Plext} from './store';

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
