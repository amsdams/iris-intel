interface InventoryItemDisplay {
  type: string;
  label: string;
  level?: number;
  rarity?: string;
}

const RARITY_BADGES: Record<string, string> = {
  VERY_COMMON: 'VC',
  COMMON: 'C',
  RARE: 'R',
  VERY_RARE: 'VR',
};

export function formatInventoryItemLabel(item: InventoryItemDisplay): string {
  let label = item.type === 'EMP_BURSTER' ? 'XMP Burster' : item.label;
  if (item.level === undefined || !Number.isFinite(item.level)) return label;

  // The level has its own badge; strip it from core-provided labels.
  for (const suffix of [` L${item.level}`, ` ${item.level}`]) {
    if (label.endsWith(suffix)) {
      label = label.slice(0, -suffix.length);
      break;
    }
  }
  return label;
}

export function formatInventoryRarity(rarity: string | undefined): {badge: string; label: string} {
  return {
    badge: rarity ? RARITY_BADGES[rarity] ?? '?' : '?',
    label: rarity
      ? rarity.toLowerCase().replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
      : 'Rarity unavailable',
  };
}
