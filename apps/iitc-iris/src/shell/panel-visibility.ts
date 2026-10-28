import {useCallback, useState} from 'preact/hooks';
import {OPTIONAL_PANEL_REGISTRY, type IitcIrisSheetId} from './menu-registry';

export const HIDDEN_PANELS_STORAGE_KEY = 'iitc-iris:hidden-panels';

/** Only known optional panels can be hidden. New panels remain visible by default. */
export function normalizeHiddenPanels(value: unknown): IitcIrisSheetId[] {
  return Array.isArray(value) ? OPTIONAL_PANEL_REGISTRY.filter(entry => value.includes(entry.id)).map(entry => entry.id) : [];
}

export function isPanelVisible(sheet: IitcIrisSheetId, hiddenPanels: readonly IitcIrisSheetId[]): boolean {
  return !OPTIONAL_PANEL_REGISTRY.some(entry => entry.id === sheet) || !hiddenPanels.includes(sheet);
}

export function loadHiddenPanels(): IitcIrisSheetId[] {
  try { return normalizeHiddenPanels(JSON.parse(window.localStorage.getItem(HIDDEN_PANELS_STORAGE_KEY) ?? '[]')); }
  catch { return []; }
}

function storeHiddenPanels(hiddenPanels: IitcIrisSheetId[]): void {
  try { window.localStorage.setItem(HIDDEN_PANELS_STORAGE_KEY, JSON.stringify(hiddenPanels)); }
  catch { /* Visibility still applies for this page when persistence is unavailable. */ }
}

export function usePanelVisibility(): {
  hiddenPanels: IitcIrisSheetId[];
  isPanelVisible: (sheet: IitcIrisSheetId) => boolean;
  togglePanel: (sheet: IitcIrisSheetId) => void;
  restoreDefaults: () => void;
} {
  const [hiddenPanels, setHiddenPanels] = useState(loadHiddenPanels);
  const visible = useCallback((sheet: IitcIrisSheetId): boolean => isPanelVisible(sheet, hiddenPanels), [hiddenPanels]);
  const togglePanel = useCallback((sheet: IitcIrisSheetId): void => {
    if (!OPTIONAL_PANEL_REGISTRY.some(entry => entry.id === sheet)) return;
    setHiddenPanels(current => {
      const next = current.includes(sheet) ? current.filter(id => id !== sheet) : [...current, sheet];
      storeHiddenPanels(next);
      return next;
    });
  }, []);
  const restoreDefaults = useCallback((): void => {
    storeHiddenPanels([]);
    setHiddenPanels([]);
  }, []);
  return {hiddenPanels, isPanelVisible: visible, togglePanel, restoreDefaults};
}
