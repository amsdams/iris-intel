import {describe, expect, it} from 'vitest';
import {clampMapCamera, isFiniteMapCamera, isNullIslandMapCamera, isUsableMapCamera} from './map-camera';

describe('map camera validation', () => {
  it('accepts finite in-range cameras', () => {
    expect(isFiniteMapCamera({lat: 52.3702, lng: 4.8952, zoom: 13})).toBe(true);
  });

  it('rejects non-finite and out-of-range values', () => {
    expect(isFiniteMapCamera({lat: Number.NaN, lng: 4.8952, zoom: 13})).toBe(false);
    expect(isFiniteMapCamera({lat: 91, lng: 4.8952, zoom: 13})).toBe(false);
    expect(isFiniteMapCamera({lat: 52.3702, lng: 181, zoom: 13})).toBe(false);
    expect(isFiniteMapCamera({lat: 52.3702, lng: 4.8952, zoom: 22})).toBe(false);
  });

  it('honors a minimum zoom', () => {
    expect(isFiniteMapCamera({lat: 52.3702, lng: 4.8952, zoom: 3}, {minZoom: 4})).toBe(false);
    expect(isFiniteMapCamera({lat: 52.3702, lng: 4.8952, zoom: 4}, {minZoom: 4})).toBe(true);
  });

  it('detects null-island fallback cameras', () => {
    expect(isNullIslandMapCamera({lat: 0, lng: 0})).toBe(true);
    expect(isNullIslandMapCamera({lat: 0.5, lng: -0.5})).toBe(true);
    expect(isNullIslandMapCamera({lat: 5.5, lng: 0})).toBe(false);
  });

  it('combines finite and null-island checks for usable persisted cameras', () => {
    expect(isUsableMapCamera({lat: 0, lng: 0, zoom: 13})).toBe(false);
    expect(isUsableMapCamera({lat: 0, lng: 0, zoom: 13}, {rejectNullIsland: false})).toBe(true);
    expect(isUsableMapCamera({lat: 52.3702, lng: 4.8952, zoom: 13})).toBe(true);
  });

  it('clamps cameras to valid coordinate and zoom ranges', () => {
    expect(clampMapCamera({lat: 95, lng: -190, zoom: 2}, {minZoom: 4, maxZoom: 18})).toEqual({
      lat: 90,
      lng: -180,
      zoom: 4,
    });
    expect(clampMapCamera({lat: 52.3702, lng: 4.8952, zoom: 20}, {minZoom: 4, maxZoom: 18})).toEqual({
      lat: 52.3702,
      lng: 4.8952,
      zoom: 18,
    });
  });
});
