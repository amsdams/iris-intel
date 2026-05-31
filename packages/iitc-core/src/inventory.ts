export interface IitcInventoryResource {
  resourceType?: string;
  resourceRarity?: string;
}

export interface IitcInventoryItemData {
  resource?: IitcInventoryResource;
  resourceWithLevels?: {
    resourceType?: string;
    level?: number;
  };
  modResource?: {
    resourceType?: string;
    displayName?: string;
    rarity?: string;
    stats?: Record<string, string>;
  };
  timedPowerupResource?: {
    designation?: string;
    multiplier?: number;
    multiplierE6?: number;
  };
  playerPowerupResource?: {
    playerPowerupEnum?: string;
  };
  flipCard?: {
    flipCardType?: string;
  };
  portalCoupler?: {
    portalGuid?: string;
    portalLocation?: string;
    portalImageUrl?: string;
    portalTitle?: string;
    portalAddress?: string;
  };
  container?: {
    currentCapacity?: number;
    currentCount?: number;
    stackableItems?: IitcInventoryStackableItem[];
  };
  moniker?: {
    differentiator?: string;
  };
}

export type IitcInventoryRawItem = [string, number, IitcInventoryItemData];

export interface IitcInventoryStackableItem {
  itemGuids: string[];
  exampleGameEntity: IitcInventoryRawItem;
}

export interface IitcInventoryResponse {
  result?: IitcInventoryRawItem[];
  error?: string;
}

export interface IitcInventoryItemCount {
  key: string;
  type: string;
  label: string;
  count: number;
  level?: number;
  rarity?: string;
  capsules: string[];
  capsuleCounts: Record<string, number>;
}

export interface IitcInventoryKeyCount {
  portalGuid: string;
  portalTitle?: string;
  portalAddress?: string;
  portalLocation?: string;
  count: number;
  capsules: string[];
  capsuleCounts: Record<string, number>;
}

export interface IitcInventoryCapsuleCount {
  id: string;
  type: string;
  count: number;
  items: number;
  keys: number;
}

export interface IitcInventorySummary {
  rawItems: number;
  totalItems: number;
  itemCounts: IitcInventoryItemCount[];
  keyCounts: IitcInventoryKeyCount[];
  capsuleCounts: IitcInventoryCapsuleCount[];
}

const INVENTORY_LABELS: Record<string, string> = {
  BOOSTED_POWER_CUBE: 'Hypercube',
  CAPSULE: 'Capsule',
  DRONE: 'Drone',
  EMITTER_A: 'Resonator',
  EMP_BURSTER: 'XMP',
  EXTRA_SHIELD: 'Aegis Shield',
  FLIP_CARD: 'Virus',
  FORCE_AMP: 'Force Amp',
  HEATSINK: 'Heat Sink',
  INTEREST_CAPSULE: 'Quantum Capsule',
  KEY_CAPSULE: 'Key Capsule',
  KINETIC_CAPSULE: 'Kinetic Capsule',
  LINK_AMPLIFIER: 'Link Amp',
  MEDIA: 'Media',
  MULTIHACK: 'Multi-hack',
  PLAYER_POWERUP: 'Apex',
  PORTAL_LINK_KEY: 'Key',
  PORTAL_POWERUP: 'Powerup',
  POWER_CUBE: 'Power Cube',
  RES_SHIELD: 'Shield',
  TRANSMUTER_ATTACK: 'ITO -',
  TRANSMUTER_DEFENSE: 'ITO +',
  TURRET: 'Turret',
  ULTRA_LINK_AMP: 'Ultra Link',
  ULTRA_STRIKE: 'Ultra Strike',
};

function humanizeInventoryEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inventoryLabel(value: string | undefined): string {
  if (!value) return 'Unknown';
  return INVENTORY_LABELS[value] ?? humanizeInventoryEnum(value);
}

function isRawInventoryItem(value: unknown): value is IitcInventoryRawItem {
  return Array.isArray(value) && typeof value[0] === 'string' && typeof value[1] === 'number' && !!value[2] && typeof value[2] === 'object';
}

function getInventoryItemDescriptor(item: IitcInventoryRawItem): Omit<IitcInventoryItemCount, 'count' | 'capsules' | 'capsuleCounts'> | null {
  const data = item[2];

  if (data.resource?.resourceType === 'PORTAL_LINK_KEY') return null;

  if (data.resource && data.timedPowerupResource) {
    const resourceType = data.resource.resourceType ?? 'PORTAL_POWERUP';
    const designation = data.timedPowerupResource.designation ?? '';
    return {
      key: `${resourceType} ${designation}`,
      type: resourceType,
      label: `${inventoryLabel(resourceType)} ${inventoryLabel(designation)}`.trim(),
      rarity: data.resource.resourceRarity,
    };
  }

  if (data.resource && data.flipCard) {
    const resourceType = data.resource.resourceType ?? 'FLIP_CARD';
    const flipCardType = data.flipCard.flipCardType ?? '';
    return {
      key: `${resourceType} ${flipCardType}`,
      type: resourceType,
      label: `${inventoryLabel(resourceType)} ${flipCardType}`.trim(),
      rarity: data.resource.resourceRarity,
    };
  }

  if (data.resource) {
    const resourceType = data.resource.resourceType ?? 'UNKNOWN';
    return {
      key: `${resourceType} ${data.resource.resourceRarity ?? ''}`.trim(),
      type: resourceType,
      label: inventoryLabel(resourceType),
      rarity: data.resource.resourceRarity,
    };
  }

  if (data.resourceWithLevels) {
    const resourceType = data.resourceWithLevels.resourceType ?? 'UNKNOWN';
    const level = data.resourceWithLevels.level;
    return {
      key: `${resourceType} ${level ?? ''}`.trim(),
      type: resourceType,
      label: `${inventoryLabel(resourceType)} ${level ?? ''}`.trim(),
      level,
      rarity: 'COMMON',
    };
  }

  if (data.modResource) {
    const resourceType = data.modResource.resourceType ?? 'UNKNOWN_MOD';
    return {
      key: `${resourceType} ${data.modResource.rarity ?? ''}`.trim(),
      type: resourceType,
      label: inventoryLabel(resourceType),
      rarity: data.modResource.rarity,
    };
  }

  return null;
}

function addInventoryItemCount(
  item: IitcInventoryRawItem,
  countMap: Record<string, IitcInventoryItemCount>,
  increment: number,
  capsule?: string,
): void {
  const descriptor = getInventoryItemDescriptor(item);
  if (!descriptor) return;

  const current = countMap[descriptor.key] ?? {
    ...descriptor,
    count: 0,
    capsules: [],
    capsuleCounts: {},
  };

  current.count += increment;
  if (capsule) {
    if (!current.capsules.includes(capsule)) {
      current.capsules.push(capsule);
      current.capsuleCounts[capsule] = 0;
    }
    current.capsuleCounts[capsule] += increment;
  }
  countMap[descriptor.key] = current;
}

function addInventoryKeyCount(
  item: IitcInventoryRawItem,
  countMap: Record<string, IitcInventoryKeyCount>,
  increment: number,
  capsule?: string,
): void {
  const data = item[2];
  if (data.resource?.resourceType !== 'PORTAL_LINK_KEY' || !data.portalCoupler?.portalGuid) return;

  const portalGuid = data.portalCoupler.portalGuid;
  const current = countMap[portalGuid] ?? {
    portalGuid,
    portalTitle: data.portalCoupler.portalTitle,
    portalAddress: data.portalCoupler.portalAddress,
    portalLocation: data.portalCoupler.portalLocation,
    count: 0,
    capsules: [],
    capsuleCounts: {},
  };

  current.count += increment;
  if (capsule) {
    if (!current.capsules.includes(capsule)) {
      current.capsules.push(capsule);
      current.capsuleCounts[capsule] = 0;
    }
    current.capsuleCounts[capsule] += increment;
  }
  countMap[portalGuid] = current;
}

function addCapsuleCount(item: IitcInventoryRawItem, capsuleMap: Record<string, IitcInventoryCapsuleCount>): void {
  const data = item[2];
  if (!data.container || !data.moniker?.differentiator) return;

  const id = data.moniker.differentiator;
  let items = 0;
  let keys = 0;
  for (const stackableItem of data.container.stackableItems ?? []) {
    if (stackableItem.exampleGameEntity[2].resource?.resourceType === 'PORTAL_LINK_KEY') {
      keys += stackableItem.itemGuids.length;
    } else {
      items += stackableItem.itemGuids.length;
    }
  }

  capsuleMap[id] = {
    id,
    type: inventoryLabel(data.resource?.resourceType),
    count: data.container.currentCount ?? 0,
    items,
    keys,
  };
}

export function parseIitcInventoryResponse(response: unknown): IitcInventoryRawItem[] {
  if (!response || typeof response !== 'object') return [];
  const result = (response as IitcInventoryResponse).result;
  return Array.isArray(result) ? result.filter(isRawInventoryItem) : [];
}

export function summarizeIitcInventory(items: IitcInventoryRawItem[]): IitcInventorySummary {
  const itemMap: Record<string, IitcInventoryItemCount> = {};
  const keyMap: Record<string, IitcInventoryKeyCount> = {};
  const capsuleMap: Record<string, IitcInventoryCapsuleCount> = {};
  let totalItems = 0;

  for (const item of items) {
    totalItems += 1;
    addInventoryItemCount(item, itemMap, 1);
    addInventoryKeyCount(item, keyMap, 1);
    addCapsuleCount(item, capsuleMap);

    const capsule = item[2].moniker?.differentiator;
    for (const stackableItem of item[2].container?.stackableItems ?? []) {
      totalItems += stackableItem.itemGuids.length;
      addInventoryItemCount(stackableItem.exampleGameEntity, itemMap, stackableItem.itemGuids.length, capsule);
      addInventoryKeyCount(stackableItem.exampleGameEntity, keyMap, stackableItem.itemGuids.length, capsule);
    }
  }

  return {
    rawItems: items.length,
    totalItems,
    itemCounts: Object.values(itemMap).sort((a, b) => a.label.localeCompare(b.label)),
    keyCounts: Object.values(keyMap).sort((a, b) => (a.portalTitle ?? '').localeCompare(b.portalTitle ?? '')),
    capsuleCounts: Object.values(capsuleMap).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function getIitcInventoryPortalKeyCount(summary: IitcInventorySummary, portalGuid: string | undefined): IitcInventoryKeyCount | undefined {
  if (!portalGuid) return undefined;
  return summary.keyCounts.find((keyCount) => keyCount.portalGuid === portalGuid);
}
