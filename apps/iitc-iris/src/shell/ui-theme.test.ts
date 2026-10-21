import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadUiTheme, normalizeUiTheme, resolveUiTheme, UI_THEME_STORAGE_KEY} from './ui-theme';

afterEach(() => vi.unstubAllGlobals());

describe('interface theme', () => {
  it('preserves the dark default and rejects invalid stored preferences', () => {
    for (const value of [null, undefined, '', 'unknown', {}, true]) expect(normalizeUiTheme(value)).toBe('dark');
    for (const value of ['dark', 'light', 'system']) expect(normalizeUiTheme(value)).toBe(value);
  });

  it('only follows the system when selected, independently of map style', () => {
    expect(resolveUiTheme('system', true)).toBe('dark');
    expect(resolveUiTheme('system', false)).toBe('light');
    expect(resolveUiTheme('dark', false)).toBe('dark');
    expect(resolveUiTheme('light', true)).toBe('light');
  });

  it('loads its own preference and tolerates blocked storage', () => {
    const getItem = vi.fn(() => 'light');
    vi.stubGlobal('window', {localStorage: {getItem}});
    expect(loadUiTheme()).toBe('light');
    expect(getItem).toHaveBeenCalledWith(UI_THEME_STORAGE_KEY);
    getItem.mockImplementation(() => {throw new Error('blocked');});
    expect(loadUiTheme()).toBe('dark');
  });
});
