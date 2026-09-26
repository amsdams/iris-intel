import {describe, expect, it} from 'vitest';
import {
  clampView,
  createScenarioSnapshotSummary,
  isScenarioSettled,
  isStoredMapView,
  parseViewInput,
} from './content-scenarios';

describe('content-scenarios helpers', () => {
  it('detects if scenario requests and entity queues are settled', () => {
    expect(isScenarioSettled({entities: {complete: true, queue: {activeRequests: 0}}, requests: {activeRequests: 0}})).toBe(true);
    expect(isScenarioSettled({entities: {complete: false, queue: {activeRequests: 0}}, requests: {activeRequests: 0}})).toBe(false);
    expect(isScenarioSettled({entities: {complete: true, queue: {activeRequests: 1}}, requests: {activeRequests: 0}})).toBe(false);
  });

  it('builds scenario snapshot summary and flags warnings', () => {
    const summary = createScenarioSnapshotSummary({
      entities: {
        complete: true,
        entitySource: 'live',
        requestedTiles: 10,
        returnedTiles: 10,
        retriedTileKeys: ['tile-1'],
        cacheFreshTileKeys: ['tile-1'],
        renderQueue: {
          renderedTiles: 5,
          renderedOkTiles: 3,
          renderedCacheFreshTiles: 1,
          renderedCacheStaleTiles: 1,
          lastRenderedTileStatus: 'ok',
        },
      },
    });

    expect(summary.complete).toBe(true);
    expect(summary.source).toBe('live');
    expect(summary.retriedTiles).toBe(1);
    expect(summary.warnings).toContain('1 fresh cached tiles were retried');
  });

  it('parses lat, lng, zoom input and Intel URLs', () => {
    expect(parseViewInput('52.37,4.89,15')).toEqual({lat: 52.37, lng: 4.89, zoom: 15});
    expect(parseViewInput('https://intel.ingress.com/?ll=52.373,4.892&z=14')).toEqual({
      lat: 52.373,
      lng: 4.892,
      zoom: 14,
    });
    expect(parseViewInput('invalid input')).toBeNull();
  });

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
