export type PortalHistoryKey = 'visited' | 'captured' | 'scanned';

export type PortalHistoryMode = 'off' | 'highlight' | 'inverse';

export type PortalHistoryLayerState = Record<PortalHistoryKey, PortalHistoryMode>;

export type HistoryFilterState = 'ALL' | 'TRUE' | 'FALSE';

export interface PortalHistoryFlags {
  visited?: boolean;
  captured?: boolean;
  scanned?: boolean;
}

export interface PortalHistoryOverlayFlags {
  visitedHighlight: boolean;
  capturedHighlight: boolean;
  scannedHighlight: boolean;
  visitedInverse: boolean;
  capturedInverse: boolean;
  scannedInverse: boolean;
}

export interface PortalHistoryFilterState {
  showVisited: HistoryFilterState;
  showCaptured: HistoryFilterState;
  showScanned: HistoryFilterState;
}

export const PORTAL_HISTORY_KEYS: readonly PortalHistoryKey[] = ['visited', 'captured', 'scanned'];

export const DEFAULT_PORTAL_HISTORY_LAYER_STATE: PortalHistoryLayerState = {
  visited: 'off',
  captured: 'off',
  scanned: 'off',
};

export function isPortalHistoryMode(value: unknown): value is PortalHistoryMode {
  return value === 'off' || value === 'highlight' || value === 'inverse';
}

export function nextPortalHistoryMode(mode: PortalHistoryMode): PortalHistoryMode {
  switch (mode) {
    case 'off':
      return 'highlight';
    case 'highlight':
      return 'inverse';
    case 'inverse':
      return 'off';
  }
}

export function getPortalHistoryOverlayFlags(
  history: PortalHistoryFlags,
  layers: PortalHistoryLayerState
): PortalHistoryOverlayFlags {
  return {
    visitedHighlight: layers.visited === 'highlight' && history.visited === true,
    capturedHighlight: layers.captured === 'highlight' && history.captured === true,
    scannedHighlight: layers.scanned === 'highlight' && history.scanned === true,
    visitedInverse: layers.visited === 'inverse' && history.visited === false,
    capturedInverse: layers.captured === 'inverse' && history.captured === false,
    scannedInverse: layers.scanned === 'inverse' && history.scanned === false,
  };
}

export function matchesPortalHistoryFilters(
  history: PortalHistoryFlags,
  filters: PortalHistoryFilterState
): boolean {
  if (filters.showVisited === 'TRUE' && !history.visited) return false;
  if (filters.showVisited === 'FALSE' && history.visited) return false;
  if (filters.showCaptured === 'TRUE' && !history.captured) return false;
  if (filters.showCaptured === 'FALSE' && history.captured) return false;
  if (filters.showScanned === 'TRUE' && !history.scanned) return false;
  if (filters.showScanned === 'FALSE' && history.scanned) return false;
  return true;
}
