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

function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getResourceLabel(resourceType: string, level?: number): string {
  switch (resourceType) {
    case 'EMITTER_A':
      return 'Resonator';
    case 'EMP_BURSTER':
      return 'XMP Burster';
    case 'ULTRA_STRIKE':
      return 'Ultra Strike';
    case 'POWER_CUBE':
      return 'Power Cube';
    case 'BOOSTED_POWER_CUBE':
      return level ? 'Hypercube' : 'Hypercube';
    case 'DRONE':
      return 'Drone';
    case 'CAPSULE':
      return 'Capsule';
    case 'INTEREST_CAPSULE':
      return 'Quantum Capsule';
    case 'KEY_CAPSULE':
      return 'Key Locker';
    case 'KINETIC_CAPSULE':
      return 'Kinetic Capsule';
    default:
      return humanizeEnum(resourceType);
  }
}

function getTimedPowerupLabel(designation: string): string {
  switch (designation) {
    case 'FRACK':
      return 'Portal Fracker';
    case 'BB_BATTLE':
      return 'Battle Beacon';
    default:
      return humanizeEnum(designation);
  }
}

function getPlayerPowerupLabel(playerPowerupEnum: string): string {
  switch (playerPowerupEnum) {
    case 'APEX':
      return 'Apex';
    default:
      return humanizeEnum(playerPowerupEnum);
  }
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
      name: getResourceLabel(item.resourceWithLevels.resourceType, item.resourceWithLevels.level),
      category: getCategoryForResourceType(item.resourceWithLevels.resourceType),
    };
  }

  if (item.modResource) {
    return {
      guid: item.guid,
      timestamp: item.timestamp,
      type: item.modResource.resourceType,
      name: item.modResource.displayName,
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
      name: getTimedPowerupLabel(item.timedPowerupResource.designation),
      category: 'POWERUPS',
    };
  }

  if (item.flipCard) {
    return {
      guid: item.guid,
      timestamp: item.timestamp,
      type: item.flipCard.flipCardType,
      name: item.flipCard.flipCardType === 'ADA' ? 'ADA Refactor' : item.flipCard.flipCardType === 'JARVIS' ? 'JARVIS Virus' : humanizeEnum(item.flipCard.flipCardType),
      category: 'WEAPONS',
    };
  }

  if (item.container) {
    const capsuleType = item.resource?.resourceType || 'CAPSULE';
    return {
      guid: item.guid,
      timestamp: item.timestamp,
      type: capsuleType,
      name: getResourceLabel(capsuleType),
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
          name: getResourceLabel(item.resource.resourceType),
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
