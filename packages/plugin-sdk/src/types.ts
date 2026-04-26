export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  defaultEnabled?: boolean;
  capabilities?: ('menu' | 'highlighter' | string)[];
}

export interface Portal {
  id: string;
  lat: number;
  lng: number;
  team: string;
  name?: string;
  level?: number;
  health?: number;
  resCount?: number;
}

export interface InventoryItemData {
  resource?: {
    resourceType: string;
    resourceRarity: string;
  };
  resourceWithLevels?: {
    resourceType: string;
    level: number;
  };
  modResource?: {
    displayName: string;
    stats: Record<string, string>;
    rarity: string;
    resourceType: string;
  };
  playerPowerupResource?: {
    playerPowerupEnum: string;
  };
  timedPowerupResource?: {
    multiplier: number;
    designation: string;
    multiplierE6: number;
  };
  flipCard?: {
    flipCardType: string;
  };
  container?: {
    currentCapacity: number;
    currentCount: number;
    stackableItems: {
      itemGuids: string[];
      exampleGameEntity: [string, number, InventoryItemData];
    }[];
  };
  moniker?: {
    differentiator: string;
  };
  portalCoupler?: {
    portalGuid: string;
    portalLocation: string;
    portalImageUrl: string;
    portalTitle: string;
    portalAddress: string;
  };
  inInventory?: {
    playerId: string;
    acquisitionTimestampMs: string;
  };
}

export interface InventoryItem extends InventoryItemData {
  guid: string;
  timestamp: number;
}

export interface Link {
  id: string;
  team: string;
  fromPortalId: string;
  fromLat: number;
  fromLng: number;
  toPortalId: string;
  toLat: number;
  toLng: number;
}

export interface Field {
  id: string;
  team: string;
  points: { portalId?: string; lat: number; lng: number }[];
}

export interface PlextMarkupData {
  plain?: string;
  team?: string;
  name?: string;
  address?: string;
  latE6?: number;
  lngE6?: number;
}

export interface Plext {
  id: string;
  time: number;
  text: string;
  markup: [string, PlextMarkupData][];
  categories: number;
  team: string;
}

export interface IRIS_API {
  portals: {
    getAll: () => Record<string, Portal>;
    subscribe: (callback: (portals: Record<string, Portal>) => void) => () => void;
  };
  links: {
    getAll: () => Record<string, Link>;
    subscribe: (callback: (links: Record<string, Link>) => void) => () => void;
  };
  fields: {
    getAll: () => Record<string, Field>;
    subscribe: (callback: (fields: Record<string, Field>) => void) => () => void;
  };
  plexts: {
    subscribe: (callback: (plexts: Plext[]) => void) => () => void;
  };
  inventory: {
    getAll: () => InventoryItem[];
    subscribe: (callback: (inventory: InventoryItem[]) => void) => () => void;
  };
  map: {
    getCenter: () => { lat: number; lng: number };
    getZoom: () => number;
    setFeatures: (features: GeoJSON.Feature[]) => void;
  };
  ui: {
    addStatsItem: (id: string, label: string, value: string | (() => string)) => void;
    removeStatsItem: (id: string) => void;
    addMenuItem: (id: string, label: string, onClick: () => void) => void;
    removeMenuItem: (id: string) => void;
    setTheme: (id: string) => void;
    getTheme: () => string;
    getThemeColors: () => { E: string; R: string; M: string; N: string };
  };
  utils: {
    normalizeTeam: (team: string | undefined) => string;
  };
}

export interface IRISPlugin {
  manifest: PluginManifest;
  setup: (api: IRIS_API) => void | Promise<void>;
  teardown?: (api: IRIS_API) => void | Promise<void>;
}
