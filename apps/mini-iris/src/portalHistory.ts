export type PortalHistoryKey = 'visited' | 'captured' | 'scanned';

export type PortalHistoryMode = 'off' | 'highlight' | 'inverse';

export type PortalHistoryLayerState = Record<PortalHistoryKey, PortalHistoryMode>;

export const DEFAULT_PORTAL_HISTORY_LAYERS: PortalHistoryLayerState = {
    visited: 'highlight',
    captured: 'highlight',
    scanned: 'highlight',
};

export const PORTAL_HISTORY_COLORS: Record<PortalHistoryKey, string> = {
    visited: '#9b59b6',
    captured: '#ff6b35',
    scanned: '#00d9ff',
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
