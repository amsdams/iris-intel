import * as shellView from '../shell/storage-settings';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DEFAULT_CENTER, DEFAULT_ZOOM} from './map-view-settings';
import {loadStoredBaseLayerId, loadStoredMapView, loadUrlMapView,
  storeBaseLayerId, storeMapView, syncIntelMapCookies, syncUrlMapView} from './map-view';

const fallback = {lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], zoom: DEFAULT_ZOOM};
describe('Map view and preference persistence', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('window', {localStorage: {getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value))},
    location: {search: '', href: 'https://intel.ingress.com/?keep=yes#portal'},
    history: {state: {retained: true}, replaceState: vi.fn()}});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('round trips the existing key and clamps stored coordinates and zoom', () => {
    expect(loadStoredMapView()).toEqual(fallback);
    storeMapView({lat: 90, lng: 200, zoom: 30});
    expect(values.get('iitc-iris:map-view')).toBe('{"lat":90,"lng":200,"zoom":30}');
    expect(loadStoredMapView()).toEqual({lat: 85.051128, lng: 179.999999, zoom: 21});
    storeMapView({lat: -90, lng: -200, zoom: -1});
    expect(loadStoredMapView()).toEqual({lat: -85.051128, lng: -180, zoom: 0});
  });

  it('falls back for invalid JSON, wrong types, missing fields and restricted storage', () => {
    for (const value of ['invalid', 'null', '{"lat":"52","lng":4,"zoom":15}', '{"lat":52,"lng":4}', '{"lat":1e999,"lng":4,"zoom":15}']) {
      values.set('iitc-iris:map-view', value);
      expect(loadStoredMapView()).toEqual(fallback);
    }
    vi.mocked(window.localStorage.getItem).mockImplementation(() => {throw new Error('Denied');});
    vi.mocked(window.localStorage.setItem).mockImplementation(() => {throw new Error('Denied');});
    expect(loadStoredMapView()).toEqual(fallback);
    expect(loadStoredBaseLayerId()).toBe('openfreemap-dark');
    expect(() => {storeMapView(fallback); storeBaseLayerId('osm');}).not.toThrow();
  });

  it('keeps URL precedence, required parameters, zero values and clamps', () => {
    storeMapView({lat: 1, lng: 2, zoom: 3});
    for (const search of ['', '?ll=52,4', '?z=15', '?ll=bad,4&z=15']) {
      window.location.search = search;
      expect(loadUrlMapView()).toBeNull();
    }
    window.location.search = '?ll=0,0&z=0';
    expect(loadUrlMapView() ?? loadStoredMapView()).toEqual({lat: 0, lng: 0, zoom: 0});
    window.location.search = '?ll=90,-200&z=30';
    expect(loadUrlMapView()).toEqual({lat: 85.051128, lng: -180, zoom: 21});
  });

  it('migrates retired base layers and preserves the preference key', () => {
    values.set('iitc-iris:base-layer', 'cartodb-positron');
    expect(loadStoredBaseLayerId()).toBe('openfreemap-positron');
    values.set('iitc-iris:base-layer', 'unknown');
    expect(loadStoredBaseLayerId()).toBe('openfreemap-dark');
    storeBaseLayerId('osm');
    expect(loadStoredBaseLayerId()).toBe('osm');
  });

  it('writes Intel cookies and rounded URL coordinates while preserving unrelated URL/history state', () => {
    const cookies: string[] = [];
    vi.stubGlobal('document', {set cookie(value: string) {cookies.push(value);}});
    const view = {lat: 52.12345678, lng: 4.87654321, zoom: 14.567};
    syncIntelMapCookies(view);
    expect(cookies).toEqual(['ingress.intelmap.shflt=hdn', 'ingress.intelmap.lat=52.12345678',
      'ingress.intelmap.lng=4.87654321', 'ingress.intelmap.zoom=15']
      .map(value => `${value}; path=/; max-age=31536000; SameSite=Lax`));
    syncUrlMapView(view);
    const call = vi.mocked(window.history.replaceState).mock.calls[0];
    const state: unknown = call[0];
    const [, title, url] = call;
    expect(state).toEqual({retained: true});
    expect(title).toBe('');
    expect(String(url)).toBe('https://intel.ingress.com/?keep=yes&ll=52.123457%2C4.876543&z=14.57#portal');
    vi.mocked(window.history.replaceState).mockImplementation(() => {throw new Error('Restricted');});
    expect(() => syncUrlMapView(view)).not.toThrow();
  });
});

describe('UI and page map preference adapters', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('agree on stored view/base-layer migration, URL precedence and restricted storage', () => {
    const values = new Map<string, string>();
    const getItem = vi.fn((key: string): string | null => values.get(key) ?? null);
    vi.stubGlobal('window', {localStorage: {getItem}, location: {search: ''}});
    for (const stored of ['invalid', '{"lat":90,"lng":-200,"zoom":30}', '{"lat":0,"lng":0,"zoom":0}']) {
      values.set('iitc-iris:map-view', stored);
      expect(shellView.loadStoredMapView()).toEqual(loadStoredMapView());
    }
    for (const search of ['?ll=52,4&z=15', '?ll=0,0&z=0', '?ll=90,-200&z=30', '?ll=bad,4&z=15']) {
      window.location.search = search;
      expect(shellView.loadUrlMapView()).toEqual(loadUrlMapView());
      expect(shellView.loadInitialMapView()).toEqual(loadUrlMapView() ?? loadStoredMapView());
    }
    for (const base of ['cartodb-dark-matter', 'cartodb-positron', 'osm', 'unknown']) {
      values.set('iitc-iris:base-layer', base);
      expect(shellView.loadStoredBaseLayerId()).toBe(loadStoredBaseLayerId());
    }
    getItem.mockImplementation(() => {throw new Error('Restricted');});
    expect(shellView.loadStoredMapView()).toEqual(loadStoredMapView());
    expect(shellView.loadStoredBaseLayerId()).toBe(loadStoredBaseLayerId());
  });
});
