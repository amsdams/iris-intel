import {describe, expect, it} from 'vitest';
import {buildWrappedLineCoordinates, buildWrappedLineSegments, buildWrappedPolygonGeometry} from './wrapped-lines';

describe('buildWrappedLineCoordinates', () => {
  it('leaves normal links unchanged', () => {
    expect(buildWrappedLineCoordinates([4, 52], [5, 53])).toEqual([[4, 52], [5, 53]]);
  });

  it('wraps eastbound antimeridian links onto the short path', () => {
    expect(buildWrappedLineCoordinates([179, 10], [-179, 11])).toEqual([[179, 10], [181, 11]]);
  });

  it('wraps westbound antimeridian links onto the short path', () => {
    expect(buildWrappedLineCoordinates([-179, 10], [179, 11])).toEqual([[-179, 10], [-181, 11]]);
  });
});

describe('buildWrappedLineSegments', () => {
  it('leaves normal links as a single segment', () => {
    expect(buildWrappedLineSegments([4, 52], [5, 53])).toEqual([[[4, 52], [5, 53]]]);
  });

  it('splits eastbound antimeridian links into render-safe segments', () => {
    expect(buildWrappedLineSegments([179, 10], [-179, 12])).toEqual([
      [[179, 10], [180, 11]],
      [[-180, 11], [-179, 12]],
    ]);
  });

  it('splits westbound antimeridian links into render-safe segments', () => {
    expect(buildWrappedLineSegments([-179, 10], [179, 12])).toEqual([
      [[-179, 10], [-180, 11]],
      [[180, 11], [179, 12]],
    ]);
  });

  it('splits Chatham Islands to Hawke Bay style links across the antimeridian', () => {
    const segments = buildWrappedLineSegments([-176.47, -43.82], [176.5, -39.9]);

    expect(segments).toHaveLength(2);
    expect(segments[0][0]).toEqual([-176.47, -43.82]);
    expect(segments[0][1][0]).toBe(-180);
    expect(segments[1][0][0]).toBe(180);
    expect(segments[1][1]).toEqual([176.5, -39.9]);
  });
});

describe('buildWrappedPolygonGeometry', () => {
  it('leaves normal polygons unchanged', () => {
    expect(buildWrappedPolygonGeometry([[4, 52], [5, 52], [4.5, 53]])).toEqual({
      type: 'Polygon',
      coordinates: [[[4, 52], [5, 52], [4.5, 53], [4, 52]]],
    });
  });

  it('splits antimeridian-crossing fields into render-safe polygons', () => {
    const geometry = buildWrappedPolygonGeometry([
      [-176.5606, -43.9510],
      [176.6182, -40.4108],
      [-176.4732, -43.8159],
    ]);

    expect(geometry.type).toBe('MultiPolygon');
    if (geometry.type !== 'MultiPolygon') return;

    expect(geometry.coordinates).toHaveLength(2);
    const coordinates = geometry.coordinates.flat(2) as [number, number][];
    expect(coordinates.every(([lng]) => lng >= -180 && lng <= 180)).toBe(true);
  });
});
