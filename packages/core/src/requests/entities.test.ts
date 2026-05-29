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
    expect(payload.dataBounds).toBe(null);
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
    expect(payload.tileKeys.length).toBeLessThan(256);
    expect(payload.coverageKey).toContain(',');
    expect(payload.dataBounds).not.toBe(null);
    expect(payload.dataBounds?.minLngE6).toBeGreaterThan(payload.dataBounds?.maxLngE6 ?? 0);
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
    expect(payload.tileKeys[0]).toBe('9_1000_1000_5_8_100');
    expect(payload.tileKeys.slice(0, 4).sort()).toEqual([
      '9_1000_1000_5_8_100',
      '9_1000_999_5_8_100',
      '9_999_1000_5_8_100',
      '9_999_999_5_8_100',
    ]);
  });

  it('matches IITC request detail levels at IRIS visible map zooms', () => {
    const bounds = {
      minLatE6: 52_300_000,
      minLngE6: 4_800_000,
      maxLatE6: 52_400_000,
      maxLngE6: 4_950_000,
    };

    const cases = [
      {mapZoom: 8, dataZoom: 9, level: 5},
      {mapZoom: 10, dataZoom: 11, level: 4},
      {mapZoom: 12, dataZoom: 13, level: 2},
      {mapZoom: 14, dataZoom: 15, level: 0},
      {mapZoom: 15, dataZoom: 15, level: 0},
    ];

    cases.forEach(({mapZoom, dataZoom, level}) => {
      const payload = buildEntityRequestPayload(bounds, mapZoom);
      expect(payload.dataZoom).toBe(dataZoom);
      expect(payload.tileKeys[0]).toMatch(new RegExp(`^${dataZoom}_\\d+_\\d+_${level}_8_100$`));
    });
  });

  it('returns tile-aligned data bounds that contain the requested viewport', () => {
    const bounds = {
      minLatE6: 52_300_000,
      minLngE6: 4_800_000,
      maxLatE6: 52_400_000,
      maxLngE6: 4_950_000,
    };
    const payload = buildEntityRequestPayload(bounds, 14.36);

    expect(payload.dataBounds).not.toBe(null);
    expect(payload.dataBounds!.minLatE6).toBeLessThanOrEqual(bounds.minLatE6);
    expect(payload.dataBounds!.maxLatE6).toBeGreaterThanOrEqual(bounds.maxLatE6);
    expect(payload.dataBounds!.minLngE6).toBeLessThanOrEqual(bounds.minLngE6);
    expect(payload.dataBounds!.maxLngE6).toBeGreaterThanOrEqual(bounds.maxLngE6);
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
