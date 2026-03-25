export interface ThemeColors {
    E: string;
    R: string;
    M: string;
    N: string;
    AQUA: string;
    LEVELS: Record<number, string>;
    RARITY: Record<string, string>;
}

const DEFAULT_LEVELS = {
    1: '#FECE5A', 2: '#FFA630', 3: '#FF7315', 4: '#E80000',
    5: '#FF0099', 6: '#EE26CD', 7: '#C124E0', 8: '#9627F4',
};

const DEFAULT_RARITY = {
    COMMON: '#565656',
    RARE: '#1566E6',
    VERY_RARE: '#EF7B03',
    EXTREMELY_RARE: '#ff0000',
    AEGIS: '#00D4AA',
};

export const THEMES: Record<string, ThemeColors> = {
    DEFAULT: {
        E: '#00ff00', // Neon Green
        R: '#0000ff', // Pure Blue
        M: '#ff0000', // Red
        N: '#ffffff', // White
        AQUA: '#00ffff',
        LEVELS: DEFAULT_LEVELS,
        RARITY: DEFAULT_RARITY,
    },
    CYBER: {
        E: '#00ffa3', // Minty Green
        R: '#00e5ff', // Electric Blue
        M: '#ff0055', // Pinkish Red
        N: '#e0e0e0',
        AQUA: '#00e5ff',
        LEVELS: DEFAULT_LEVELS,
        RARITY: DEFAULT_RARITY,
    },
    SOFTER: {
        E: '#78f400', // Muted Lime
        R: '#4fc3f7', // Light Blue
        M: '#ff5252', // Soft Red
        N: '#cfd8dc',
        AQUA: '#4dd0e1',
        LEVELS: DEFAULT_LEVELS,
        RARITY: DEFAULT_RARITY,
    },
    INGRESS: {
        E: '#03DC03', // Enlightened Vivid Lime
        R: '#0088FF', // Resistance Bright Blue
        M: '#FF1010', // Machina Bright Red
        N: '#C0C0C0', // Neutral Silver
        AQUA: '#D1FFFF', // XM Primary Highlight
        LEVELS: {
            1: '#FECE5A', 2: '#FFA630', 3: '#FF7315', 4: '#E80000',
            5: '#FF0099', 6: '#EE26CD', 7: '#C124E0', 8: '#9627F4',
        },
        RARITY: {
            COMMON: '#8CFFBF',
            RARE: '#73A8FF',
            VERY_RARE: '#B08CFF',
            EXTREMELY_RARE: '#FF0000',
            AEGIS: '#00D4AA',
        }
    }
};

export const MAP_THEMES: Record<string, { name: string; url: string }> = {
    LIGHT: {
        name: 'Light (Carto)',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    },
    DARK: {
        name: 'Dark (Carto)',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
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
    TEXT_BASE: '#ffffff',
    TEXT_MUTED: '#aaaaaa',
    BORDER_DIM: '#333333',
    ERROR: '#ff5555',
    WARNING: '#ffaa00',
    SUCCESS: '#00ff00',
};

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
