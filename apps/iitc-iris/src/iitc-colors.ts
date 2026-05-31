export const IITC_TEAM_COLORS = {
  N: '#ff6600',
  R: '#0088ff',
  E: '#03dc03',
  M: '#ff0028',
} as const;

export const IITC_LEVEL_COLORS = ['#000000', '#fece5a', '#ffa630', '#ff7315', '#e40000', '#fd2992', '#eb26cd', '#c124e0', '#9627f4'] as const;

export const IITC_MOD_COLORS = {
  VERY_RARE: '#f781ff',
  RARE: '#b68bff',
  COMMON: '#49ebc3',
} as const;

export const IITC_RESONATOR_ENERGY = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000] as const;

export function getIitcLevelColor(level: number | undefined): string | undefined {
  if (level === undefined || !Number.isFinite(level)) return undefined;
  const normalized = Math.max(0, Math.min(8, Math.floor(level)));
  return IITC_LEVEL_COLORS[normalized];
}

export function getIitcRarityColor(rarity: string | undefined): string | undefined {
  if (!rarity) return undefined;
  return IITC_MOD_COLORS[rarity as keyof typeof IITC_MOD_COLORS];
}

export function getIitcItemColor(item: {level?: number; rarity?: string; type?: string}): string | undefined {
  if (item.level !== undefined) return getIitcLevelColor(item.level);
  return getIitcRarityColor(item.rarity);
}

export function formatIitcColorVars(color: string | undefined): string | undefined {
  return color ? `--iitc-iris-item-color: ${color};` : undefined;
}
