import { describe, expect, it, beforeEach } from 'vitest';
import {
  createDataSourceSettings,
  DATA_SOURCE_OPTIONS,
  defaultMapView,
  loadStoredActiveSheet,
  loadStoredBaseLayerId,
  loadStoredBoolean,
  loadStoredCommTab,
  loadStoredHighlighterSettings,
  loadStoredLayerSettings,
  loadStoredLifecycleSettings,
  storeActiveSheet,
  storeBoolean,
  storeLayerSettings,
  VIEW_PRESETS,
} from './content-storage-settings';
import { DEFAULT_LAYER_SETTINGS } from './layer-registry';

function mockLocalStorage(): Storage {
  let store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store = new Map<string, string>();
    },
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    get length(): number {
      return store.size;
    },
  };
}

describe('content-storage-settings', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: mockLocalStorage(),
    };
  });

  it('provides default map view coordinates and preset choices', () => {
    const view = defaultMapView();
    expect(view.lat).toBeCloseTo(52.373);
    expect(view.lng).toBeCloseTo(4.892);
    expect(view.zoom).toBe(11);
    expect(VIEW_PRESETS.length).toBeGreaterThan(0);
    expect(DATA_SOURCE_OPTIONS.length).toBeGreaterThan(0);
  });

  it('loads default base layer and layer settings when storage is empty', () => {
    expect(loadStoredBaseLayerId()).toBe('cartodb-dark-matter');
    expect(loadStoredLayerSettings()).toEqual(DEFAULT_LAYER_SETTINGS);
    expect(loadStoredLifecycleSettings()).toEqual({ iitcMovementDelay: false });
    expect(loadStoredCommTab()).toBe('all');
  });

  it('persists and loads layer settings correctly', () => {
    const customSettings = { ...DEFAULT_LAYER_SETTINGS, fields: false, links: false };
    storeLayerSettings(customSettings);
    expect(loadStoredLayerSettings()).toEqual(customSettings);
  });

  it('persists and loads active sheet and boolean flags', () => {
    storeActiveSheet('inventory');
    expect(loadStoredActiveSheet()).toBe('inventory');

    storeBoolean('test-key', true);
    expect(loadStoredBoolean('test-key', false)).toBe(true);
  });

  it('creates data source settings from registered ids', () => {
    const live = createDataSourceSettings('live');
    expect(live.mode).toBe('live');

    const fixture = createDataSourceSettings('ams-z10');
    expect(fixture.mode).toBe('fixture');
    if (fixture.mode === 'fixture') {
      expect(fixture.url).toContain('get-entities-z10.json');
    }
  });

  it('migrates legacy highlighter settings from legacy layer settings', () => {
    window.localStorage.setItem('iitc-iris:layer-settings', JSON.stringify({ levelFill: true }));
    expect(loadStoredHighlighterSettings()).toEqual({ active: 'level-color' });
  });
});
