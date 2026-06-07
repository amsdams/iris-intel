import {describe, expect, it} from 'vitest';
import {convertIitcGeodesicPoints} from './iitc-geodesic';

describe('IITC Leaflet geodesic helpers', () => {
  it('keeps short north/south links as direct endpoints like IITC', () => {
    const points = convertIitcGeodesicPoints([{lat: 52, lng: 4}, {lat: 53, lng: 4}]);

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({lat: 52, lng: 4});
    expect(points[1]).toMatchObject({lat: 53, lng: 4});
  });

  it('adds intermediate points for long east/west links', () => {
    const points = convertIitcGeodesicPoints([{lat: 52, lng: 4}, {lat: 52, lng: 14}]);

    expect(points.length).toBeGreaterThan(2);
    expect(points[0]).toMatchObject({lat: 52, lng: 4});
    expect(points.at(-1)).toMatchObject({lat: 52, lng: 14});
    expect(points.some((point) => point.lat > 52)).toBe(true);
  });

  it('offsets anti-meridian links instead of drawing a broken world-spanning segment', () => {
    const points = convertIitcGeodesicPoints([{lat: 10, lng: 179}, {lat: 10, lng: -179}]);

    expect(points.length).toBeGreaterThan(2);
    expect(points[0]).toMatchObject({lat: 10, lng: 179});
    expect(points.at(-1)?.lng).toBeGreaterThan(180);
  });
});
