import {describe, expect, it} from 'vitest';
import {getPortalLevel, getPortalMarkerScale, getPortalMarkerStyle, getPortalRadius} from './portal-marker-style';

type Portal = Parameters<typeof getPortalMarkerStyle>[0];
const portal: Portal = {team: 'R', level: 8, health: 100, isPlaceholder: false};
const plain = {healthFill: false, levelFill: false};

describe('portal marker appearance', () => {
  it('preserves zoom boundaries for radius and stroke scaling', () => {
    for (const [zoom, scale] of [[7.99, 0.5], [8, 0.65], [10.99, 0.65], [11, 0.8], [13.99, 0.8], [14, 1], [18, 1]]) {
      expect(getPortalMarkerScale(zoom)).toBe(scale);
      const style = getPortalMarkerStyle(portal, plain, zoom);
      expect(style.radius).toBe(11 * scale);
      expect(style.weight).toBe(4 * Math.sqrt(scale));
    }
  });
  it('floors and clamps levels while preserving unknown-level dimensions', () => {
    const cases: [number | undefined, number, number, number][] = [
      [undefined, 0, 7, 2], [-1, 0, 7, 2], [0, 0, 7, 2], [3.9, 3, 7, 2],
      [4, 4, 8, 2], [5, 5, 8, 3], [6, 6, 9, 3], [7, 7, 10, 4], [8, 8, 11, 4], [99, 8, 11, 4],
    ];
    for (const [level, normalized, radius, weight] of cases) {
      expect(getPortalLevel(level, false)).toBe(normalized);
      expect(getPortalRadius(level, false, 16)).toBe(radius);
      expect(getPortalMarkerStyle({...portal, level}, plain, 16)).toMatchObject({radius, weight});
    }
  });
  it('keeps placeholders dashed and translucent, with constant stroke weight at every zoom', () => {
    expect(getPortalLevel(8, true)).toBe(0);
    for (const [zoom, radius] of [[7, 3.5], [8, 4.55], [11, 5.6], [14, 7]]) {
      const style = getPortalMarkerStyle({...portal, isPlaceholder: true}, {healthFill: true, levelFill: true}, zoom);
      expect(style.radius).toBeCloseTo(radius);
      expect(style).toMatchObject({weight: 1, opacity: 0.6, dashArray: '1,2', fillColor: '#0088ff', fillOpacity: 0.5});
    }
  });
  it('uses the faction palette without a fill policy', () => {
    for (const [team, color] of Object.entries({N: '#ff6600', R: '#0088ff', E: '#03dc03', M: '#ff0028'})) {
      expect(getPortalMarkerStyle({...portal, team: team as typeof portal.team}, plain, 16))
        .toMatchObject({color, fillColor: color, fillOpacity: 0.5, opacity: 1});
    }
  });
  it('preserves strict health thresholds and their distinct opacity bands', () => {
    const cases: [number, string, number][] = [
      [0, '#ff00ff', 1], [15, '#ff00ff', 1], [15.01, '#ff0000', 0.8], [30, '#ff0000', 0.8],
      [30.01, '#ff0000', 0.6], [45, '#ff0000', 0.6], [45.01, '#ff0000', 0.4], [60, '#ff0000', 0.4],
      [60.01, '#ff8c00', 0.5], [70, '#ff8c00', 0.5], [70.01, '#ffa500', 0.5], [85, '#ffa500', 0.5],
      [85.01, '#ffff00', 0.5], [99, '#ffff00', 0.5], [100, '#0088ff', 0.5],
    ];
    for (const [health, fillColor, fillOpacity] of cases) {
      expect(getPortalMarkerStyle({...portal, health}, {healthFill: true, levelFill: false}, 16))
        .toMatchObject({fillColor, fillOpacity});
    }
  });
  it('gives damaged-health fill priority and falls back to known levels before faction color', () => {
    const both = {healthFill: true, levelFill: true};
    expect(getPortalMarkerStyle({...portal, health: 50}, both, 16)).toMatchObject({fillColor: '#ff0000', fillOpacity: 0.4});
    for (const health of [100, undefined]) {
      expect(getPortalMarkerStyle({...portal, health}, both, 16)).toMatchObject({fillColor: '#9627f4', fillOpacity: 0.6});
    }
    expect(getPortalMarkerStyle({...portal, level: undefined}, both, 16)).toMatchObject({fillColor: '#0088ff', fillOpacity: 0.5});
    expect(getPortalMarkerStyle({...portal, level: 0}, both, 16)).toMatchObject({fillColor: '#000000', fillOpacity: 0.6});
    expect(getPortalMarkerStyle({...portal, team: 'N', health: 50}, {healthFill: true, levelFill: false}, 16))
      .toMatchObject({fillColor: '#ff6600', fillOpacity: 0.5});
    expect(getPortalMarkerStyle({...portal, team: 'N', health: 50}, both, 16)).toMatchObject({fillColor: '#9627f4', fillOpacity: 0.6});
  });
  it('returns complete reset values and leaves the portal and policy untouched', () => {
    const input = Object.freeze({...portal});
    const policy = Object.freeze({...plain});
    const style = getPortalMarkerStyle(input, policy, 16);
    expect(style).toMatchObject({radius: 11, weight: 4, opacity: 1, dashArray: undefined});
    expect(Object.hasOwn(style, 'dashArray')).toBe(true);
  });
});
