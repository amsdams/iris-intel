export const INGRESS_COLORS = {
    ENLIGHTENED: '#03FE03',
    RESISTANCE: '#00C2FF',
    MACHINA: '#FF202D',
    NEUTRAL: '#FFFFFF',
    XM: '#00D9FF',
    KEY: '#F7C948',
    VISITED: '#B56DFF',
    CAPTURED: '#FF8A3D',
    SCANNED: '#00D9FF',
    TRACKER: '#F781FF',
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
    'COMMON': '#49EBC3',
    'RARE': '#B68BFF',
    'VERY_RARE': '#F781FF'
};

export const ITEM_LEVEL_COLORS: Record<number, string> = {
    1: '#FECE5A', 2: '#FFA630', 3: '#FF7315', 4: '#E80000',
    5: '#FF0099', 6: '#EE26CD', 7: '#C124E0', 8: '#9627F4'
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
