import { InventoryItem } from '../store';
import { InventoryData } from './intel-types';

interface ParseOptions {
  onError?: (error: unknown) => void;
}

export type InventoryCategory = 'ALL' | 'WEAPONS' | 'RESONATORS' | 'MODS' | 'POWERUPS' | 'CAPSULES' | 'KEYS';
export type InventorySortMode = 'COUNT' | 'NAME' | 'RARITY';

export interface DerivedInventoryItem {
  guid: string;
  timestamp: number;
  type: string;
  name: string;
  category: Exclude<InventoryCategory, 'ALL'>;
  level?: number;
  rarity?: string;
  moniker?: string;
}

export interface GroupedInventoryItem {
  type: string;
  name: string;
  level?: number;
  rarity?: string;
  count: number;
  category: Exclude<InventoryCategory, 'ALL'>;
  moniker?: string;
}

export interface PortalKeyCounts {
  total: number;
  loose: number;
  capsule: number;
}

export const INVENTORY_CATEGORIES: InventoryCategory[] = ['ALL', 'WEAPONS', 'RESONATORS', 'MODS', 'POWERUPS', 'CAPSULES', 'KEYS'];

const RARITY_SORT_ORDER: Record<string, number> = {
  VERY_RARE: 4,
  RARE: 3,
  COMMON: 2,
  VERY_COMMON: 1,
};

const INTEL_ITEM_LABELS: Record<string, string> = {
  BOOSTED_POWER_CUBE: 'Hypercube',
  BOOSTED_POWER_CUBE_K: 'Hypercube',
  CAPSULE: 'Capsule',
  DRONE: 'Drone',
  EMITTER_A: 'Resonator',
  EMP_BURSTER: 'Xmp Burster',
  EXTRA_SHIELD: 'Aegis Shield',
  'FLIP_CARD:ADA': 'ADA Refactor',
  'FLIP_CARD:JARVIS': 'JARVIS Virus',
  FLIP_CARD: 'Alignment Virus',
  FORCE_AMP: 'Force Amp',
  HEATSINK: 'Heat Sink',
  INTEREST_CAPSULE: 'Quantum Capsule',
  KEY_CAPSULE: 'Key Capsule',
  KINETIC_CAPSULE: 'Kinetic Capsule',
  LINK_AMPLIFIER: 'Link Amp',
  MEDIA: 'Media',
  MULTIHACK: 'Multi-hack',
  MYSTERIOUS_ITEM_PLACEHOLDER: 'Mysterious item',
  PLAYER_POWERUP: 'Player Powerup',
  'PLAYER_POWERUP:APEX': 'Apex Mod',
  PORTAL_LINK_KEY: 'Portal Key',
  PORTAL_POWERUP: 'Portal Powerup',
  'PORTAL_POWERUP:AEGISNOVA': 'Beacon - Aegis Nova',
  'PORTAL_POWERUP:BB_BATTLE': 'Very Rare Battle Beacon',
  'PORTAL_POWERUP:BB_BATTLE_RARE': 'Rare Battle Beacon',
  'PORTAL_POWERUP:BN_BLM': 'Beacon - Black Lives Matter',
  'PORTAL_POWERUP:BN_MHN_LOGO': 'Beacon - Monster Hunter Now Logo',
  'PORTAL_POWERUP:BN_MHN_PALICO': 'Beacon - Monster Hunter Now Palico',
  'PORTAL_POWERUP:BN_PEACE': 'Beacon - Peace',
  'PORTAL_POWERUP:ENL': 'Beacon - ENL',
  'PORTAL_POWERUP:EXO5': 'Beacon - EXO5',
  'PORTAL_POWERUP:FRACK': 'Portal Fracker',
  'PORTAL_POWERUP:FW_ENL': 'Enlightened Fireworks',
  'PORTAL_POWERUP:FW_RES': 'Resistance Fireworks',
  'PORTAL_POWERUP:INITIO': 'Beacon - Initio',
  'PORTAL_POWERUP:LOOK': 'Beacon - Target',
  'PORTAL_POWERUP:MAGNUSRE': 'Beacon - Reawakens',
  'PORTAL_POWERUP:MEET': 'Beacon - Meetup',
  'PORTAL_POWERUP:NEMESIS': 'Beacon - Nemesis',
  'PORTAL_POWERUP:NIA': 'Beacon - Niantic',
  'PORTAL_POWERUP:OBSIDIAN': 'Beacon - Obsidian',
  'PORTAL_POWERUP:RES': 'Beacon - RES',
  'PORTAL_POWERUP:TOASTY': 'Beacon - Toast!',
  'PORTAL_POWERUP:VIALUX': 'Beacon - Via Lux',
  'PORTAL_POWERUP:VIANOIR': 'Beacon - Via Noir',
  POWER_CUBE: 'Power Cube',
  RES_SHIELD: 'Portal Shield',
  TRANSMUTER_ATTACK: 'Ito En Transmuter (-)',
  TRANSMUTER_DEFENSE: 'Ito En Transmuter (+)',
  TURRET: 'Turret',
  ULTRA_LINK_AMP: 'Ultra Link',
  ULTRA_STRIKE: 'Ultra Strike',
};

function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getIntelLabel(key: string): string {
  return INTEL_ITEM_LABELS[key] || humanizeEnum(key);
}

function getTimedPowerupLabel(designation: string, rarity?: string): string {
  if (designation === 'BB_BATTLE' && rarity === 'RARE') {
    return getIntelLabel('PORTAL_POWERUP:BB_BATTLE_RARE');
  }

  return getIntelLabel(`PORTAL_POWERUP:${designation}`);
}

function getPlayerPowerupLabel(playerPowerupEnum: string): string {
  return getIntelLabel(`PLAYER_POWERUP:${playerPowerupEnum}`);
}

function getCategoryForResourceType(resourceType: string): Exclude<InventoryCategory, 'ALL'> {
  switch (resourceType) {
    case 'EMITTER_A':
      return 'RESONATORS';
    case 'POWER_CUBE':
    case 'BOOSTED_POWER_CUBE':
    case 'DRONE':
      return 'POWERUPS';
    default:
      return 'WEAPONS';
  }
}

export const InventoryParser = {
  parse: (data: InventoryData, options?: ParseOptions): InventoryItem[] => {
    if (!data.result) return [];

    try {
      return data.result.map((item) => {
        const [guid, timestamp, itemData] = item;
        return {
          guid,
          timestamp,
          ...(itemData as object),
        } as InventoryItem;
      });
    } catch (error) {
      options?.onError?.(error);
      console.error('IRIS: Error parsing inventory', error, data);
      return [];
    }
  },

  deriveInventoryDisplayItem: (item: InventoryItem): DerivedInventoryItem | null => {
    if (item.resourceWithLevels) {
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: item.resourceWithLevels.resourceType,
        level: item.resourceWithLevels.level,
        name: getIntelLabel(item.resourceWithLevels.resourceType),
        rarity: item.resource?.resourceRarity,
        category: getCategoryForResourceType(item.resourceWithLevels.resourceType),
      };
    }

    if (item.modResource) {
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: item.modResource.resourceType,
        name: getIntelLabel(item.modResource.resourceType),
        rarity: item.modResource.rarity,
        category: 'MODS',
      };
    }

    if (item.portalCoupler) {
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: 'PORTAL_LINK_KEY',
        name: item.portalCoupler.portalTitle,
        rarity: item.resource?.resourceRarity,
        category: 'KEYS',
      };
    }

    if (item.playerPowerupResource) {
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: item.playerPowerupResource.playerPowerupEnum,
        name: getPlayerPowerupLabel(item.playerPowerupResource.playerPowerupEnum),
        rarity: item.resource?.resourceRarity,
        category: 'POWERUPS',
      };
    }

    if (item.timedPowerupResource) {
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: item.timedPowerupResource.designation,
        name: getTimedPowerupLabel(item.timedPowerupResource.designation, item.resource?.resourceRarity),
        rarity: item.resource?.resourceRarity,
        category: 'POWERUPS',
      };
    }

    if (item.flipCard) {
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: item.flipCard.flipCardType,
        name: getIntelLabel(`FLIP_CARD:${item.flipCard.flipCardType}`),
        category: 'WEAPONS',
      };
    }

    if (item.container) {
      const capsuleType = item.resource?.resourceType || 'CAPSULE';
      return {
        guid: item.guid,
        timestamp: item.timestamp,
        type: capsuleType,
        name: getIntelLabel(capsuleType),
        rarity: item.resource?.resourceRarity,
        moniker: item.moniker?.differentiator,
        category: 'CAPSULES',
      };
    }

    if (item.resource) {
      switch (item.resource.resourceType) {
        case 'BOOSTED_POWER_CUBE':
        case 'DRONE':
          return {
            guid: item.guid,
            timestamp: item.timestamp,
            type: item.resource.resourceType,
            name: getIntelLabel(item.resource.resourceType),
            rarity: item.resource.resourceRarity,
            category: 'POWERUPS',
          };
        default:
          return null;
      }
    }

    return null;
  },

  deriveInventoryDisplayItems: (items: InventoryItem[]): DerivedInventoryItem[] => {
    const deriveItemsFromItem = (
      item: InventoryItem,
      capsuleMoniker?: string,
    ): DerivedInventoryItem[] => {
      const derived = InventoryParser.deriveInventoryDisplayItem(item);
      const derivedItems: DerivedInventoryItem[] = derived
        ? [{
            ...derived,
            moniker: derived.category === 'CAPSULES' ? derived.moniker : (capsuleMoniker ?? derived.moniker),
          }]
        : [];

      if (!item.container) {
        return derivedItems;
      }

      const nestedCapsuleMoniker = item.moniker?.differentiator ?? capsuleMoniker;
      const nestedItems = item.container.stackableItems.flatMap((stackableItem) => {
        const [guid, timestamp, itemData] = stackableItem.exampleGameEntity;
        const nestedItem = {
          guid,
          timestamp,
          ...(itemData as object),
        } as InventoryItem;

        const expanded = deriveItemsFromItem(nestedItem, nestedCapsuleMoniker);
        return stackableItem.itemGuids.flatMap(() => expanded);
      });

      return [...derivedItems, ...nestedItems];
    };

    return items.flatMap((item) => deriveItemsFromItem(item));
  },

  groupInventoryDisplayItems: (
    items: DerivedInventoryItem[],
    sortMode: InventorySortMode = 'COUNT',
  ): GroupedInventoryItem[] => {
    const groups: Record<string, GroupedInventoryItem> = {};

    items.forEach((item) => {
      const key = `${item.type}-${item.level || ''}-${item.rarity || ''}-${item.name || ''}-${item.moniker || ''}`;
      if (!groups[key]) {
        groups[key] = {
          type: item.type,
          name: item.name,
          level: item.level,
          rarity: item.rarity,
          moniker: item.moniker,
          category: item.category,
          count: 0,
        };
      }
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => {
      if (sortMode === 'COUNT' && a.count !== b.count) return b.count - a.count;
      if (sortMode === 'RARITY') {
        const rarityDelta = (RARITY_SORT_ORDER[b.rarity || ''] || 0) - (RARITY_SORT_ORDER[a.rarity || ''] || 0);
        if (rarityDelta !== 0) return rarityDelta;
      }
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      if (a.level !== b.level) return (b.level || 0) - (a.level || 0);
      const monikerCompare = (a.moniker || '').localeCompare(b.moniker || '');
      if (monikerCompare !== 0) return monikerCompare;
      return a.category.localeCompare(b.category);
    });
  },

  deriveGroupedInventoryItems: (
    items: InventoryItem[],
    sortMode: InventorySortMode = 'COUNT',
  ): GroupedInventoryItem[] => {
    return InventoryParser.groupInventoryDisplayItems(InventoryParser.deriveInventoryDisplayItems(items), sortMode);
  },

  countInventoryCategories: (items: DerivedInventoryItem[]): Record<InventoryCategory, number> => {
    const counts: Record<InventoryCategory, number> = {
      ALL: items.length,
      WEAPONS: 0,
      RESONATORS: 0,
      MODS: 0,
      POWERUPS: 0,
      CAPSULES: 0,
      KEYS: 0,
    };

    items.forEach((item) => {
      counts[item.category] += 1;
    });

    return counts;
  },

  filterGroupedInventoryItems: (
    items: GroupedInventoryItem[],
    category: InventoryCategory = 'ALL',
    searchText = '',
  ): GroupedInventoryItem[] => {
    const categoryFiltered = category === 'ALL'
      ? items
      : items.filter((item) => item.category === category);
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) return categoryFiltered;

    return categoryFiltered.filter((item) => {
      const haystack = `${item.name} ${item.rarity || ''} ${item.moniker || ''} ${item.level ? `L${item.level}` : ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  },

  countPortalKeysDetailed: (items: InventoryItem[], portalId: string): PortalKeyCounts => {
    const countInItem = (item: InventoryItem, pid: string, inCapsule: boolean): PortalKeyCounts => {
      if (item.portalCoupler?.portalGuid === pid) {
        return {
          total: 1,
          loose: inCapsule ? 0 : 1,
          capsule: inCapsule ? 1 : 0,
        };
      }

      if (!item.container) {
        return { total: 0, loose: 0, capsule: 0 };
      }

      return item.container.stackableItems.reduce((sum, stackableItem) => {
        const [guid, timestamp, itemData] = stackableItem.exampleGameEntity;
        const nestedItem = {
          guid,
          timestamp,
          ...(itemData as object),
        } as InventoryItem;

        const nestedCount = countInItem(nestedItem, pid, true);
        const multiplier = stackableItem.itemGuids.length;
        return {
          total: sum.total + nestedCount.total * multiplier,
          loose: sum.loose + nestedCount.loose * multiplier,
          capsule: sum.capsule + nestedCount.capsule * multiplier,
        };
      }, { total: 0, loose: 0, capsule: 0 });
    };

    return items.reduce((sum, item) => {
      const count = countInItem(item, portalId, false);
      return {
        total: sum.total + count.total,
        loose: sum.loose + count.loose,
        capsule: sum.capsule + count.capsule,
      };
    }, { total: 0, loose: 0, capsule: 0 });
  },

  aggregatePortalKeys: (items: InventoryItem[]): Record<string, PortalKeyCounts> => {
    const addCounts = (target: Record<string, PortalKeyCounts>, portalId: string, loose: number, capsule: number): void => {
      const current = target[portalId] ?? { total: 0, loose: 0, capsule: 0 };
      current.loose += loose;
      current.capsule += capsule;
      current.total += loose + capsule;
      target[portalId] = current;
    };

    const countItem = (item: InventoryItem, target: Record<string, PortalKeyCounts>, inCapsule: boolean, multiplier = 1): void => {
      const portalId = item.portalCoupler?.portalGuid;
      if (portalId) {
        addCounts(target, portalId, inCapsule ? 0 : multiplier, inCapsule ? multiplier : 0);
      }

      if (!item.container) {
        return;
      }

      item.container.stackableItems.forEach((stackableItem) => {
        const [guid, timestamp, itemData] = stackableItem.exampleGameEntity;
        const nestedItem = {
          guid,
          timestamp,
          ...(itemData as object),
        } as InventoryItem;

        countItem(nestedItem, target, true, stackableItem.itemGuids.length);
      });
    };

    const counts: Record<string, PortalKeyCounts> = {};
    items.forEach((item) => countItem(item, counts, false));
    return counts;
  },

  countPortalKeys: (items: InventoryItem[], portalId: string): number => {
    return InventoryParser.countPortalKeysDetailed(items, portalId).total;
  }
};
