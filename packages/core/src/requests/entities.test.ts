import {describe, expect, it} from 'vitest';
import {ENTITY_REQUEST_BATCH_SIZE, batchEntityTileKeys, buildEntityRequestPayload} from './entities';

describe('buildEntityRequestPayload', () => {
  it('rejects non-finite bounds without generating tiles', () => {
    const payload = buildEntityRequestPayload({
      minLatE6: Number.NaN,
      minLngE6: 0,
      maxLatE6: 1,
      maxLngE6: 1,
    }, 14);

    expect(payload.tileKeys).toHaveLength(0);
    expect(payload.coverageKey).toBe('invalid:non-finite');
    expect(payload.diagnostic).toBe('invalid non-finite bounds or zoom');
  });

  it('handles antimeridian-crossing bounds without a huge wrapped range', () => {
    const payload = buildEntityRequestPayload({
      minLatE6: -1_000_000,
      minLngE6: 179_000_000,
      maxLatE6: 1_000_000,
      maxLngE6: -179_000_000,
    }, 8);

    expect(payload.tileKeys.length).toBeGreaterThan(0);
    expect(payload.tileKeys.length).toBeLessThan(128);
    expect(payload.coverageKey).toContain(',');
    expect(payload.diagnostic).toBe(null);
  });

  it('caps extreme coverage instead of generating unbounded tile lists', () => {
    const payload = buildEntityRequestPayload({
      minLatE6: -90_000_000,
      minLngE6: -720_000_000,
      maxLatE6: 90_000_000,
      maxLngE6: 720_000_000,
    }, 8);

    expect(payload.tileKeys).toHaveLength(1024);
    expect(payload.coverageKey).toContain(':capped');
    expect(payload.diagnostic).toBe('tile coverage capped at 1024');
  });

  it('orders requested tiles from viewport center outward', () => {
    const payload = buildEntityRequestPayload({
      minLatE6: -400_000,
      minLngE6: -400_000,
      maxLatE6: 400_000,
      maxLngE6: 400_000,
    }, 8);

    expect(payload.tileKeys.length).toBeGreaterThan(4);
    expect(payload.tileKeys[0]).toBe('8_499_499_5_8_100');
    expect(payload.tileKeys.slice(0, 4).sort()).toEqual([
      '8_499_499_5_8_100',
      '8_499_500_5_8_100',
      '8_500_499_5_8_100',
      '8_500_500_5_8_100',
    ]);
  });

  it('batches tile keys with the shared Intel request size', () => {
    const tileKeys = Array.from({ length: ENTITY_REQUEST_BATCH_SIZE + 2 }, (_, index) => `tile-${index}`);

    expect(batchEntityTileKeys(tileKeys)).toEqual([
      tileKeys.slice(0, ENTITY_REQUEST_BATCH_SIZE),
      tileKeys.slice(ENTITY_REQUEST_BATCH_SIZE),
    ]);
  });

  it('guards custom entity batch sizes', () => {
    expect(batchEntityTileKeys(['a', 'b', 'c'], 0)).toEqual([['a'], ['b'], ['c']]);
  });
});
