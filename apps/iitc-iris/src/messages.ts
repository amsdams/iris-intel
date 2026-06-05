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
  lifecycleSettings: 'IITC_IRIS_LIFECYCLE_SETTINGS',
  setView: 'IITC_IRIS_SET_VIEW',
  setUserLocation: 'IITC_IRIS_SET_USER_LOCATION',
  zoomToAndShowPortal: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL',
  clearPortalSelection: 'IITC_IRIS_CLEAR_PORTAL_SELECTION',
  mapContext: 'IITC_IRIS_MAP_CONTEXT',
  requestComm: 'IITC_IRIS_REQUEST_COMM',
  cancelPanelRequests: 'IITC_IRIS_CANCEL_PANEL_REQUESTS',
  sendComm: 'IITC_IRIS_SEND_COMM',
  commStatus: 'IITC_IRIS_COMM_STATUS',
  requestScores: 'IITC_IRIS_REQUEST_SCORES',
  scoresStatus: 'IITC_IRIS_SCORES_STATUS',
  requestPasscode: 'IITC_IRIS_REQUEST_PASSCODE',
  passcodeStatus: 'IITC_IRIS_PASSCODE_STATUS',
  requestInventory: 'IITC_IRIS_REQUEST_INVENTORY',
  inventoryStatus: 'IITC_IRIS_INVENTORY_STATUS',
  requestMissions: 'IITC_IRIS_REQUEST_MISSIONS',
  requestMissionDetails: 'IITC_IRIS_REQUEST_MISSION_DETAILS',
  missionZoom: 'IITC_IRIS_MISSION_ZOOM',
  missionsStatus: 'IITC_IRIS_MISSIONS_STATUS',
  requestStatus: 'IITC_IRIS_REQUEST_STATUS',
  agentStatus: 'IITC_IRIS_AGENT_STATUS',
  searchRequest: 'IITC_IRIS_SEARCH_REQUEST',
  searchStatus: 'IITC_IRIS_SEARCH_STATUS',
  searchSelect: 'IITC_IRIS_SEARCH_SELECT',
  searchPreview: 'IITC_IRIS_SEARCH_PREVIEW',
  searchClear: 'IITC_IRIS_SEARCH_CLEAR',
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
  firstRenderElapsedMs?: number;
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
  cacheFreshTileKeys?: string[];
  cacheStaleTileKeys?: string[];
  staleGenerationCacheWarmTileKeys?: string[];
  queue?: IitcIrisQueueDiagnostics | null;
  renderQueue?: IitcIrisRenderQueueDiagnostics | null;
  timing?: IitcIrisMapTimingDiagnostics | null;
  requestDiagnostics?: IitcIrisRequestDiagnostics;
  playerTracker?: IitcIrisPlayerTrackerDiagnostics;
  layerSettings?: IitcIrisLayerSettings;
  baseLayerId?: IitcIrisBaseLayerId;
  dataSource?: IitcIrisDataSourceSettings;
  lifecycleSettings?: IitcIrisLifecycleSettings;
  renderPolicy?: IitcIrisRenderPolicy;
  selectedPortal?: IitcIrisSelectedPortal | null;
  portalDetails?: IitcIrisPortalDetailsState | null;
  contextTarget?: 'map' | 'portal';
  comm?: IitcIrisCommState;
  scores?: IitcIrisScoresState;
  passcode?: IitcIrisPasscodeState;
  inventory?: IitcIrisInventoryState;
  missions?: IitcIrisMissionsState;
  agent?: IitcIrisAgentState;
  search?: IitcIrisSearchState;
  searchTerm?: string;
  searchConfirmed?: boolean;
  searchResult?: IitcIrisSearchResult;
  searchZoom?: boolean;
  userLat?: number;
  userLng?: number;
  userAccuracy?: number;
  commTab?: IitcIrisCommTab;
  commOlder?: boolean;
  commMessage?: string;
  passcodeText?: string;
  missionSource?: IitcIrisMissionSource;
  missionGuid?: string;
  portalGuid?: string;
  portalLat?: number;
  portalLng?: number;
  openPortal?: boolean;
}

export interface IitcIrisSearchResult {
  id: string;
  type: 'portal' | 'address' | 'coordinate' | 'guid' | 'empty';
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  geojson?: unknown;
  guid?: string;
  team?: 'E' | 'R' | 'N' | 'M';
  level?: number;
  health?: number;
  icon?: string;
}

export interface IitcIrisSearchState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  term: string;
  confirmed: boolean;
  results: IitcIrisSearchResult[];
  localResults: number;
  onlineResults?: number;
  elapsedMs?: number;
  error?: string;
}

export type IitcIrisCommTab = 'all' | 'faction' | 'alerts';

export interface IitcIrisCommState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  tab: IitcIrisCommTab;
  messages: number;
  responseMessages?: number;
  addedMessages?: number;
  requestOlder?: boolean;
  oldMessagesWereAdded?: boolean;
  sendStatus?: 'idle' | 'sending' | 'sent' | 'error' | 'auth';
  sendError?: string;
  recent?: IitcIrisCommMessage[];
  elapsedMs?: number;
  error?: string;
  oldestTimestamp?: number;
  newestTimestamp?: number;
  bounds?: {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
  };
}

export interface IitcIrisAgentState {
  status: 'idle' | 'ready' | 'missing';
  nickname?: string;
  team?: 'E' | 'R' | 'N';
  level?: number;
  ap?: number;
  energy?: number;
  xmCapacity?: number;
  availableInvites?: number;
  minApForCurrentLevel?: number;
  minApForNextLevel?: number;
  xmPercent?: number;
  levelPercent?: number;
  apToNextLevel?: number;
  maxLevel?: boolean;
  staticFromPage?: boolean;
  subscription?: IitcIrisSubscriptionState;
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
  parts: IitcIrisCommMessagePart[];
  portals: {
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
  }[];
  players: string[];
}

export interface IitcIrisCommMessagePart {
  type: 'text' | 'portal' | 'faction' | 'player' | 'unknown';
  text: string;
  team?: string;
  at?: boolean;
  sender?: boolean;
  portal?: {
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
    guid?: string;
  };
}

export interface IitcIrisScoresState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  game?: {
    enlightened: number;
    resistance: number;
    enlightenedPercent: number;
    resistancePercent: number;
  };
  region?: {
    status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
    name?: string;
    enlightenedAvg?: number;
    resistanceAvg?: number;
    checkpoints?: number;
    lastCheckpoint?: number;
    topAgents?: number;
    topAgentList?: {
      nick: string;
      team: 'E' | 'R' | 'N' | 'M';
    }[];
    center?: {
      latE6: number;
      lngE6: number;
    };
    error?: string;
  };
  elapsedMs?: number;
  error?: string;
}

export interface IitcIrisInventoryState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  subscription?: IitcIrisSubscriptionState;
  items: number;
  rawItems?: number;
  keys: number;
  portalsWithKeys: number;
  capsules: number;
  selectedPortalGuid?: string;
  selectedPortalTitle?: string;
  portalKeysForSelectedPortal: null | {
    total: number;
    capsule: number;
    loose: number;
    capsules: Record<string, number>;
  };
  topItems?: {
    label: string;
    type: string;
    count: number;
    level?: number;
    rarity?: string;
  }[];
  topKeys?: {
    portalGuid: string;
    portalTitle?: string;
    count: number;
    capsule: number;
  }[];
  elapsedMs?: number;
  error?: string;
}

export interface IitcIrisSubscriptionState {
  status: 'unknown' | 'loading' | 'active' | 'inactive' | 'error' | 'auth';
  hasActive?: boolean;
  elapsedMs?: number;
  checkedAt?: number;
  error?: string;
}

export type IitcIrisMissionSource = 'view' | 'portal';

export interface IitcIrisMissionSummary {
  guid: string;
  title: string;
  image?: string;
  ratingE6?: number;
  ratingPercent?: number;
  medianCompletionTimeMs?: number;
  durationLabel?: string;
  authorNickname?: string;
  authorTeam?: 'E' | 'R' | 'N' | 'M';
  typeNum?: number;
  type?: string;
  numUniqueCompletedPlayers?: number;
  waypointCount?: number;
  routeLengthMeters?: number;
}

export interface IitcIrisMissionWaypoint {
  index: number;
  hidden: boolean;
  guid: string;
  title: string;
  typeNum: number;
  type: string;
  objectiveNum: number;
  objective: string;
  latE6?: number;
  lngE6?: number;
  portalGuid?: string;
  portalTitle?: string;
}

export interface IitcIrisMissionDetails extends IitcIrisMissionSummary {
  description: string;
  authorNickname?: string;
  authorTeam?: 'E' | 'R' | 'N' | 'M';
  typeNum?: number;
  type?: string;
  numUniqueCompletedPlayers?: number;
  waypoints: IitcIrisMissionWaypoint[];
  routeLengthMeters?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

export interface IitcIrisMissionsState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  source?: IitcIrisMissionSource;
  caption?: string;
  portalGuid?: string;
  portalTitle?: string;
  missions: IitcIrisMissionSummary[];
  selectedMission?: IitcIrisMissionDetails;
  detailsStatus?: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  cached?: boolean;
  detailsCached?: boolean;
  elapsedMs?: number;
  detailsElapsedMs?: number;
  error?: string;
}

export interface IitcIrisPasscodeRewardItem {
  label: string;
  count?: number;
  level?: number;
}

export interface IitcIrisPasscodeState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  passcode?: string;
  ap?: number;
  xm?: number;
  other?: string[];
  items?: IitcIrisPasscodeRewardItem[];
  elapsedMs?: number;
  error?: string;
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

export interface IitcIrisRequestDiagnostics {
  activeRequests: number;
  activeByEndpoint: Record<string, number>;
  active: Array<{
    id: number;
    endpoint: string;
    group?: string;
    elapsedMs: number;
  }>;
}

export interface IitcIrisRenderQueueDiagnostics {
  queuedTiles: number;
  renderedTiles: number;
  renderedOkTiles: number;
  renderedCacheFreshTiles: number;
  renderedCacheStaleTiles: number;
  lastRenderedTileStatus: 'ok' | 'cache-fresh' | 'cache-stale' | null;
  renderedTileKeys: string[];
}

export interface IitcIrisMapTimingDiagnostics {
  cacheMs?: number;
  initialMs?: number;
  retryMs?: number;
  artifactWaitMs?: number;
  totalMs?: number;
  movementDelayMs?: number;
}

export interface IitcIrisPlayerTrackerDiagnostics {
  enabled: boolean;
  visible: boolean;
  players: number;
  events: number;
  markers: number;
  traces: number;
  latestCommTime: number | null;
  minZoom: number;
  maxAgeMs: number;
}

export interface IitcIrisLifecycleSettings {
  iitcMovementDelay: boolean;
}

export type IitcIrisTriStateLayer = 'off' | 'on' | 'invert';

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
  playerTracker: boolean;
  playerTrackerResistance: boolean;
  playerTrackerEnlightened: boolean;
  playerTrackerMachina: boolean;
  historyCaptured: IitcIrisTriStateLayer;
  historyVisited: IitcIrisTriStateLayer;
  historyScoutControlled: IitcIrisTriStateLayer;
  keyCount: IitcIrisTriStateLayer;
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
  history?: {
    visited: boolean;
    captured: boolean;
    scoutControlled: boolean;
  };
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
  cached?: boolean;
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
