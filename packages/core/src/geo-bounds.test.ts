import {describe, expect, it} from 'vitest';
import {
  boundsE6ContainsLatLng,
  boundsE6ContainsPoint,
  boundsToE6,
  degreesToE6,
  e6ToDegrees,
  estimateBoundsE6FromPreviousViewport,
  isFiniteBoundsE6,
  normalizeLongitudeDegrees,
} from './geo-bounds';

describe('geo bounds helpers', () => {
  it('converts degree bounds to E6 bounds', () => {
    expect(boundsToE6({south: 52.1, west: 4.2, north: 52.3, east: 4.4})).toEqual({
      minLatE6: 52_100_000,
      minLngE6: 4_200_000,
      maxLatE6: 52_300_000,
      maxLngE6: 4_400_000,
    });
    expect(e6ToDegrees(degreesToE6(52.123456))).toBeCloseTo(52.123456);
  });

  it('checks finite E6 bounds', () => {
    expect(isFiniteBoundsE6({minLatE6: 1, minLngE6: 2, maxLatE6: 3, maxLngE6: 4})).toBe(true);
    expect(isFiniteBoundsE6({minLatE6: 1, minLngE6: Number.NaN, maxLatE6: 3, maxLngE6: 4})).toBe(false);
  });

  it('contains points in normal bounds', () => {
    const bounds = {minLatE6: 52_000_000, minLngE6: 4_000_000, maxLatE6: 53_000_000, maxLngE6: 5_000_000};

    expect(boundsE6ContainsPoint(bounds, {latE6: 52_500_000, lngE6: 4_500_000})).toBe(true);
    expect(boundsE6ContainsLatLng(bounds, {lat: 52.5, lng: 4.5})).toBe(true);
    expect(boundsE6ContainsLatLng(bounds, {lat: 51.5, lng: 4.5})).toBe(false);
  });

  it('contains points in antimeridian-crossing bounds', () => {
    const bounds = {minLatE6: -1_000_000, minLngE6: 179_000_000, maxLatE6: 1_000_000, maxLngE6: -179_000_000};

    expect(boundsE6ContainsLatLng(bounds, {lat: 0, lng: 179.5})).toBe(true);
    expect(boundsE6ContainsLatLng(bounds, {lat: 0, lng: -179.5})).toBe(true);
    expect(boundsE6ContainsLatLng(bounds, {lat: 0, lng: 0})).toBe(false);
  });

  it('normalizes longitudes into the map range', () => {
    expect(normalizeLongitudeDegrees(181)).toBe(-179);
    expect(normalizeLongitudeDegrees(-181)).toBe(179);
    expect(normalizeLongitudeDegrees(540)).toBe(-180);
  });

  it('estimates bounds around a new center from a previous viewport span', () => {
    expect(estimateBoundsE6FromPreviousViewport(
      {minLatE6: 52_000_000, minLngE6: 4_000_000, maxLatE6: 52_100_000, maxLngE6: 4_200_000},
      15,
      {lat: 48.8566, lng: 2.3522},
      15,
    )).toEqual({
      minLatE6: 48_806_600,
      minLngE6: 2_252_200,
      maxLatE6: 48_906_600,
      maxLngE6: 2_452_200,
    });
  });

  it('scales estimated bounds when zoom changes', () => {
    expect(estimateBoundsE6FromPreviousViewport(
      {minLatE6: 52_000_000, minLngE6: 4_000_000, maxLatE6: 52_100_000, maxLngE6: 4_200_000},
      15,
      {lat: 48.8566, lng: 2.3522},
      14,
    )).toEqual({
      minLatE6: 48_756_600,
      minLngE6: 2_152_200,
      maxLatE6: 48_956_600,
      maxLngE6: 2_552_200,
    });
  });
});
