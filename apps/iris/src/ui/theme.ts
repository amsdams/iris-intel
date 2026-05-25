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
    HISTORY: Record<'visited' | 'captured' | 'scanned', string>;
    HEALTH: Record<'high' | 'medium' | 'warning' | 'low' | 'critical', string>;
    MISC: Record<'XM' | 'KEY' | 'TRACKER' | 'ARTIFACT' | 'ORNAMENT' | 'AEGIS_SHIELD' | 'MISSION' | 'NEUTRAL_STROKE', string>;
    LEVELS: Record<number, string>;
    ITEM_RARITY: Record<string, string>;
    MOD_RARITY: Record<string, string>;
    ITEM_TYPES: Record<string, string>;
    // Backward compatibility alias; prefer ITEM_RARITY for new code.
    RARITY: Record<string, string>;
}

type ThemeVariantOverrides = Partial<Omit<ThemeColors, 'HISTORY' | 'HEALTH' | 'MISC' | 'LEVELS' | 'ITEM_RARITY' | 'MOD_RARITY' | 'ITEM_TYPES' | 'RARITY'>> & {
    HISTORY?: Partial<ThemeColors['HISTORY']>;
    HEALTH?: Partial<ThemeColors['HEALTH']>;
    MISC?: Partial<ThemeColors['MISC']>;
    LEVELS?: Record<number, string>;
    ITEM_RARITY?: Record<string, string>;
    MOD_RARITY?: Record<string, string>;
    ITEM_TYPES?: Record<string, string>;
    RARITY?: Record<string, string>;
};

interface HslColor {
    h: number;
    s: number;
    l: number;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function parseHexColor(hex: string): {r: number; g: number; b: number} | null {
    const normalized = hex.trim().replace(/^#/, '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    };
}

function rgbToHsl({r, g, b}: {r: number; g: number; b: number}): HslColor {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;

    if (max === min) return {h: 0, s: 0, l: lightness};

    const delta = max - min;
    const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let hue: number;

    if (max === red) {
        hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
    } else if (max === green) {
        hue = ((blue - red) / delta + 2) / 6;
    } else {
        hue = ((red - green) / delta + 4) / 6;
    }

    return {h: hue * 360, s: saturation, l: lightness};
}

function hueToRgb(p: number, q: number, t: number): number {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
}

function hslToRgb({h, s, l}: HslColor): {r: number; g: number; b: number} {
    const hue = (((h % 360) + 360) % 360) / 360;

    if (s === 0) {
        const value = Math.round(l * 255);
        return {r: value, g: value, b: value};
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
        r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
        g: Math.round(hueToRgb(p, q, hue) * 255),
        b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
    };
}

function componentToHex(value: number): string {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase();
}

function rgbToHex({r, g, b}: {r: number; g: number; b: number}): string {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function transformHexColor(hex: string, transform: (hsl: HslColor) => HslColor): string {
    const rgb = parseHexColor(hex);
    if (!rgb) return hex;
    const hsl = transform(rgbToHsl(rgb));
    return rgbToHex(hslToRgb({
        h: hsl.h,
        s: clamp(hsl.s, 0, 1),
        l: clamp(hsl.l, 0, 1),
    }));
}

function transformPalette<T extends Record<string | number, string>>(palette: T, transform: (color: string) => string): T {
    return Object.fromEntries(
        Object.entries(palette).map(([key, value]) => [key, transform(value)])
    ) as T;
}

function relativeLuminance({r, g, b}: {r: number; g: number; b: number}): number {
    const channel = (value: number): number => {
        const normalized = value / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    return (0.2126 * channel(r)) + (0.7152 * channel(g)) + (0.0722 * channel(b));
}

export function getContrastRatio(foreground: string, background: string): number {
    const fg = parseHexColor(foreground);
    const bg = parseHexColor(background);
    if (!fg || !bg) return 0;

    const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
    const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
    return (lighter + 0.05) / (darker + 0.05);
}

export function toSofterColor(hex: string): string {
    return transformHexColor(hex, (hsl) => ({
        h: hsl.h,
        s: hsl.s * 0.52,
        l: clamp(hsl.l * 0.82 + 0.2, 0.48, 0.86),
    }));
}

export function toCyberColor(hex: string): string {
    return transformHexColor(hex, (hsl) => {
        const isWarm = hsl.h < 80 || hsl.h > 310;
        return {
            h: isWarm ? hsl.h : hsl.h + 8,
            s: clamp(hsl.s * 1.25 + 0.12, 0.7, 1),
            l: clamp(hsl.l * 1.05 + 0.03, 0.42, 0.68),
        };
    });
}

const INTEL_DEFAULT_THEME: ThemeColors = {
    E: INGRESS_TEAM_COLORS.E,
    R: INGRESS_TEAM_COLORS.R,
    M: INGRESS_TEAM_COLORS.M,
    N: INGRESS_TEAM_COLORS.N,
    AQUA: INGRESS_MISC_COLORS.AQUA,
    HISTORY: {...INGRESS_PORTAL_HISTORY_COLORS},
    HEALTH: {...INGRESS_HEALTH_COLORS},
    MISC: {
        ...INGRESS_MISC_COLORS,
        MISSION: '#EF8E2E',
        NEUTRAL_STROKE: '#FFFFFF',
    },
    LEVELS: {...INGRESS_LEVEL_COLORS},
    ITEM_RARITY: {...INGRESS_ITEM_RARITY_COLORS},
    MOD_RARITY: {...INGRESS_MOD_RARITY_COLORS},
    ITEM_TYPES: {...INGRESS_ITEM_TYPE_COLORS},
    RARITY: {...INGRESS_ITEM_RARITY_COLORS},
};

function createFormulaTheme(base: ThemeColors, transform: (color: string) => string, overrides: ThemeVariantOverrides = {}): ThemeColors {
    return createThemeVariant({
        ...base,
        E: transform(base.E),
        R: transform(base.R),
        M: transform(base.M),
        N: transform(base.N),
        AQUA: transform(base.AQUA),
        HISTORY: transformPalette(base.HISTORY, transform),
        HEALTH: transformPalette(base.HEALTH, transform),
        MISC: transformPalette(base.MISC, transform),
        LEVELS: transformPalette(base.LEVELS, transform),
        ITEM_RARITY: transformPalette(base.ITEM_RARITY, transform),
        MOD_RARITY: transformPalette(base.MOD_RARITY, transform),
        ITEM_TYPES: transformPalette(base.ITEM_TYPES, transform),
        RARITY: transformPalette(base.ITEM_RARITY, transform),
    }, overrides);
}

function createThemeVariant(base: ThemeColors, overrides: ThemeVariantOverrides): ThemeColors {
    const itemRarity = {
        ...base.ITEM_RARITY,
        ...overrides.ITEM_RARITY,
    };

    return {
        ...base,
        ...overrides,
        HISTORY: {
            ...base.HISTORY,
            ...overrides.HISTORY,
        },
        HEALTH: {
            ...base.HEALTH,
            ...overrides.HEALTH,
        },
        MISC: {
            ...base.MISC,
            ...overrides.MISC,
        },
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
        R: '#3399ff',
        M: '#ff0000',
        N: '#ffffff',
        AQUA: '#00ffff',
        HISTORY: {
            visited: '#ff00ff',
            captured: '#ffaa00',
            scanned: '#00ffff',
        },
        HEALTH: {
            high: '#00ff00',
            medium: '#ffff00',
            warning: '#ffaa00',
            low: '#ff3333',
            critical: '#ff00ff',
        },
        MISC: {
            XM: '#00ffff',
            KEY: '#00ffff',
            TRACKER: '#ff00ff',
            ARTIFACT: '#ff00ff',
            ORNAMENT: '#ffff00',
            AEGIS_SHIELD: '#00ffcc',
            MISSION: '#ffaa00',
            NEUTRAL_STROKE: '#ffffff',
        },
        ITEM_TYPES: {
            PORTAL_LINK_KEY: '#00ffff',
        },
    }),
    CYBER: createFormulaTheme(INTEL_DEFAULT_THEME, toCyberColor, {
        N: '#E0E0E0',
        MOD_RARITY: {
            VERY_RARE: '#FF00FF',
        },
        ITEM_TYPES: {
            PORTAL_LINK_KEY: '#00E5FF',
            POWERUP: '#00E5FF',
            AEGIS_SHIELD: INGRESS_MISC_COLORS.AEGIS_SHIELD,
        },
        MISC: {
            AEGIS_SHIELD: INGRESS_MISC_COLORS.AEGIS_SHIELD,
        },
    }),
    SOFTER: createFormulaTheme(INTEL_DEFAULT_THEME, toSofterColor, {
        N: '#CFD8DC',
        ITEM_TYPES: {
            PORTAL_LINK_KEY: '#4DD0E1',
            POWERUP: '#4DD0E1',
            AEGIS_SHIELD: INGRESS_MISC_COLORS.AEGIS_SHIELD,
        },
        MISC: {
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
    HISTORY_VISITED: INTEL_DEFAULT_THEME.HISTORY.visited,
    HISTORY_CAPTURED: INTEL_DEFAULT_THEME.HISTORY.captured,
    HISTORY_SCANNED: INTEL_DEFAULT_THEME.HISTORY.scanned,
    MISSION: INTEL_DEFAULT_THEME.MISC.MISSION,
    ARTIFACT: INTEL_DEFAULT_THEME.MISC.ARTIFACT,
    ORNAMENT: INTEL_DEFAULT_THEME.MISC.ORNAMENT,
    HEALTH_HIGH: INTEL_DEFAULT_THEME.HEALTH.high,
    HEALTH_MEDIUM: INTEL_DEFAULT_THEME.HEALTH.medium,
    HEALTH_LOW: INTEL_DEFAULT_THEME.HEALTH.low,
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
