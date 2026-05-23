import {describe, expect, it} from 'vitest';
import {processPlayerTrackerPlexts} from './player-tracker';
import type {Plext} from './store';

function plext(id: string, time: number, player: string, latE6: number, lngE6: number, text = ' deployed a Resonator on '): Plext {
  return {
    id,
    time,
    text,
    team: 'E',
    categories: 1,
    type: 'PLAYER_GENERATED',
    markup: [
      ['PLAYER', {plain: player, team: 'E'}],
      ['TEXT', {plain: text}],
      ['PORTAL', {name: 'Portal A', latE6, lngE6}],
    ],
  };
}

describe('processPlayerTrackerPlexts', () => {
  it('builds player histories from portal COMM markup', () => {
    const result = processPlayerTrackerPlexts({
      plexts: [
        plext('p1', 1000, 'agent', 52000000, 4000000),
        plext('p2', 2000, 'agent', 52001000, 4001000),
      ],
      now: 3000,
    });

    expect(result.processedCount).toBe(2);
    expect(result.touchedPlayerCount).toBe(1);
    expect(result.maxPlextTime).toBe(2000);
    expect(result.histories.get('agent')?.events.map((event) => event.latlngs[0])).toEqual([
      [52, 4],
      [52.001, 4.001],
    ]);
  });

  it('deduplicates unchanged plext fingerprints across incremental runs', () => {
    const first = processPlayerTrackerPlexts({
      plexts: [plext('p1', 1000, 'agent', 52000000, 4000000)],
      now: 3000,
    });
    const second = processPlayerTrackerPlexts({
      plexts: [plext('p1', 1000, 'agent', 52000000, 4000000)],
      previousHistories: first.histories,
      processedPlextFingerprints: first.processedPlextFingerprints,
      now: 3000,
    });

    expect(second.processedCount).toBe(0);
    expect(second.histories.get('agent')?.events).toHaveLength(1);
  });

  it('groups same-timestamp activity under one event with multiple coordinates', () => {
    const result = processPlayerTrackerPlexts({
      plexts: [
        plext('p1', 1000, 'agent', 52000000, 4000000),
        plext('p2', 1000, 'agent', 52001000, 4001000),
      ],
      now: 3000,
    });

    expect(result.histories.get('agent')?.events).toHaveLength(1);
    expect(result.histories.get('agent')?.events[0].latlngs).toEqual([
      [52, 4],
      [52.001, 4.001],
    ]);
  });

  it('ignores destroy/link-noise messages', () => {
    const result = processPlayerTrackerPlexts({
      plexts: [plext('p1', 1000, 'agent', 52000000, 4000000, ' destroyed the Link ')],
      now: 3000,
    });

    expect(result.processedCount).toBe(0);
    expect(result.histories.size).toBe(0);
  });

  it('expires old histories', () => {
    const result = processPlayerTrackerPlexts({
      plexts: [plext('p1', 1000, 'agent', 52000000, 4000000)],
      now: 10_000,
      expirationMs: 1000,
    });

    expect(result.histories.size).toBe(0);
  });
});
