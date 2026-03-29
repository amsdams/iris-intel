export interface IntelTile {
  deletedGameEntityGuids?: string[];
  gameEntities?: [string, number, unknown[]][];
}

export interface IntelMapData {
  result?: {
    map?: Record<string, IntelTile>;
  };
}

export interface PortalDetailsData {
  result?: unknown[];
}

export interface PlextData {
  result?: [string, number, {
    plext: {
      text: string;
      markup: unknown[];
      categories: number;
      team: string;
      plextType: 'PLAYER_GENERATED' | 'SYSTEM_BROADCAST' | 'SYSTEM_NARROWCAST';
    };
  }][];
}

export interface InventoryData {
  result?: [string, number, unknown][];
}

export interface RegionScoreResult {
  regionName: string;
  gameScore: [string | number, string | number];
  topAgents: { team: string; nick: string }[];
  scoreHistory: [string, string, string][];
}

export interface IRISMessage {
  type: string;
  url?: string;
  data?: unknown;
  params?: unknown;
  lat?: number;
  lng?: number;
  zoom?: number;
  center?: { lat: number; lng: number };
  status?: number;
  statusText?: string;
  time?: number;
  message?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  guid?: string;
  tab?: string;
  minTimestampMs?: number;
  maxTimestampMs?: number;
  ascendingTimestampOrder?: boolean;
  bounds?: {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
  };
  minLatE6?: number;
  maxLatE6?: number;
  minLngE6?: number;
  maxLngE6?: number;
  nickname?: string;
  level?: number;
  ap?: number;
  team?: string;
  energy?: number;
  xm_capacity?: number;
  available_invites?: number;
  min_ap_for_current_level?: number;
  min_ap_for_next_level?: number;
  hasActiveSubscription?: boolean;
}
