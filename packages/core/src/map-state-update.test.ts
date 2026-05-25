import {describe, expect, it} from 'vitest';
import {applyMapCameraUpdate, applyMapViewportUpdate, isSameMapCamera} from './map-state-update';

describe('map-state-update', () => {
  it('compares map cameras with small movement tolerance', () => {
    expect(isSameMapCamera(
      {lat: 52, lng: 4, zoom: 13},
      {lat: 52.0000001, lng: 4.0000001, zoom: 13.0001},
    )).toBe(true);
    expect(isSameMapCamera(
      {lat: 52, lng: 4, zoom: 13},
      {lat: 52.01, lng: 4, zoom: 13},
    )).toBe(false);
  });

  it('preserves extra state and bounds for camera-only updates', () => {
    const previous = {
      lat: 52,
      lng: 4,
      zoom: 13,
      bounds: {south: 51, west: 3, north: 53, east: 5},
      label: 'mini',
    };

    expect(applyMapCameraUpdate(previous, {lat: 52, lng: 4, zoom: 13})).toBe(previous);
    expect(applyMapCameraUpdate(previous, {lat: 53, lng: 5, zoom: 14})).toEqual({
      ...previous,
      lat: 53,
      lng: 5,
      zoom: 14,
    });
  });

  it('updates bounded viewport state with caller-owned bounds equality', () => {
    const bounds = {minLatE6: 1, minLngE6: 2, maxLatE6: 3, maxLngE6: 4};
    const previous = {lat: 52, lng: 4, zoom: 13, bounds};
    const equalBounds = (a: typeof bounds | undefined, b: typeof bounds | undefined): boolean =>
      !!a && !!b &&
      a.minLatE6 === b.minLatE6 &&
      a.minLngE6 === b.minLngE6 &&
      a.maxLatE6 === b.maxLatE6 &&
      a.maxLngE6 === b.maxLngE6;

    expect(applyMapViewportUpdate(previous, {lat: 52, lng: 4, zoom: 13, bounds: {...bounds}}, equalBounds)).toBe(previous);

    const nextBounds = {...bounds, maxLatE6: 5};
    expect(applyMapViewportUpdate(previous, {lat: 52, lng: 4, zoom: 13, bounds: nextBounds}, equalBounds)).toEqual({
      lat: 52,
      lng: 4,
      zoom: 13,
      bounds: nextBounds,
    });
  });
});
