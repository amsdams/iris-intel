export const INGRESS_TEAM_COLORS = {
  E: '#03DC03',
  R: '#0088FF',
  M: '#FF1010',
  N: '#666666',
} as const;

export const INGRESS_NEUTRAL_PORTAL_COLORS = {
  fill: INGRESS_TEAM_COLORS.N,
  stroke: '#FFFFFF',
} as const;

export const INGRESS_MISC_COLORS = {
  AQUA: '#D1FFFF',
  XM: '#00D9FF',
  KEY: '#D1FFFF',
  TRACKER: '#F781FF',
  ARTIFACT: '#FF00FF',
  ORNAMENT: '#FFCE00',
  AEGIS_SHIELD: '#00D4AA',
} as const;

export const INGRESS_LEVEL_COLORS = {
  1: '#FECE5A',
  2: '#FFA630',
  3: '#FF7315',
  4: '#E80000',
  5: '#FF0099',
  6: '#EE26CD',
  7: '#C124E0',
  8: '#9627F4',
} as const;

export const INGRESS_ITEM_RARITY_COLORS = {
  VERY_COMMON: '#FFFFFF',
  COMMON: '#8CFFBF',
  RARE: '#73A8FF',
  VERY_RARE: '#B08CFF',
  EXTREMELY_RARE: '#FF0000',
  SPECIAL: '#D1FFFF',
} as const;

export const INGRESS_MOD_RARITY_COLORS = {
  COMMON: '#49EBC3',
  RARE: '#B68BFF',
  VERY_RARE: '#F781FF',
} as const;

export const INGRESS_ITEM_TYPE_COLORS = {
  PORTAL_LINK_KEY: INGRESS_MISC_COLORS.KEY,
  MEDIA: INGRESS_ITEM_RARITY_COLORS.VERY_COMMON,
  CAPSULE: INGRESS_ITEM_RARITY_COLORS.RARE,
  KINETIC_CAPSULE: INGRESS_ITEM_RARITY_COLORS.COMMON,
  VIRUS: INGRESS_ITEM_RARITY_COLORS.VERY_RARE,
  POWERUP: INGRESS_ITEM_RARITY_COLORS.VERY_COMMON,
  AEGIS_SHIELD: INGRESS_MISC_COLORS.AEGIS_SHIELD,
} as const;

export const INGRESS_PORTAL_HISTORY_COLORS = {
  visited: '#B56DFF',
  captured: '#FF8A3D',
  scanned: INGRESS_MISC_COLORS.XM,
} as const;

export const INGRESS_HEALTH_COLORS = {
  high: '#00FF00',
  medium: '#FFFF00',
  warning: '#FF9900',
  low: '#FF0000',
  critical: '#FF00FF',
} as const;

export const INGRESS_ENTITY_STYLE = {
  fieldFillOpacity: 0.3,
  fieldAntialias: false,
  linkWidth: 2,
  linkOpacity: 1,
  portalBaseOpacity: 0.7,
  portalMinHealthOpacity: 0.1,
  portalStrokeWidth: 1.5,
  portalRadiusStops: [
    {zoom: 3, radius: 1},
    {zoom: 10, radius: 2},
    {zoom: 15, radius: 6},
  ],
} as const;
