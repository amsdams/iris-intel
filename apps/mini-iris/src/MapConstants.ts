import {
    INGRESS_LEVEL_COLORS,
    INGRESS_MISC_COLORS,
    INGRESS_MOD_RARITY_COLORS,
    INGRESS_PORTAL_HISTORY_COLORS,
    INGRESS_TEAM_COLORS,
} from '@iris/core/ingress-map-style';

export const INGRESS_COLORS = {
    ENLIGHTENED: INGRESS_TEAM_COLORS.E,
    RESISTANCE: INGRESS_TEAM_COLORS.R,
    MACHINA: INGRESS_TEAM_COLORS.M,
    NEUTRAL: INGRESS_TEAM_COLORS.N,
    XM: INGRESS_MISC_COLORS.XM,
    KEY: INGRESS_MISC_COLORS.KEY,
    VISITED: INGRESS_PORTAL_HISTORY_COLORS.visited,
    CAPTURED: INGRESS_PORTAL_HISTORY_COLORS.captured,
    SCANNED: INGRESS_PORTAL_HISTORY_COLORS.scanned,
    TRACKER: INGRESS_MISC_COLORS.TRACKER,
    ARTIFACT: INGRESS_MISC_COLORS.ARTIFACT,
    ORNAMENT: INGRESS_MISC_COLORS.ORNAMENT,
};

export const COLORS = {
    E: INGRESS_COLORS.ENLIGHTENED,
    R: INGRESS_COLORS.RESISTANCE,
    M: INGRESS_COLORS.MACHINA,
    N: INGRESS_COLORS.NEUTRAL
};

export const PORTAL_HISTORY_COLORS = {
    visited: INGRESS_COLORS.VISITED,
    captured: INGRESS_COLORS.CAPTURED,
    scanned: INGRESS_COLORS.SCANNED,
};

export const PLAYER_TRACKER_COLORS = {
    trail: INGRESS_COLORS.TRACKER,
    point: INGRESS_COLORS.TRACKER,
    stroke: '#1A0010',
};

export const RARITY_COLORS: Record<string, string> = {
    'COMMON': INGRESS_MOD_RARITY_COLORS.COMMON,
    'RARE': INGRESS_MOD_RARITY_COLORS.RARE,
    'VERY_RARE': INGRESS_MOD_RARITY_COLORS.VERY_RARE
};

export const ITEM_LEVEL_COLORS: Record<number, string> = {
    1: INGRESS_LEVEL_COLORS[1], 2: INGRESS_LEVEL_COLORS[2], 3: INGRESS_LEVEL_COLORS[3], 4: INGRESS_LEVEL_COLORS[4],
    5: INGRESS_LEVEL_COLORS[5], 6: INGRESS_LEVEL_COLORS[6], 7: INGRESS_LEVEL_COLORS[7], 8: INGRESS_LEVEL_COLORS[8]
};

export type MapStyleName = 'Dark' | 'Light' | 'Voyager' | 'OSM';

export const MAP_STYLES: Record<MapStyleName, string[]> = {
    'Dark': [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
    ],
    'Light': [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
    ],
    'Voyager': [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
    ],
    'OSM': [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    ]
};
