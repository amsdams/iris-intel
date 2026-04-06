export interface ThemeColors {
    E: string;
    R: string;
    M: string;
    N: string;
    AQUA: string;
    LEVELS: Record<number, string>;
    RARITY: Record<string, string>;
}

const INGRESS_LEVELS: Record<number, string> = {
    1: '#FECE5A',
    2: '#FFA630',
    3: '#FF7315',
    4: '#E80000',
    5: '#FF0099',
    6: '#EE26CD',
    7: '#C124E0',
    8: '#9627F4',
};

const INGRESS_RARITY = {
    COMMON: '#8CFFBF',
    RARE: '#73A8FF',
    VERY_RARE: '#B08CFF',
    EXTREMELY_RARE: '#FF0000',
    AEGIS: '#00D4AA',
};

const DEBUG_RARITY = {
    COMMON: '#565656',
    RARE: '#1566E6',
    VERY_RARE: '#EF7B03',
    EXTREMELY_RARE: '#ff0000',
    AEGIS: '#00D4AA',
};

const INTEL_DEFAULT_THEME: ThemeColors = {
    E: '#03DC03',
    R: '#0088FF',
    M: '#FF1010',
    N: '#C0C0C0',
    AQUA: '#D1FFFF',
    LEVELS: INGRESS_LEVELS,
    RARITY: INGRESS_RARITY,
};

export const THEMES: Record<string, ThemeColors> = {
    INGRESS: INTEL_DEFAULT_THEME,
    DEBUG: {
        E: '#00ff00',
        R: '#0000ff',
        M: '#ff0000',
        N: '#ffffff',
        AQUA: '#00ffff',
        LEVELS: INGRESS_LEVELS,
        RARITY: DEBUG_RARITY,
    },
    CYBER: {
        E: '#00ffa3',
        R: '#00e5ff',
        M: '#ff0055',
        N: '#e0e0e0',
        AQUA: '#00e5ff',
        LEVELS: INGRESS_LEVELS,
        RARITY: DEBUG_RARITY,
    },
    SOFTER: {
        E: '#78f400',
        R: '#4fc3f7',
        M: '#ff5252',
        N: '#cfd8dc',
        AQUA: '#4dd0e1',
        LEVELS: INGRESS_LEVELS,
        RARITY: DEBUG_RARITY,
    },
};

export const MAP_THEMES: Record<string, { name: string; url: string }> = {
    DARK: {
        name: 'Dark (Carto)',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    },
    LIGHT: {
        name: 'Light (Carto)',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    },
    VOYAGER: {
        name: 'Voyager (Carto)',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    },
    OSM: {
        name: 'OpenStreetMap',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
};

export const TEAM_NAME: Record<string, string> = {
    E: 'Enlightened',
    R: 'Resistance',
    M: 'Machina',
    N: 'Neutral',
};

export const UI_COLORS = {
    AQUA: '#00ffff',
    GLOW: '#00ffff55',
    BG_BASE: 'rgba(0, 0, 0, 0.92)',
    BG_POPUP: 'rgba(0, 0, 0, 0.92)',
    TEXT_BASE: '#ffffff',
    TEXT_MUTED: '#aaaaaa',
    BORDER_DIM: '#333333',
    ERROR: '#ff5555',
    WARNING: '#ffaa00',
    SUCCESS: '#00ff00',
};

export const SEMANTIC_COLORS = {
    HISTORY_VISITED: '#9B59B6',
    HISTORY_CAPTURED: '#E74C3C',
    HISTORY_SCANNED: '#F1C40F',
    MISSION: '#EF8E2E',
    ARTIFACT: '#FF00FF',
    HEALTH_HIGH: '#00FF00',
    HEALTH_MEDIUM: '#FFFF00',
    HEALTH_LOW: '#FF0000',
} as const;

export const FONT_SIZES = {
    H2: '1.2em',
    H3: '1.1em',
    BASE: '1em',
    SMALL: '0.85em',
    TINY: '0.75em',
};

export const SPACING = {
    XS: '4px',
    SM: '8px',
    MD: '16px',
    LG: '24px',
};

export const SHARED_STYLES = {
    btnStyle: (active: boolean, accentColor: string = UI_COLORS.AQUA) => ({
        background: active ? accentColor : '#555',
        color: '#000',
        border: 'none',
        padding: '5px 10px',
        borderRadius: '3px',
        cursor: active ? 'pointer' : 'default',
        fontWeight: 'bold',
        fontFamily: 'monospace',
    } as const),
};
