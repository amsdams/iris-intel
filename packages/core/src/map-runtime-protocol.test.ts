import {describe, expect, it} from 'vitest';
import {
  runtimeMapSelectionIntentFromOpenInfo,
  runtimeMapSelectionOpenInfoFromIntent,
} from './map-runtime-protocol';

describe('map-runtime-protocol', () => {
  it('converts between legacy open-info flags and shared selection intent', () => {
    expect(runtimeMapSelectionIntentFromOpenInfo(true)).toBe('details');
    expect(runtimeMapSelectionIntentFromOpenInfo(false)).toBe('select');
    expect(runtimeMapSelectionIntentFromOpenInfo(undefined)).toBe('select');
    expect(runtimeMapSelectionOpenInfoFromIntent('details')).toBe(true);
    expect(runtimeMapSelectionOpenInfoFromIntent('select')).toBe(false);
  });
});
