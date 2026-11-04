import {afterEach, describe, expect, it, vi} from 'vitest';
import * as settings from './storage-settings';
import {DEFAULT_LAYER_SETTINGS} from '../map/layers/layer-registry';
import {DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS} from '../portals/portal-detail-section-registry';
import {defaultMapView} from '../map/map-view-settings';

const blocked = (): never => { throw new Error('Storage blocked'); };
afterEach(() => vi.unstubAllGlobals());

function storedValues(values = new Map<string, string>()): Map<string, string> {
  vi.stubGlobal('window', {localStorage: {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => { values.set(key, value); },
    removeItem: (key: string): void => { values.delete(key); },
  }});
  return values;
}

function writePreferences(): void {
  settings.storeMapView(defaultMapView());
  settings.storeLayerSettings(DEFAULT_LAYER_SETTINGS);
  settings.storeHighlighterSettings({active: 'history-visited'});
  settings.storeDataSourceId('retired-fixture');
  settings.storeLifecycleSettings({iitcMovementDelay: true});
  settings.storeDebugDockVisible(false);
  settings.storeCommTab('faction');
  settings.storeActiveSheet('inventory');
  settings.storePortalSections(DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS);
  settings.storeBoolean('test-flag', true);
  settings.storeSidePanelId('comm');
}

describe('preference persistence boundaries', () => {
  it('keeps feature defaults when window, the storage getter or getItem is unavailable', () => {
    for (const value of [undefined, {get localStorage(): Storage { return blocked(); }}, {localStorage: {getItem: blocked}}]) {
      vi.stubGlobal('window', value);
      expect(settings.loadStoredMapView()).toEqual(defaultMapView());
      expect(settings.loadStoredBaseLayerId()).toBe('openfreemap-dark');
      expect(settings.loadStoredLayerSettings()).toBe(DEFAULT_LAYER_SETTINGS);
      expect(settings.loadStoredHighlighterSettings()).toEqual({active: 'none'});
      expect(settings.loadStoredDataSourceId()).toBe('live');
      expect(settings.loadStoredLifecycleSettings()).toEqual({iitcMovementDelay: false});
      expect(settings.loadStoredDebugDockVisible()).toBe(false);
      expect(settings.loadStoredCommTab()).toBe('all');
      expect(settings.loadStoredSidePanelId()).toBeNull();
      expect(settings.loadStoredActiveSheet()).toBe('map');
      expect(settings.loadStoredPortalSections()).toEqual(DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS);
      expect(settings.loadStoredBoolean('test-flag', true)).toBe(true);
    }
  });

  it('retains malformed-JSON fallbacks and highlighter migration read ordering', () => {
    const values = storedValues();
    for (const invalid of ['broken-json', 'null']) {
      for (const key of [settings.LAYER_SETTINGS_STORAGE_KEY, settings.HIGHLIGHTER_SETTINGS_STORAGE_KEY,
        settings.LIFECYCLE_SETTINGS_STORAGE_KEY, settings.PORTAL_SECTION_STORAGE_KEY]) values.set(key, invalid);
      expect(settings.loadStoredLayerSettings()).toBe(DEFAULT_LAYER_SETTINGS);
      expect(settings.loadStoredHighlighterSettings()).toEqual({active: 'none'});
      expect(settings.loadStoredLifecycleSettings()).toEqual({iitcMovementDelay: false});
      expect(settings.loadStoredPortalSections()).toBe(DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS);
    }
    values.set(settings.HIGHLIGHTER_SETTINGS_STORAGE_KEY, '{"active":"level-color"}');
    values.set(settings.LAYER_SETTINGS_STORAGE_KEY, 'broken-json');
    // Existing behavior: malformed legacy data fails the whole two-key read, even with a valid new setting.
    expect(settings.loadStoredHighlighterSettings()).toEqual({active: 'none'});
    const getItem = vi.fn((key: string): string | null => key === settings.HIGHLIGHTER_SETTINGS_STORAGE_KEY ? blocked() : '{"levelFill":true}');
    vi.stubGlobal('window', {localStorage: {getItem}});
    expect(settings.loadStoredHighlighterSettings()).toEqual({active: 'none'});
    expect(getItem.mock.calls.map(([key]) => key)).toEqual([settings.HIGHLIGHTER_SETTINGS_STORAGE_KEY]);
  });

  it('preserves legacy drawing, tracker, key-count and highlighter precedence rules', () => {
    const values = storedValues(new Map([[settings.LAYER_SETTINGS_STORAGE_KEY,
      '{"drawnItems":false,"drawnLinks":true,"playerTracker":false,"playerTrackerResistance":true,"keyCount":"on","levelFill":true,"healthFill":true}']]));
    expect(settings.loadStoredLayerSettings()).toMatchObject({drawnLinks: true, drawnMarkers: false,
      playerTracker: DEFAULT_LAYER_SETTINGS.playerTracker, playerTrackerResistance: true,
      playerTrackerEnlightened: false, playerTrackerMachina: false, keyCount: true});
    expect(settings.loadStoredHighlighterSettings()).toEqual({active: 'level-color'});
    values.set(settings.HIGHLIGHTER_SETTINGS_STORAGE_KEY, '{"active":"needs-recharge"}');
    expect(settings.loadStoredHighlighterSettings()).toEqual({active: 'needs-recharge'});
    values.set(settings.LAYER_SETTINGS_STORAGE_KEY, '{"keyCount":"true"}');
    expect(settings.loadStoredLayerSettings().keyCount).toBe(false);
  });

  it('falls back to a saved side panel when the active-sheet read fails', () => {
    vi.stubGlobal('window', {localStorage: {getItem: (key: string): string | null =>
      key === settings.ACTIVE_SHEET_STORAGE_KEY ? blocked() : key === settings.SIDE_PANEL_STORAGE_KEY ? 'inventory' : null}});
    expect(settings.loadStoredActiveSheet()).toBe('inventory');
  });

  it('writes the same raw strings and JSON, and removes only the side-panel key when cleared', () => {
    const values = storedValues();
    writePreferences();
    expect(Object.fromEntries(values)).toEqual({
      'iitc-iris:map-view': JSON.stringify(defaultMapView()),
      [settings.LAYER_SETTINGS_STORAGE_KEY]: JSON.stringify(DEFAULT_LAYER_SETTINGS),
      [settings.HIGHLIGHTER_SETTINGS_STORAGE_KEY]: '{"active":"history-visited"}',
      [settings.DATA_SOURCE_STORAGE_KEY]: 'live',
      [settings.LIFECYCLE_SETTINGS_STORAGE_KEY]: '{"iitcMovementDelay":true}',
      [settings.DEBUG_DOCK_STORAGE_KEY]: 'false',
      [settings.COMM_TAB_STORAGE_KEY]: 'faction',
      [settings.ACTIVE_SHEET_STORAGE_KEY]: 'inventory',
      [settings.PORTAL_SECTION_STORAGE_KEY]: JSON.stringify(DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS),
      'test-flag': 'true',
      [settings.SIDE_PANEL_STORAGE_KEY]: 'comm',
    });
    settings.storeSidePanelId(null);
    expect(values.has(settings.SIDE_PANEL_STORAGE_KEY)).toBe(false);
    expect(values.get(settings.ACTIVE_SHEET_STORAGE_KEY)).toBe('inventory');
  });

  it('ignores unavailable storage, quota errors, removal failures and serialization failures', () => {
    for (const value of [undefined, {get localStorage(): Storage { return blocked(); }},
      {localStorage: {setItem: blocked, removeItem: blocked}}]) {
      vi.stubGlobal('window', value);
      expect(writePreferences).not.toThrow();
      expect(() => settings.storeSidePanelId(null)).not.toThrow();
    }
    const values = storedValues();
    const unencodable = {...DEFAULT_LAYER_SETTINGS, toJSON: blocked};
    expect(() => settings.storeLayerSettings(unencodable)).not.toThrow();
    expect(values.has(settings.LAYER_SETTINGS_STORAGE_KEY)).toBe(false);
    settings.storeCommTab('alerts');
    expect(settings.loadStoredCommTab()).toBe('alerts');
  });
});
