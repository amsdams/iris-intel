import { InventoryItem } from '@iris/core';
import { InventoryData } from './types';

export type InventoryCategory = 'ALL' | 'WEAPONS' | 'RESONATORS' | 'MODS' | 'POWERUPS' | 'CAPSULES' | 'KEYS';

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

export function parseInventory(data: InventoryData): InventoryItem[] {
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
    console.error('IRIS: Error parsing inventory', error, data);
    return [];
  }
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

export function deriveInventoryDisplayItem(item: InventoryItem): DerivedInventoryItem | null {
  if (item.resourceWithLevels) {
    return {
      guid: item.guid,
      timestamp: item.timestamp,
      type: item.resourceWithLevels.resourceType,
      level: item.resourceWithLevels.level,
      name: getIntelLabel(item.resourceWithLevels.resourceType),
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
      category: 'KEYS',
    };
  }

  if (item.playerPowerupResource) {
    return {
      guid: item.guid,
      timestamp: item.timestamp,
      type: item.playerPowerupResource.playerPowerupEnum,
      name: getPlayerPowerupLabel(item.playerPowerupResource.playerPowerupEnum),
      category: 'POWERUPS',
    };
  }

  if (item.timedPowerupResource) {
    return {
      guid: item.guid,
      timestamp: item.timestamp,
      type: item.timedPowerupResource.designation,
      name: getTimedPowerupLabel(item.timedPowerupResource.designation, item.resource?.resourceRarity),
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
}

function deriveInventoryDisplayItemsFromItem(
  item: InventoryItem,
  capsuleMoniker?: string,
): DerivedInventoryItem[] {
  const derived = deriveInventoryDisplayItem(item);
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

    const expanded = deriveInventoryDisplayItemsFromItem(nestedItem, nestedCapsuleMoniker);
    return stackableItem.itemGuids.flatMap(() => expanded);
  });

  return [...derivedItems, ...nestedItems];
}

export function deriveInventoryDisplayItems(items: InventoryItem[]): DerivedInventoryItem[] {
  return items.flatMap((item) => deriveInventoryDisplayItemsFromItem(item));
}

function countPortalKeysInItem(item: InventoryItem, portalId: string): number {
  if (item.portalCoupler?.portalGuid === portalId) {
    return 1;
  }

  if (!item.container) {
    return 0;
  }

  return item.container.stackableItems.reduce((sum, stackableItem) => {
    const [guid, timestamp, itemData] = stackableItem.exampleGameEntity;
    const nestedItem = {
      guid,
      timestamp,
      ...(itemData as object),
    } as InventoryItem;

    return sum + countPortalKeysInItem(nestedItem, portalId) * stackableItem.itemGuids.length;
  }, 0);
}

export function countPortalKeys(items: InventoryItem[], portalId: string): number {
  return items.reduce((sum, item) => sum + countPortalKeysInItem(item, portalId), 0);
}
