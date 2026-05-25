import { PORTAL_HISTORY_COLORS as MAP_PORTAL_HISTORY_COLORS } from './MapConstants';
export {
    DEFAULT_PORTAL_HISTORY_LAYER_STATE as DEFAULT_PORTAL_HISTORY_LAYERS,
    isPortalHistoryMode,
    nextPortalHistoryMode,
    type PortalHistoryKey,
    type PortalHistoryLayerState,
    type PortalHistoryMode,
} from '@iris/core';

import type { PortalHistoryKey } from '@iris/core';

export const PORTAL_HISTORY_COLORS: Record<PortalHistoryKey, string> = {
    visited: MAP_PORTAL_HISTORY_COLORS.visited,
    captured: MAP_PORTAL_HISTORY_COLORS.captured,
    scanned: MAP_PORTAL_HISTORY_COLORS.scanned,
};
