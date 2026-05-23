import {describe, expect, it} from 'vitest';
import {createPlextRequestMessage} from './plext';

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
});
