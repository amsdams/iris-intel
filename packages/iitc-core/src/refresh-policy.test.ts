import {describe, expect, it} from 'vitest';
import {getIitcCommRefreshDelayMs, getIitcMapRefreshDelayMs, hasIitcCommBoundsChanged} from './index';

describe('IITC refresh policy', () => {
  it('uses close/far refresh minima and backs off to twice a long fetch duration', () => {
    expect(getIitcMapRefreshDelayMs(13, 1000)).toBe(300_000);
    expect(getIitcMapRefreshDelayMs(12, 1000)).toBe(900_000);
    expect(getIitcMapRefreshDelayMs(16, 200_000)).toBe(400_000);
    expect(getIitcCommRefreshDelayMs(18)).toBe(30_000);
    expect(getIitcCommRefreshDelayMs(12)).toBe(60_000);
  });

  it('tolerates small moves, but resets on substantial pans and zooms in either direction', () => {
    const bounds = {minLatE6: 0, minLngE6: 0, maxLatE6: 1000, maxLngE6: 1000};
    expect(hasIitcCommBoundsChanged(bounds, {...bounds, minLngE6: 50, maxLngE6: 1050})).toBe(false);
    expect(hasIitcCommBoundsChanged(bounds, {...bounds, minLngE6: 200, maxLngE6: 1200})).toBe(true);
    const smaller = {...bounds, minLatE6: 300, maxLatE6: 700};
    expect(hasIitcCommBoundsChanged(bounds, smaller)).toBe(true);
    expect(hasIitcCommBoundsChanged(smaller, bounds)).toBe(true);
  });
});
