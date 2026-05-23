import {
    INGRESS_HEALTH_COLORS,
    INGRESS_ITEM_RARITY_COLORS,
    INGRESS_ITEM_TYPE_COLORS,
    INGRESS_LEVEL_COLORS,
    INGRESS_MISC_COLORS,
    INGRESS_MOD_RARITY_COLORS,
    INGRESS_PORTAL_HISTORY_COLORS,
    INGRESS_TEAM_COLORS,
} from '@iris/core/ingress-map-style';

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

type ThemeVariantOverrides = Partial<Omit<ThemeColors, 'LEVELS' | 'ITEM_RARITY' | 'MOD_RARITY' | 'ITEM_TYPES' | 'RARITY'>> & {
    LEVELS?: Record<number, string>;
    ITEM_RARITY?: Record<string, string>;
    MOD_RARITY?: Record<string, string>;
    ITEM_TYPES?: Record<string, string>;
    RARITY?: Record<string, string>;
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

const INTEL_DEFAULT_THEME: ThemeColors = {
    E: INGRESS_TEAM_COLORS.E,
    R: INGRESS_TEAM_COLORS.R,
    M: INGRESS_TEAM_COLORS.M,
    N: INGRESS_TEAM_COLORS.N,
    AQUA: INGRESS_MISC_COLORS.AQUA,
    LEVELS: {...INGRESS_LEVEL_COLORS},
    ITEM_RARITY: {...INGRESS_ITEM_RARITY_COLORS},
    MOD_RARITY: {...INGRESS_MOD_RARITY_COLORS},
    ITEM_TYPES: {...INGRESS_ITEM_TYPE_COLORS},
    RARITY: {...INGRESS_ITEM_RARITY_COLORS},
};

function createThemeVariant(base: ThemeColors, overrides: ThemeVariantOverrides): ThemeColors {
    const itemRarity = {
        ...base.ITEM_RARITY,
        ...overrides.ITEM_RARITY,
    };

    return {
        ...base,
        ...overrides,
        LEVELS: {
            ...base.LEVELS,
            ...overrides.LEVELS,
        },
        ITEM_RARITY: itemRarity,
        MOD_RARITY: {
            ...base.MOD_RARITY,
            ...overrides.MOD_RARITY,
        },
        ITEM_TYPES: {
            ...base.ITEM_TYPES,
            ...overrides.ITEM_TYPES,
        },
        RARITY: overrides.RARITY
            ? {
                ...base.RARITY,
                ...overrides.RARITY,
            }
            : itemRarity,
    };
}

export const THEMES: Record<string, ThemeColors> = {
    INGRESS: INTEL_DEFAULT_THEME,
    DEBUG: createThemeVariant(INTEL_DEFAULT_THEME, {
        E: '#00ff00',
        R: '#0000ff',
        M: '#ff0000',
        N: '#ffffff',
        AQUA: '#00ffff',
        ITEM_TYPES: {
            PORTAL_LINK_KEY: '#00ffff',
        },
    }),
    CYBER: createThemeVariant(INTEL_DEFAULT_THEME, {
        E: '#00ffa3',
        R: '#00e5ff',
        M: '#ff0055',
        N: '#e0e0e0',
        AQUA: '#00e5ff',
        ITEM_RARITY: CYBER_ITEM_RARITY,
        MOD_RARITY: {
            VERY_RARE: '#FF00FF',
            RARE: '#00AAFF',
            COMMON: '#00FF00',
        },
        ITEM_TYPES: {
            PORTAL_LINK_KEY: '#00e5ff',
            POWERUP: '#00e5ff',
            AEGIS_SHIELD: INGRESS_MISC_COLORS.AEGIS_SHIELD,
        },
    }),
    SOFTER: createThemeVariant(INTEL_DEFAULT_THEME, {
        E: '#78f400',
        R: '#4fc3f7',
        M: '#ff5252',
        N: '#cfd8dc',
        AQUA: '#4dd0e1',
        ITEM_RARITY: SOFTER_ITEM_RARITY,
        MOD_RARITY: {
            VERY_RARE: '#CE93D8',
            RARE: '#90CAF9',
            COMMON: '#A5D6A7',
        },
        ITEM_TYPES: {
            PORTAL_LINK_KEY: '#4dd0e1',
            POWERUP: '#4dd0e1',
            AEGIS_SHIELD: INGRESS_MISC_COLORS.AEGIS_SHIELD,
        },
    }),
};

export function getItemRarityColor(theme: ThemeColors, rarity?: string): string {
    if (!rarity) return UI_COLORS.TEXT_BASE;
    return theme.ITEM_RARITY[rarity.toUpperCase()] || UI_COLORS.TEXT_BASE;
}

export function getModRarityColor(theme: ThemeColors, rarity?: string, name?: string, type?: string): string {
    const isAegis = type === 'EXTRA_SHIELD' || (name && name.toLowerCase().includes('aegis'));
    if (isAegis) return theme.ITEM_TYPES.AEGIS_SHIELD || INGRESS_MISC_COLORS.AEGIS_SHIELD;
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
    HISTORY_VISITED: INGRESS_PORTAL_HISTORY_COLORS.visited,
    HISTORY_CAPTURED: INGRESS_PORTAL_HISTORY_COLORS.captured,
    HISTORY_SCANNED: INGRESS_PORTAL_HISTORY_COLORS.scanned,
    MISSION: '#EF8E2E',
    ARTIFACT: INGRESS_MISC_COLORS.ARTIFACT,
    ORNAMENT: INGRESS_MISC_COLORS.ORNAMENT,
    HEALTH_HIGH: INGRESS_HEALTH_COLORS.high,
    HEALTH_MEDIUM: INGRESS_HEALTH_COLORS.medium,
    HEALTH_LOW: INGRESS_HEALTH_COLORS.low,
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
