import { describe, expect, it } from 'vitest';
import { buildEntityRequestPayload } from './request';

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
});
