import {describe, expect, it} from 'vitest';
import {getVisibleLevelLabelGuids} from './portal-level-numbers';

type Candidate = Parameters<typeof getVisibleLevelLabelGuids>[0][number];
const candidate = (guid: string, level: number, x: number, y: number): Candidate => ({guid, level, point: {x, y}});

// The previous renderer's exhaustive scan is the compatibility oracle, independent of buckets.
function previousVisible(candidates: readonly Candidate[]): string[] {
  const kept: Candidate[] = [];
  for (const item of [...candidates].sort((a, b) => b.level - a.level || a.guid.localeCompare(b.guid))) {
    if (kept.some(({point}) => Math.abs(point.x - item.point.x) <= 15 && Math.abs(point.y - item.point.y) <= 15)) continue;
    kept.push(item);
  }
  return kept.map(({guid}) => guid);
}

describe('Portal Level Numbers collision selection', () => {
  it('preserves level priority, deterministic equal-level priority and the input order', () => {
    const input = [candidate('z', 7, 0, 0), candidate('b', 8, 0, 0), candidate('a', 8, 0, 0)];
    expect([...getVisibleLevelLabelGuids(input)]).toEqual(['a']);
    expect(input.map(({guid}) => guid)).toEqual(['z', 'b', 'a']);
  });

  it('matches inclusive square boundaries across positive and negative buckets', () => {
    for (const origin of [-30, -15, -0.001, 0, 14.999, 15, 30]) {
      for (const dx of [-15.001, -15, 0, 15, 15.001]) {
        for (const dy of [-15.001, -15, 0, 15, 15.001]) {
          const input = [candidate('a', 8, origin, origin), candidate('b', 7, origin + dx, origin + dy)];
          expect([...getVisibleLevelLabelGuids(input)]).toEqual(previousVisible(input));
        }
      }
    }
  });

  it('matches the previous scan on sparse, dense, coincident and mixed-level point clouds', () => {
    let seed = 12345;
    const random = (): number => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (const spread of [0, 15, 100, 1000, 100000]) {
      for (let sample = 0; sample < 8; sample++) {
        const input = Array.from({length: 400}, (_, index) => candidate(`portal-${index}`, Math.floor(random() * 9),
          Math.floor((random() - 0.5) * spread), Math.floor((random() - 0.5) * spread)));
        expect([...getVisibleLevelLabelGuids(input)]).toEqual(previousVisible(input));
      }
    }
    expect([...getVisibleLevelLabelGuids([])]).toEqual([]);
  });
});
