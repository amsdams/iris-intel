export interface ThemeColors {
    E: string;
    R: string;
    M: string;
    N: string;
    AQUA: string;
    LEVELS: Record<number, string>;
    ITEM_RARITY: Record<string, string>;
    MOD_RARITY: Record<string, string>;
    ITEM_TYPES: Record<string, string>;
    // Backward compatibility alias; prefer ITEM_RARITY for new code.
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

const INGRESS_ITEM_RARITY = {
    COMMON: '#8CFFBF',
    RARE: '#73A8FF',
    VERY_RARE: '#B08CFF',
    EXTREMELY_RARE: '#FF0000',
    VERY_COMMON: '#FFFFFF',
    SPECIAL: '#D1FFFF',
};

const INGRESS_MOD_RARITY = {
    COMMON: '#49EBC3',
    RARE: '#B68BFF',
    VERY_RARE: '#F781FF',
};

const CYBER_ITEM_RARITY = {
    VERY_COMMON: '#FFFFFF',
    COMMON: '#00FF00',
    RARE: '#00AAFF',
    VERY_RARE: '#FF00FF',
    EXTREMELY_RARE: '#FF0000',
    SPECIAL: '#00E5FF',
};

const SOFTER_ITEM_RARITY = {
    VERY_COMMON: '#E0E0E0',
    COMMON: '#A5D6A7',
    RARE: '#90CAF9',
    VERY_RARE: '#CE93D8',
    EXTREMELY_RARE: '#EF9A9A',
    SPECIAL: '#80DEEA',
};

const DEFAULT_ITEM_TYPES = {
    PORTAL_LINK_KEY: '#D1FFFF',
    MEDIA: '#FFFFFF',
    CAPSULE: '#73A8FF',
    KINETIC_CAPSULE: '#8CFFBF',
    VIRUS: '#B08CFF',
    POWERUP: '#FFFFFF',
    AEGIS_SHIELD: '#00D4AA',
};

const INTEL_DEFAULT_THEME: ThemeColors = {
    E: '#03DC03',
    R: '#0088FF',
    M: '#FF1010',
    N: '#C0C0C0',
    AQUA: '#D1FFFF',
    LEVELS: INGRESS_LEVELS,
    ITEM_RARITY: INGRESS_ITEM_RARITY,
    MOD_RARITY: INGRESS_MOD_RARITY,
    ITEM_TYPES: DEFAULT_ITEM_TYPES,
    RARITY: INGRESS_ITEM_RARITY,
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
        ITEM_RARITY: INGRESS_ITEM_RARITY,
        MOD_RARITY: INGRESS_MOD_RARITY,
        ITEM_TYPES: {
            ...DEFAULT_ITEM_TYPES,
            PORTAL_LINK_KEY: '#00ffff',
        },
        RARITY: INGRESS_ITEM_RARITY,
    },
    CYBER: {
        E: '#00ffa3',
        R: '#00e5ff',
        M: '#ff0055',
        N: '#e0e0e0',
        AQUA: '#00e5ff',
        LEVELS: INGRESS_LEVELS,
        ITEM_RARITY: CYBER_ITEM_RARITY,
        MOD_RARITY: {
            VERY_RARE: '#FF00FF',
            RARE: '#00AAFF',
            COMMON: '#00FF00',
        },
        ITEM_TYPES: {
            ...DEFAULT_ITEM_TYPES,
            PORTAL_LINK_KEY: '#00e5ff',
            POWERUP: '#00e5ff',
            AEGIS_SHIELD: '#00D4AA',
        },
        RARITY: CYBER_ITEM_RARITY,
    },
    SOFTER: {
        E: '#78f400',
        R: '#4fc3f7',
        M: '#ff5252',
        N: '#cfd8dc',
        AQUA: '#4dd0e1',
        LEVELS: INGRESS_LEVELS,
        ITEM_RARITY: SOFTER_ITEM_RARITY,
        MOD_RARITY: {
            VERY_RARE: '#CE93D8',
            RARE: '#90CAF9',
            COMMON: '#A5D6A7',
        },
        ITEM_TYPES: {
            ...DEFAULT_ITEM_TYPES,
            PORTAL_LINK_KEY: '#4dd0e1',
            POWERUP: '#4dd0e1',
            AEGIS_SHIELD: '#00D4AA',
        },
        RARITY: SOFTER_ITEM_RARITY,
    },
};

export function getItemRarityColor(theme: ThemeColors, rarity?: string): string {
    if (!rarity) return UI_COLORS.TEXT_BASE;
    return theme.ITEM_RARITY[rarity.toUpperCase()] || UI_COLORS.TEXT_BASE;
}

export function getModRarityColor(theme: ThemeColors, rarity?: string, name?: string, type?: string): string {
    const isAegis = type === 'EXTRA_SHIELD' || (name && name.toLowerCase().includes('aegis'));
    if (isAegis) return theme.ITEM_TYPES.AEGIS_SHIELD || '#00D4AA';
    if (!rarity) return UI_COLORS.TEXT_BASE;
    return theme.MOD_RARITY[rarity.toUpperCase()] || UI_COLORS.TEXT_BASE;
}

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
