import { PORTAL_HISTORY_COLORS as MAP_PORTAL_HISTORY_COLORS } from './MapConstants';

export type PortalHistoryKey = 'visited' | 'captured' | 'scanned';

export type PortalHistoryMode = 'off' | 'highlight' | 'inverse';

export type PortalHistoryLayerState = Record<PortalHistoryKey, PortalHistoryMode>;

export const DEFAULT_PORTAL_HISTORY_LAYERS: PortalHistoryLayerState = {
    visited: 'highlight',
    captured: 'highlight',
    scanned: 'highlight',
};

export const PORTAL_HISTORY_COLORS: Record<PortalHistoryKey, string> = {
    visited: MAP_PORTAL_HISTORY_COLORS.visited,
    captured: MAP_PORTAL_HISTORY_COLORS.captured,
    scanned: MAP_PORTAL_HISTORY_COLORS.scanned,
};

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
