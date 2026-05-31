export const IITC_IRIS_MESSAGES = {
  boot: 'IITC_IRIS_BOOT',
  pageReady: 'IITC_IRIS_PAGE_READY',
  mapMoved: 'IITC_IRIS_MAP_MOVED',
  renderEntities: 'IITC_IRIS_RENDER_ENTITIES',
  fetchEntities: 'IITC_IRIS_FETCH_ENTITIES',
  entitiesResponse: 'IITC_IRIS_ENTITIES_RESPONSE',
  entityStatus: 'IITC_IRIS_ENTITY_STATUS',
  layerSettings: 'IITC_IRIS_LAYER_SETTINGS',
  dataSourceSettings: 'IITC_IRIS_DATA_SOURCE_SETTINGS',
  setView: 'IITC_IRIS_SET_VIEW',
  clearPortalSelection: 'IITC_IRIS_CLEAR_PORTAL_SELECTION',
  requestComm: 'IITC_IRIS_REQUEST_COMM',
  commStatus: 'IITC_IRIS_COMM_STATUS',
} as const;

export type IitcIrisMessageType = typeof IITC_IRIS_MESSAGES[keyof typeof IITC_IRIS_MESSAGES];
export type IitcIrisEntitySource = 'live' | 'cache' | 'fixture';

export interface IitcIrisMessage {
  type: IitcIrisMessageType;
  lat?: number;
  lng?: number;
  zoom?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  entities?: IitcIrisRenderEntities;
  requestId?: number;
  tileKeys?: string[];
  data?: unknown;
  error?: string;
  status?: string;
  entitySource?: IitcIrisEntitySource;
  authRequired?: boolean;
  portals?: number;
  realPortals?: number;
  placeholderPortals?: number;
  ornamentPortals?: number;
  drawnOrnamentMarkers?: number;
  hiddenOrnamentMarkers?: number;
  ornamentTypes?: Record<string, number>;
  artifactPortals?: number;
  drawnArtifactMarkers?: number;
  artifactTypes?: Record<string, number>;
  artifactFetchStatus?: string;
  artifactFetchPortalCount?: number;
  artifactFetchTypes?: string[];
  artifactFetchElapsedMs?: number;
  artifactFetchError?: string;
  levelLabels?: number;
  damagedPortals?: number;
  links?: number;
  fields?: number;
  viewportPortals?: number;
  viewportRealPortals?: number;
  viewportPlaceholderPortals?: number;
  viewportLinks?: number;
  viewportFields?: number;
  viewportOrnamentPortals?: number;
  viewportOrnamentMarkers?: number;
  viewportArtifactPortals?: number;
  viewportArtifactMarkers?: number;
  requestedTiles?: number;
  returnedTiles?: number;
  nonEmptyTiles?: number;
  elapsedMs?: number;
  retryRequests?: number;
  retriedTileKeys?: string[];
  recoveredTileKeys?: string[];
  emptyTileKeys?: string[];
  nonEmptyTileKeys?: string[];
  unaccountedTileKeys?: string[];
  serverRetryTileKeys?: string[];
  timeoutTileKeys?: string[];
  errorTileKeys?: string[];
  responseRetryTileKeys?: string[];
  queueDelayReasons?: string[];
  partialTileKeys?: string[];
  queue?: IitcIrisQueueDiagnostics | null;
  layerSettings?: IitcIrisLayerSettings;
  baseLayerId?: IitcIrisBaseLayerId;
  dataSource?: IitcIrisDataSourceSettings;
  renderPolicy?: IitcIrisRenderPolicy;
  selectedPortal?: IitcIrisSelectedPortal | null;
  portalDetails?: IitcIrisPortalDetailsState | null;
  comm?: IitcIrisCommState;
}

export interface IitcIrisCommState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  tab: string;
  messages: number;
  recent?: IitcIrisCommMessage[];
  elapsedMs?: number;
  error?: string;
  bounds?: {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
  };
}

export interface IitcIrisCommMessage {
  id: string;
  time: number;
  text: string;
  team: string;
  type: string;
  public?: boolean;
  secure?: boolean;
  alert?: boolean;
  auto?: boolean;
  narrowcast?: boolean;
  player?: string;
  playerTeam?: string;
  portals: {
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
  }[];
  players: string[];
}

export interface IitcIrisQueueDiagnostics {
  queuedTiles: number;
  requestedTiles: number;
  successTiles: number;
  failedTiles: number;
  partialTiles?: number;
  staleTiles: number;
  activeRequests: number;
  tileErrorCount: Record<string, number>;
}

export interface IitcIrisLayerSettings {
  fields: boolean;
  links: boolean;
  portals: boolean;
  unclaimedPortals: boolean;
  level1Portals: boolean;
  level2Portals: boolean;
  level3Portals: boolean;
  level4Portals: boolean;
  level5Portals: boolean;
  level6Portals: boolean;
  level7Portals: boolean;
  level8Portals: boolean;
  resistance: boolean;
  enlightened: boolean;
  machina: boolean;
  levelFill: boolean;
  healthFill: boolean;
  ornaments: boolean;
  artifacts: boolean;
  labels: boolean;
  tiles: boolean;
}

export type IitcIrisBaseLayerId = 'osm' | 'cartodb-dark-matter' | 'cartodb-positron';

export type IitcIrisDataSourceSettings =
  | {mode: 'live'}
  | {mode: 'fixture'; id: string; label: string; url: string};

export interface IitcIrisRenderPolicy {
  optionalOverlayMinZoom: number;
  detailedPortals: boolean;
  levelFill: boolean;
  healthFill: boolean;
  ornaments: boolean;
  artifacts: boolean;
  labels: boolean;
}

export interface IitcIrisRenderArtifact {
  role: 'fragment' | 'target';
  type: string;
  ids: string[];
}

export interface IitcIrisRenderPortal {
  guid: string;
  title?: string;
  image?: string;
  team: 'E' | 'R' | 'N' | 'M';
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  resCount?: number;
  mission?: boolean;
  mission50plus?: boolean;
  ornaments?: string[];
  artifacts?: IitcIrisRenderArtifact[];
  isPlaceholder: boolean;
}

export interface IitcIrisSelectedPortal {
  guid: string;
  title?: string;
  image?: string;
  team: 'E' | 'R' | 'N' | 'M';
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  resCount?: number;
  mission?: boolean;
  mission50plus?: boolean;
  isPlaceholder: boolean;
  ornaments: string[];
  artifacts: IitcIrisRenderArtifact[];
  links: {
    count: number;
    incoming: number;
    outgoing: number;
    guids: string[];
  };
  fields: {
    count: number;
    guids: string[];
  };
}

export interface IitcIrisPortalMod {
  owner: string;
  name: string;
  rarity: string;
  stats: Record<string, string | number>;
}

export interface IitcIrisPortalResonator {
  owner: string;
  level: number;
  energy: number;
}

export interface IitcIrisPortalDetailsState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  guid?: string;
  elapsedMs?: number;
  error?: string;
  owner?: string;
  mods?: IitcIrisPortalMod[];
  resonators?: IitcIrisPortalResonator[];
  history?: {
    visited: boolean;
    captured: boolean;
    scoutControlled: boolean;
  };
  mitigation?: {
    total: number;
    shields: number;
    links: number;
    linkDefenseBoost: number;
    excess: number;
  };
  hasMissionsStartingHere?: boolean;
}

export interface IitcIrisRenderLink {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  oGuid?: string;
  oLatE6: number;
  oLngE6: number;
  dGuid?: string;
  dLatE6: number;
  dLngE6: number;
}

export interface IitcIrisRenderField {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  points: {guid?: string; latE6: number; lngE6: number}[];
}

export interface IitcIrisRenderEntities {
  generation: number;
  portals: IitcIrisRenderPortal[];
  links: IitcIrisRenderLink[];
  fields: IitcIrisRenderField[];
}
