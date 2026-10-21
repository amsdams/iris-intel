import {describe, expect, it} from 'vitest';
import {greatCircleArcIntersect, testPolyLine} from './cross-links';
import type {IitcDrawToolsLatLng} from './draw-tools';

type Arc = readonly [IitcDrawToolsLatLng, IitcDrawToolsLatLng];
const horizontal: Arc = [{lat: 0, lng: -1}, {lat: 0, lng: 1}];

// Compared with reference/ingress-intel-total-conversion/plugins/cross-links.js.
// Wrapped longitude cases intentionally correct its raw-longitude quick rejection.
describe('IITC Cross Links great-circle classification', () => {
  it('detects a crossing at a former generated geodesic vertex', () => {
    expect(greatCircleArcIntersect(...horizontal, {lat: -1, lng: 0}, {lat: 1, lng: 0})).toBe(true);
  });

  it('rejects shared E6 anchors despite the former planar parameter rounding', () => {
    const anchor = {lat: -47.940274, lng: -101.976023};
    const drawn: Arc = [{lat: -47.309304, lng: -101.623574}, anchor];
    const link: Arc = [{lat: -47.952059, lng: -101.292522}, anchor];
    for (const a of [drawn, [...drawn].reverse() as [IitcDrawToolsLatLng, IitcDrawToolsLatLng]]) {
      for (const b of [link, [...link].reverse() as [IitcDrawToolsLatLng, IitcDrawToolsLatLng]]) {
        expect(greatCircleArcIntersect(...a, ...b)).toBe(false);
      }
    }
  });

  it('preserves Leaflet shared-anchor tolerance without hiding nearby proper crossings', () => {
    expect(greatCircleArcIntersect(...horizontal, {lat: 5e-10, lng: 1}, {lat: 1, lng: 2})).toBe(false);
    expect(greatCircleArcIntersect(...horizontal, {lat: -1, lng: 0.999999}, {lat: 1, lng: 0.999999})).toBe(true);
  });

  it.each([-179.51, 180.49, 540.49])('detects antimeridian crossings with longitude %s', (lng) => {
    const drawn: Arc = [{lat: 0, lng: 179}, {lat: 0, lng: -179}];
    const link: Arc = [{lat: -1, lng}, {lat: 1, lng}];
    expect(greatCircleArcIntersect(...drawn, ...link)).toBe(true);
    expect(greatCircleArcIntersect(drawn[1], drawn[0], link[1], link[0])).toBe(true);
    expect(greatCircleArcIntersect(...link, ...drawn)).toBe(true);
  });

  it('rejects shared anchors represented in different world copies', () => {
    expect(greatCircleArcIntersect(
      {lat: 0, lng: 179}, {lat: 0, lng: -179},
      {lat: 0, lng: 181}, {lat: 1, lng: 181},
    )).toBe(false);
  });

  it('rejects a crossing on the opposite side of the globe', () => {
    expect(greatCircleArcIntersect(
      {lat: 0, lng: 179}, {lat: 0, lng: -179},
      {lat: -1, lng: 0}, {lat: 1, lng: 0},
    )).toBe(false);
  });

  it('uses great-circle curvature rather than a straight latitude/longitude chord', () => {
    expect(greatCircleArcIntersect(
      {lat: 60, lng: -45}, {lat: 60, lng: 45},
      {lat: 65, lng: 0}, {lat: 75, lng: 0},
    )).toBe(true);
    expect(greatCircleArcIntersect(
      {lat: 60, lng: -45}, {lat: 60, lng: 45},
      {lat: 55, lng: 0}, {lat: 65, lng: 0},
    )).toBe(false);
  });

  it('preserves IITC overlap, duplicate, disjoint, and zero-length decisions', () => {
    expect(greatCircleArcIntersect(...horizontal, {lat: 0, lng: -0.5}, {lat: 0, lng: 2})).toBe(true);
    expect(greatCircleArcIntersect(...horizontal, ...horizontal)).toBe(false);
    expect(greatCircleArcIntersect(...horizontal, {lat: 0, lng: 2}, {lat: 0, lng: 3})).toBe(false);
    expect(greatCircleArcIntersect(horizontal[0], horizontal[0], ...horizontal)).toBe(false);
    expect(greatCircleArcIntersect(...horizontal, {lat: 0, lng: 180}, {lat: 0, lng: -180})).toBe(false);
  });

  it('checks all original polyline legs without mutating coordinates', () => {
    const points = Object.freeze([
      Object.freeze({lat: 0, lng: -2}), Object.freeze({lat: 0, lng: -1}), Object.freeze({lat: 0, lng: 1}),
    ]);
    expect(testPolyLine(points, [{lat: -1, lng: 0}, {lat: 1, lng: 0}])).toBe(true);
    expect(testPolyLine(points, [{lat: -1, lng: 3}, {lat: 1, lng: 3}])).toBe(false);
    expect(testPolyLine([], horizontal)).toBe(false);
    expect(testPolyLine([horizontal[0]], horizontal)).toBe(false);
  });

  it('can include the closing leg using the IITC closed-path seam', () => {
    const points = [{lat: 0, lng: -1}, {lat: 0, lng: 1}, {lat: 2, lng: 1}];
    const link: Arc = [{lat: 0.5, lng: 0}, {lat: 1.5, lng: 0}];
    expect(testPolyLine(points, link)).toBe(false);
    expect(testPolyLine(points, link, true)).toBe(true);
  });
});
