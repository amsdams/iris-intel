import {describe, expect, it} from 'vitest';
import {IitcDataCache} from './data-cache';

describe('IitcDataCache', () => {
  it('matches IITC fresh/stale cache semantics', () => {
    let now = 1_000;
    const cache = new IitcDataCache<{value: string}>({
      freshAgeSeconds: 3,
      maxAgeSeconds: 5,
      now: (): number => now,
    });

    expect(cache.isFresh('a')).toBeUndefined();
    cache.store('a', {value: 'cached'});
    expect(cache.get('a')).toEqual({value: 'cached'});
    expect(cache.getTime('a')).toBe(1_000);
    expect(cache.isFresh('a')).toBe(true);

    now = 4_001;
    expect(cache.isFresh('a')).toBe(false);
    expect(cache.get('a')).toEqual({value: 'cached'});

    now = 6_001;
    cache.runExpire();
    expect(cache.get('a')).toBeUndefined();
  });
});
