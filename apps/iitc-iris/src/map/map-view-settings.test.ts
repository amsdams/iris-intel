import {describe, expect, it} from 'vitest';
import {clampView, isStoredMapView, parseStoredMapView, parseUrlMapView} from './map-view-settings';

describe('Shared map-view contract', () => {
  it('clamps lat, lng, zoom values within valid map bounds', () => {
    expect(clampView({lat: 95, lng: 200, zoom: 25})).toEqual({
      lat: 85.051128,
      lng: 179.999999,
      zoom: 21,
    });
  });

  it('validates stored map view objects', () => {
    expect(isStoredMapView({lat: 52, lng: 4, zoom: 10})).toBe(true);
    expect(isStoredMapView({lat: '52', lng: 4, zoom: 10})).toBe(false);
  });
});

describe('Map preference parsing without browser state', () => {
  it('keeps default coordinates, strict numeric storage and clamped boundary values', () => {
    expect(parseStoredMapView(null)).toEqual({lat: 52.3730796, lng: 4.8924534, zoom: 11});
    for (const value of ['invalid', 'null', '{}', '{"lat":"52","lng":4,"zoom":15}', '{"lat":1e999,"lng":4,"zoom":15}']) {
      expect(parseStoredMapView(value)).toEqual({lat: 52.3730796, lng: 4.8924534, zoom: 11});
    }
    expect(parseStoredMapView('{"lat":-90,"lng":200,"zoom":25}')).toEqual({lat: -85.051128, lng: 179.999999, zoom: 21});
    expect(clampView({lat: 90, lng: -200})).toEqual({lat: 85.051128, lng: -180, zoom: undefined});
  });

  it('preserves URL required parameters, zero values and the existing Number conversion', () => {
    for (const search of ['', '?ll=52,4', '?z=15', '?ll=bad,4&z=15']) expect(parseUrlMapView(search)).toBeNull();
    expect(parseUrlMapView('?ll=0,0&z=0')).toEqual({lat: 0, lng: 0, zoom: 0});
    expect(parseUrlMapView('?ll=90,-200&z=30')).toEqual({lat: 85.051128, lng: -180, zoom: 21});
    expect(parseUrlMapView('?ll=,4&z=15')).toEqual({lat: 0, lng: 4, zoom: 15});
  });
});
