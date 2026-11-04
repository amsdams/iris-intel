import {readLocalStorage, writeLocalStorage} from '../platform/storage';
import {useEffect, useState} from 'preact/hooks';

export type UiThemePreference = 'system' | 'dark' | 'light';
export const UI_THEME_STORAGE_KEY = 'iitc-iris:ui-theme';

export function normalizeUiTheme(value: unknown): UiThemePreference {
  return value === 'system' || value === 'light' ? value : 'dark';
}

export function resolveUiTheme(preference: UiThemePreference, systemDark: boolean): 'dark' | 'light' {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

export function loadUiTheme(): UiThemePreference {
  return readLocalStorage(storage => normalizeUiTheme(storage?.getItem(UI_THEME_STORAGE_KEY)), () => 'dark');
}

export function useUiTheme(): {uiTheme: UiThemePreference; setUiTheme: (theme: UiThemePreference) => void} {
  const [uiTheme, setUiTheme] = useState(loadUiTheme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {document.documentElement.dataset.iitcIrisTheme = resolveUiTheme(uiTheme, media.matches);};
    apply();
    writeLocalStorage(storage => storage?.setItem(UI_THEME_STORAGE_KEY, uiTheme));
    media.addEventListener('change', apply);
    return (): void => media.removeEventListener('change', apply);
  }, [uiTheme]);
  return {uiTheme, setUiTheme};
}
