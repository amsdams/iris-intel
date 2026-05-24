import {describe, expect, it} from 'vitest';
import {selectKeyedRefreshBatch} from './keyed-refresh';

describe('selectKeyedRefreshBatch', () => {
  it('selects unique keys up to the batch cap', () => {
    expect(selectKeyedRefreshBatch(['a', 'a', 'b', 'c'], {
      pendingKeys: new Set(),
      lastRefreshTimes: new Map(),
      now: 100_000,
      cooldownMs: 30_000,
      maxBatchSize: 2,
    })).toEqual({
      keys: ['a', 'b'],
      knownCount: 2,
      pendingCount: 0,
      cooldownCount: 0,
    });
  });

  it('counts pending and cooldown skips before filling the batch', () => {
    expect(selectKeyedRefreshBatch(['pending', 'cooldown', 'fresh'], {
      pendingKeys: new Set(['pending']),
      lastRefreshTimes: new Map([['cooldown', 90_000]]),
      now: 100_000,
      cooldownMs: 30_000,
      maxBatchSize: 2,
    })).toEqual({
      keys: ['fresh'],
      knownCount: 3,
      pendingCount: 1,
      cooldownCount: 1,
    });
  });

  it('handles a zero batch cap', () => {
    expect(selectKeyedRefreshBatch(['a'], {
      pendingKeys: new Set(),
      lastRefreshTimes: new Map(),
      now: 100_000,
      cooldownMs: 30_000,
      maxBatchSize: 0,
    })).toEqual({
      keys: [],
      knownCount: 0,
      pendingCount: 0,
      cooldownCount: 0,
    });
  });
});
