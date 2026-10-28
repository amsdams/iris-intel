import {afterEach, describe, expect, it, vi} from 'vitest';
import {SHEET_REGISTRY} from './menu-registry';
import {HIDDEN_PANELS_STORAGE_KEY, isPanelVisible, loadHiddenPanels, normalizeHiddenPanels} from './panel-visibility';
import {loadStoredActiveSheet, storeActiveSheet} from './storage-settings';

afterEach(() => vi.unstubAllGlobals());

describe('optional panel visibility', () => {
  it('defaults to showing everything and only accepts the five optional panel ids', () => {
    expect(SHEET_REGISTRY.every(entry => isPanelVisible(entry.id, []))).toBe(true);
    for (const value of [null, undefined, {}, true, 'portalCounts']) expect(normalizeHiddenPanels(value)).toEqual([]);
    const ids = SHEET_REGISTRY.map(entry => entry.id);
    const hidden = normalizeHiddenPanels([...ids, ...ids, 'unknown', false]);
    expect(hidden).toEqual(['portalCounts', 'portalsList', 'scoreboard', 'drawLinks', 'drawMarkers']);
    expect(ids.filter(id => !isPanelVisible(id, ids))).toEqual(hidden);
  });

  it('tolerates malformed and blocked storage without hiding baseline panels', () => {
    const getItem = vi.fn(() => 'not-json');
    vi.stubGlobal('window', {localStorage: {getItem}});
    expect(loadHiddenPanels()).toEqual([]);
    expect(getItem).toHaveBeenCalledWith(HIDDEN_PANELS_STORAGE_KEY);
    getItem.mockReturnValue('["layers","panelSettings","drawMarkers"]');
    expect(loadHiddenPanels()).toEqual(['drawMarkers']);
    getItem.mockImplementation(() => {throw new Error('blocked');});
    expect(loadHiddenPanels()).toEqual([]);
  });

  it('restores a hidden active panel to the map, while retaining visible panels', () => {
    const stored = new Map<string, string>([[HIDDEN_PANELS_STORAGE_KEY, '["drawMarkers"]']]);
    vi.stubGlobal('window', {localStorage: {
      getItem: (key: string): string | null => stored.get(key) ?? null,
      setItem: (key: string, value: string): void => {stored.set(key, value);},
    }});
    storeActiveSheet('drawMarkers');
    expect(loadStoredActiveSheet()).toBe('map');
    storeActiveSheet('drawLinks');
    expect(loadStoredActiveSheet()).toBe('drawLinks');
    storeActiveSheet('panelSettings');
    expect(loadStoredActiveSheet()).toBe('panelSettings');
  });
});
