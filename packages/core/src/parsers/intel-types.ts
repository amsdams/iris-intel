export type IntelTeam = 'ENLIGHTENED' | 'RESISTANCE' | 'NEUTRAL' | 'ALIENS' | 'R' | 'E' | 'M' | 'N';

export type IntelEntityData = 
  | [ 'p', string, number, number, number, number, number, string, string, string[], boolean, boolean, string, string, number, number, string, string, number ] // Portal
  | [ 'e', string, string, number, number, string, number, number ] // Link
  | [ 'r', string, [string, number, number][] ]; // Field

export interface IntelTile {
  deletedGameEntityGuids?: string[];
  gameEntities?: [string, number, IntelEntityData][];
}

export interface IntelMapData {
  result?: {
    map?: Record<string, IntelTile>;
  };
}

export interface IntelInventoryItemData {
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
          exampleGameEntity: [string, number, IntelInventoryItemData];
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

export interface InventoryData {
  result?: [string, number, IntelInventoryItemData][];
}

export interface PortalDetailsData {
  result?: [
    'p',
    string,
    number,
    number,
    number,
    number,
    number,
    string,
    string,
    string[],
    boolean,
    boolean,
    string,
    string,
    [string, string, string, Record<string, string>][], // mods
    [string, number, number][], // resonators
    string,
    string,
    number
  ];
}

export interface ArtifactData {
  result?: [string, number, [string, string[]]][];
}

export interface GameScoreData {
  result?: [number, number];
}

export interface TopMissionsInBoundsData {
  result?: [string, string, string, number, number][];
}

export interface MissionDetailsData {
  result?: [
    string, // id
    string, // title
    string, // description
    string, // author
    unknown,
    number, // rating
    number, // medianTime
    number, // participants
    unknown,
    MissionWaypointPayload[],
    string // logoUrl
  ];
}

export type MissionWaypointPayload = [
  boolean, // hidden
  string, // id
  string, // title
  number, // type
  number, // objective
  number[] | [string, string, string, string, string] // location
];

export interface PlextMarkup {
  0: 'TEXT' | 'PLAYER' | 'PORTAL' | 'SECURE';
  1: {
    plain?: string;
    team?: string;
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
  };
}

export interface PlextData {
  result?: [string, number, {
    plext: {
      text: string;
      markup: PlextMarkup[];
      categories: number;
      team: string;
      plextType: 'PLAYER_GENERATED' | 'SYSTEM_BROADCAST' | 'SYSTEM_NARROWCAST';
    };
  }][];
}

export interface RegionScoreResult {
  regionName: string;
  gameScore: [string | number, string | number];
  topAgents: { team: string; nick: string }[];
  scoreHistory: [string, string, string][];
}

export interface RegionScoreData {
  result?: RegionScoreResult;
}

export interface IntelPasscodeRewardAward {
  level?: number | string;
  count?: number | string;
}

export interface IntelPasscodeRewardInventoryItem {
  name?: string;
  awards?: IntelPasscodeRewardAward[];
}

export interface IntelPasscodeRewardsData {
  xm?: number | string;
  ap?: number | string;
  other?: string[];
  inventory?: IntelPasscodeRewardInventoryItem[];
}

export interface PasscodeResponseData {
  error?: string;
  rewards?: IntelPasscodeRewardsData;
}
