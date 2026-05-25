import {describe, expect, it} from 'vitest';
import {createPlextRequestMessage, shouldBypassPlextCooldownForBoundsChange, shouldReplacePlextWindow} from './plext';

describe('createPlextRequestMessage', () => {
  it('creates unbounded plext requests for full IRIS coordinator-owned bounds', () => {
    expect(createPlextRequestMessage({
      tab: 'all',
      minTimestampMs: 123,
      ascendingTimestampOrder: false,
    })).toEqual({
      type: 'IRIS_PLEXTS_REQUEST',
      tab: 'all',
      minTimestampMs: 123,
      maxTimestampMs: -1,
      ascendingTimestampOrder: false,
    });
  });

  it('adds bounds and force flag for Mini-IRIS page-world scoped requests', () => {
    expect(createPlextRequestMessage({
      tab: 'faction',
      bounds: {
        minLatE6: 1,
        minLngE6: 2,
        maxLatE6: 3,
        maxLngE6: 4,
      },
      force: true,
      requireBounds: true,
    })).toEqual({
      type: 'IRIS_PLEXTS_REQUEST',
      tab: 'faction',
      minTimestampMs: -1,
      maxTimestampMs: -1,
      minLatE6: 1,
      minLngE6: 2,
      maxLatE6: 3,
      maxLngE6: 4,
      force: true,
    });
  });

  it('returns null when bounds are required but unavailable', () => {
    expect(createPlextRequestMessage({
      tab: 'all',
      bounds: null,
      requireBounds: true,
    })).toBeNull();
  });

  it('detects full current-window responses that should replace visible COMM', () => {
    expect(shouldReplacePlextWindow({minTimestampMs: -1, maxTimestampMs: -1})).toBe(true);
    expect(shouldReplacePlextWindow({minTimestampMs: -1})).toBe(true);
    expect(shouldReplacePlextWindow({minTimestampMs: 123, maxTimestampMs: -1})).toBe(false);
    expect(shouldReplacePlextWindow({minTimestampMs: -1, maxTimestampMs: 123})).toBe(false);
    expect(shouldReplacePlextWindow(null)).toBe(false);
  });

  it('detects meaningful COMM viewport changes for cooldown bypass', () => {
    const previous = {
      minLatE6: 52_000_000,
      minLngE6: 4_000_000,
      maxLatE6: 52_100_000,
      maxLngE6: 4_100_000,
    };

    expect(shouldBypassPlextCooldownForBoundsChange(null, previous)).toBe(true);
    expect(shouldBypassPlextCooldownForBoundsChange(previous, {
      minLatE6: 52_005_000,
      minLngE6: 4_005_000,
      maxLatE6: 52_105_000,
      maxLngE6: 4_105_000,
    })).toBe(false);
    expect(shouldBypassPlextCooldownForBoundsChange(previous, {
      minLatE6: 52_040_000,
      minLngE6: 4_040_000,
      maxLatE6: 52_140_000,
      maxLngE6: 4_140_000,
    })).toBe(true);
    expect(shouldBypassPlextCooldownForBoundsChange(previous, {
      minLatE6: 51_950_000,
      minLngE6: 3_950_000,
      maxLatE6: 52_150_000,
      maxLngE6: 4_150_000,
    })).toBe(true);
  });
});
