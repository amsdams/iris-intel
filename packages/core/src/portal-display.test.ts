import {describe, expect, it} from 'vitest';
import {getPortalHealthBucket, isPortalHealthBucketVisible} from './portal-display';

describe('portal display helpers', () => {
  it('maps portal health to IRIS filter buckets', () => {
    expect(getPortalHealthBucket(0)).toBe(25);
    expect(getPortalHealthBucket(25)).toBe(25);
    expect(getPortalHealthBucket(26)).toBe(50);
    expect(getPortalHealthBucket(50)).toBe(50);
    expect(getPortalHealthBucket(51)).toBe(75);
    expect(getPortalHealthBucket(75)).toBe(75);
    expect(getPortalHealthBucket(76)).toBe(100);
    expect(getPortalHealthBucket(100)).toBe(100);
  });

  it('checks portal health bucket visibility', () => {
    expect(isPortalHealthBucketVisible(undefined, {25: false, 50: false, 75: false, 100: false})).toBe(true);
    expect(isPortalHealthBucketVisible(20, {25: false, 50: true, 75: true, 100: true})).toBe(false);
    expect(isPortalHealthBucketVisible(80, {25: true, 50: true, 75: true, 100: false})).toBe(false);
  });
});
