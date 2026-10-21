import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createBaseLayer} from './base-layers';
import {normalizeBaseLayerId} from './layers/base-layer-settings';

const mocks = vi.hoisted(() => ({tileLayer: vi.fn(), maplibreGL: vi.fn(), setWorkerUrl: vi.fn()}));
vi.mock('leaflet', () => ({default: {tileLayer: mocks.tileLayer}}));
vi.mock('@maplibre/maplibre-gl-leaflet', () => ({maplibreGL: mocks.maplibreGL}));
vi.mock('maplibre-gl', () => ({setWorkerUrl: mocks.setWorkerUrl}));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({default: './maplibre-worker.cjs'}));

describe('base map providers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps OSM as a raster layer without starting a vector worker', () => {
    createBaseLayer('osm', 'https://intel.ingress.com/__iris_android__/');
    expect(mocks.tileLayer).toHaveBeenCalledWith('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: expect.stringContaining('OpenStreetMap') as unknown,
    });
    expect(mocks.setWorkerUrl).not.toHaveBeenCalled();
    expect(mocks.maplibreGL).not.toHaveBeenCalled();
  });

  it('loads the dark and light styles without keys or map gestures on the vector layer', () => {
    for (const [id, style] of [['openfreemap-dark', 'dark'], ['openfreemap-positron', 'positron']] as const) {
      createBaseLayer(id, 'https://intel.ingress.com/__iris_android__/');
      expect(mocks.maplibreGL).toHaveBeenLastCalledWith({
        style: `https://tiles.openfreemap.org/styles/${style}`,
        interactive: false,
        attributionControl: {customAttribution: expect.stringMatching(/OpenFreeMap.*OpenMapTiles.*OpenStreetMap/) as unknown},
      });
    }
    expect(mocks.setWorkerUrl).toHaveBeenLastCalledWith('https://intel.ingress.com/__iris_android__/maplibre-worker.cjs');
  });

  it('resolves the packaged worker against an extension asset origin', () => {
    createBaseLayer('openfreemap-dark', 'moz-extension://iris/');
    expect(mocks.setWorkerUrl).toHaveBeenCalledWith('moz-extension://iris/maplibre-worker.cjs');
  });

  it('normalizes old provider selections and unknown values consistently', () => {
    expect(normalizeBaseLayerId('cartodb-dark-matter')).toBe('openfreemap-dark');
    expect(normalizeBaseLayerId('cartodb-positron')).toBe('openfreemap-positron');
    expect(normalizeBaseLayerId('osm')).toBe('osm');
    expect(normalizeBaseLayerId(null)).toBe('openfreemap-dark');
    expect(normalizeBaseLayerId('not-a-provider')).toBe('openfreemap-dark');
  });
});
