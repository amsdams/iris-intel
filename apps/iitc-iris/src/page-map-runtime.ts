import L, {type Layer as LeafletLayer, type LeafletMouseEvent, type Map as LeafletMap, type TileLayer} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisDataSourceSettings, type IitcIrisEntitySource, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLifecycleSettings, type IitcIrisMapContextPortalAnchor, type IitcIrisMapTimingDiagnostics, type IitcIrisMessage, type IitcIrisMissionDetails, type IitcIrisMissionSource, type IitcIrisMissionSummary, type IitcIrisMissionWaypoint, type IitcIrisMissionsState, type IitcIrisPasscodeRewardItem, type IitcIrisPasscodeState, type IitcIrisPortalDetailsState, type IitcIrisQueueDiagnostics, type IitcIrisRequestDiagnostics, type IitcIrisRenderArtifact, type IitcIrisRenderEntities, type IitcIrisRenderField, type IitcIrisRenderLink, type IitcIrisRenderPortal, type IitcIrisRenderPolicy, type IitcIrisRenderQueueDiagnostics, type IitcIrisScoresState, type IitcIrisSearchResult, type IitcIrisSearchState, type IitcIrisSelectedPortal, type IitcIrisSubscriptionState, type IitcIrisTriStateLayer} from './messages';
import {IITC_LEVEL_COLORS, IITC_TEAM_COLORS} from './iitc-colors';
import {createIitcIrisMapContextMessage, installIitcIrisContextGestures} from './map-context-runtime';
import {convertIitcGeodesicLatLngs, createIitcGeodesicPolygon, createIitcGeodesicPolyline} from './leaflet-geodesic';
import {
  appendIitcResponseBucketDiagnostics,
  applyIitcTileRequestResponseToQueue,
  classifyIitcGetEntitiesResponse,
  createIitcResponseBucketDiagnostics,
  createIitcTileQueueState,
  createIitcTileQueueRequestBatches,
  createIitcCommChannelData,
  createIitcRenderQueueState,
  createIitcMapDataPlan,
  decodeIitcGameEntities,
  decodeIitcGetEntitiesResponse,
  drainIitcRenderQueueToResponse,
  genIitcCommPostData,
  genIitcCommSendPlextPostData,
  getIitcCommChannelMessages,
  getIitcInventoryPortalKeyCount,
  getIitcMissionBounds,
  getIitcPortalAnalysis,
  IITC_DRAW_TOOLS_DEFAULT_COLOR,
  IITC_DRAW_TOOLS_KEY_STORAGE,
  IITC_MISSION_ORDER,
  getIitcPlayerTrackerDiagnostics,
  getIitcPlayerTrackerLatLng,
  getIitcOrnamentDefinition,
  getIitcRecoveredTileKeys,
  getIitcPortalArtifacts,
  isIitcExcludedOrnament,
  IITC_PLAYER_TRACKER_LINE_COLOR,
  IITC_PLAYER_TRACKER_MAX_DISPLAY_EVENTS,
  IITC_PLAYER_TRACKER_MAX_TIME,
  IITC_PLAYER_TRACKER_MIN_OPACITY,
  IITC_PLAYER_TRACKER_MIN_ZOOM,
  IitcDataCache,
  markIitcTileQueueComplete,
  markIitcTileQueueStale,
  markIitcTileRequestStarted,
  mergeIitcGetEntitiesResponses,
  parseIitcOrnamentVisibilitySettings,
  parseIitcInventoryResponse,
  parseIitcDrawToolsLayer,
  importIitcDrawToolsItems,
  parseIitcMissionDetailsResponse,
  parseIitcTopMissionsResponse,
  parseIitcPortalDetailsResponse,
  processIitcPlayerTrackerData,
  pruneIitcPlayerTrackerStored,
  renderIitcCommMarkup,
  serializeIitcDrawToolsLayer,
  summarizeIitcInventory,
  writeIitcCommDataToHash,
  formatIitcMissionDuration,
  type IitcCommChannel,
  type IitcCommChannelData,
  type IitcCommMessage,
  type IitcDrawToolsItem,
  type IitcDrawToolsMarker,
  type IitcDrawToolsPolyline,
  type IitcGetEntitiesResponse,
  type IitcInventorySummary,
  type IitcMissionDetails as CoreIitcMissionDetails,
  type IitcMissionSummary as CoreIitcMissionSummary,
  type IitcMapDataPlan,
  type IitcMapTilePayload,
  type IitcPortalDetailsResponse,
  type IitcPortalArtifact,
  type IitcOrnamentVisibilitySettings,
  type IitcPlayerTrackerDiagnostics,
  type IitcPlayerTrackerStored,
  type IitcRawGameEntity,
  type IitcRenderQueueTileStatus,
  pushIitcRenderQueueTile,
  type IitcTileQueueState,
} from '@iris/iitc-core';

const DEFAULT_CENTER: [number, number] = [52.3730796, 4.8924534];
const DEFAULT_ZOOM = 11;
const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';
const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const OPTIONAL_OVERLAY_MIN_ZOOM = 14;
const FAST_MOVE_REFRESH_DELAY_MS = 250;
const IITC_MOVE_REFRESH_DELAY_MS = 3000;
const ENABLE_STALE_GENERATION_CACHE_WARMING = false;
const LONG_PRESS_MS = 600;
const LONG_PRESS_MOVE_TOLERANCE_PX = 12;
const LONG_PRESS_CLICK_SUPPRESS_MS = 700;
const PORTAL_CONTEXT_HIT_TOLERANCE_PX = 10;
const LINK_CONTEXT_HIT_TOLERANCE_PX = 7;
const PLAYER_TRACKER_COMM_REFRESH_MS = 120_000;
const SEARCH_AUTO_MIN_LENGTH = 3;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=';
const MISSION_ROUTE_COLOR = '#404000';
const MISSION_OVERVIEW_MAX_ZOOM = 15;
const MISSION_DETAILS_CACHE_MS = 3 * 24 * 60 * 60 * 1000;
const PORTAL_MISSIONS_CACHE_MS = 21 * 24 * 60 * 60 * 1000;
const MISSION_DETAILS_CACHE_STORAGE_KEY = 'iitc-iris:missions:details-cache';
const PORTAL_MISSIONS_CACHE_STORAGE_KEY = 'iitc-iris:missions:portal-cache';
const DRAW_TOOLS_LINE_WEIGHT = 4;
const DRAW_TOOLS_LINE_OPACITY = 0.5;
const DRAW_TOOLS_CROSSING_COLOR = '#ff4d4d';
const MISSION_DETAILS_CACHE_STORAGE_MAX_CHARS = 2_000_000;
const PORTAL_MISSIONS_CACHE_STORAGE_MAX_CHARS = 1_000_000;
const IITC_IRIS_ASSET_BASE_URL = ((): string => {
  const script = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : '';
  return script ? new URL('.', script).toString() : '';
})();
const PLAYER_TRACKER_MARKER_ICON_OPTIONS = {
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number],
};
const DEFAULT_BASE_LAYER_ID: IitcIrisBaseLayerId = 'cartodb-dark-matter';
const BASE_LAYERS: Record<IitcIrisBaseLayerId, {
  url: string;
  attribution: string;
  maxZoom: number;
}> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap',
    maxZoom: 19,
  },
  'cartodb-dark-matter': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: 'OpenStreetMap, CARTO',
    maxZoom: 20,
  },
  'cartodb-positron': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: 'OpenStreetMap, CARTO',
    maxZoom: 20,
  },
};
const DEFAULT_LAYER_SETTINGS: IitcIrisLayerSettings = {
  fields: true,
  links: true,
  portals: true,
  unclaimedPortals: true,
  level1Portals: true,
  level2Portals: true,
  level3Portals: true,
  level4Portals: true,
  level5Portals: true,
  level6Portals: true,
  level7Portals: true,
  level8Portals: true,
  resistance: true,
  enlightened: true,
  machina: true,
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
  tiles: false,
  drawnLinks: true,
  drawnMarkers: true,
  playerTracker: false,
  playerTrackerResistance: false,
  playerTrackerEnlightened: false,
  playerTrackerMachina: false,
  historyCaptured: 'off',
  historyVisited: 'off',
  historyScoutControlled: 'off',
  keyCount: 'off',
};
let latestFetchGeneration = 0;
let latestRequestKey = '';
let latestEntities: IitcIrisRenderEntities | undefined;
let latestPlan: IitcMapDataPlan | undefined;
let latestResponse: IitcGetEntitiesResponse | undefined;
let latestWantedTileKeys = new Set<string>();
const mapDataCache = new IitcDataCache<IitcMapTilePayload>();
let selectedPortalGuid: string | undefined;
let selectedPortal: IitcIrisSelectedPortal | null = null;
let selectedMapObject: {type: 'link' | 'field'; guid: string} | null = null;
let pendingPortalSelection: {guid?: string; lat?: number; lng?: number} | null = null;
let latestPortalDetails: IitcIrisPortalDetailsState | null = null;
let suppressPortalClickUntil = 0;
let lastContextPostAt = 0;
const portalDetailsCache = new Map<string, IitcIrisPortalDetailsState>();
let latestSearchSequence = 0;
let latestSearchState: IitcIrisSearchState = {status: 'idle', term: '', confirmed: false, results: [], localResults: 0};
const portalHistoryByGuid = new Map<string, NonNullable<IitcIrisRenderPortal['history']>>();
let latestArtifactEntities: IitcRawGameEntity[] = [];
let layerSettings: IitcIrisLayerSettings = DEFAULT_LAYER_SETTINGS;
let baseLayerId: IitcIrisBaseLayerId = DEFAULT_BASE_LAYER_ID;
let baseLayer: TileLayer | undefined;
let dataSource: IitcIrisDataSourceSettings = {mode: 'live'};
let lifecycleSettings: IitcIrisLifecycleSettings = {iitcMovementDelay: false};
let refreshTimer: number | undefined;
let authRecoveryActive = false;
let mapMoveInProgress = false;
let currentFetchAbortController: AbortController | undefined;
let currentPortalDetailsAbortController: AbortController | undefined;
let currentCommAbortController: AbortController | undefined;
let currentScoresAbortController: AbortController | undefined;
let currentPasscodeAbortController: AbortController | undefined;
let currentInventoryAbortController: AbortController | undefined;
let currentSubscriptionAbortController: AbortController | undefined;
let currentMissionsAbortController: AbortController | undefined;
let currentMissionDetailsAbortController: AbortController | undefined;
let currentSubscriptionPromise: Promise<IitcIrisSubscriptionState> | undefined;
let latestCommState: IitcIrisCommState = {status: 'idle', tab: loadStoredCommTab(), messages: 0};
let latestScoresState: IitcIrisScoresState = {status: 'idle', requestState: 'idle', region: {status: 'idle'}};
let latestPasscodeState: IitcIrisPasscodeState = {status: 'idle', requestState: 'idle'};
let latestSubscriptionState: IitcIrisSubscriptionState = {status: 'unknown'};
let latestInventorySummary: IitcInventorySummary | undefined;
let latestInventoryState: IitcIrisInventoryState = {
  status: 'idle',
  requestState: 'idle',
  subscription: latestSubscriptionState,
  items: 0,
  keys: 0,
  portalsWithKeys: 0,
  capsules: 0,
  portalKeysForSelectedPortal: null,
};
let latestMissionsState: IitcIrisMissionsState = {
  status: 'idle',
  requestState: 'idle',
  missions: [],
  detailsStatus: 'idle',
};
interface MissionCacheEntry<T> {time: number; data: T}
const missionDetailsCache = new Map<string, MissionCacheEntry<IitcIrisMissionDetails>>();
const portalMissionsCache = new Map<string, MissionCacheEntry<IitcIrisMissionSummary[]>>();
let playerTrackerStored: IitcPlayerTrackerStored = {};
let playerTrackerLatestCommTime: number | null = null;
let playerTrackerDiagnostics: IitcPlayerTrackerDiagnostics = getIitcPlayerTrackerDiagnostics(playerTrackerStored);
let playerTrackerRefreshTimer: number | undefined;
let currentPlayerTrackerCommAbortController: AbortController | undefined;
const playerTrackerProcessedCommGuids = new Set<string>();
let nextIitcRequestId = 1;
const activeIitcRequests = new Map<number, {
  endpoint: string;
  group?: string;
  startedAt: number;
}>();

interface IitcPagePlayer {
  ap?: unknown;
  available_invites?: unknown;
  energy?: unknown;
  min_ap_for_current_level?: unknown;
  min_ap_for_next_level?: unknown;
  nickname?: unknown;
  team?: unknown;
  verified_level?: unknown;
  level?: unknown;
  xm_capacity?: unknown;
}
const commChannelsData: Record<IitcCommChannel, IitcCommChannelData> = {
  all: createIitcCommChannelData(),
  faction: createIitcCommChannelData(),
  alerts: createIitcCommChannelData(),
};

interface TileDiagnostics {
  entitySource?: IitcIrisEntitySource;
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  elapsedMs?: number;
  firstRenderElapsedMs?: number;
  viewportBounds?: IitcMapDataPlan['viewportBounds'];
  retryRequests?: number;
  retriedTileKeys?: string[];
  recoveredTileKeys?: string[];
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
  unaccountedTileKeys: string[];
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
}

interface TileBatchResult {
  tileKeys: string[];
  response?: IitcGetEntitiesResponse;
  error?: unknown;
}

interface ArtifactFetchDiagnostics {
  status: string;
  portalCount: number;
  types: string[];
  elapsedMs?: number;
  error?: string;
}

interface ArtifactPortalsResponse {
  error?: string;
  result?: unknown;
}

interface OrnamentDiagnostics {
  drawnMarkers: number;
  hiddenMarkers: number;
  types: Record<string, number>;
}

let latestEntityStatus = 'idle';
let latestTileDiagnostics: TileDiagnostics | undefined;
let latestArtifactDiagnostics: ArtifactFetchDiagnostics = {
  status: 'disabled',
  portalCount: 0,
  types: [],
};
let latestOrnamentDiagnostics: OrnamentDiagnostics = {
  drawnMarkers: 0,
  hiddenMarkers: 0,
  types: {},
};

interface StoredMapView {
  lat: number;
  lng: number;
  zoom: number;
}

function isStoredMapView(value: unknown): value is StoredMapView {
  if (!value || typeof value !== 'object') return false;
  const view = value as Partial<StoredMapView>;
  return typeof view.lat === 'number' && Number.isFinite(view.lat) &&
    typeof view.lng === 'number' && Number.isFinite(view.lng) &&
    typeof view.zoom === 'number' && Number.isFinite(view.zoom);
}

function loadStoredMapView(): StoredMapView {
  try {
    const value = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!value) return {lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], zoom: DEFAULT_ZOOM};
    const parsed = JSON.parse(value) as unknown;
    if (!isStoredMapView(parsed)) return {lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], zoom: DEFAULT_ZOOM};
    return {
      lat: Math.max(-85.051128, Math.min(85.051128, parsed.lat)),
      lng: Math.max(-180, Math.min(179.999999, parsed.lng)),
      zoom: Math.max(0, Math.min(21, parsed.zoom)),
    };
  } catch {
    return {lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], zoom: DEFAULT_ZOOM};
  }
}

function loadUrlMapView(): StoredMapView | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ll = params.get('ll');
    const z = params.get('z');
    if (!ll || !z) return null;

    const [latText, lngText] = ll.split(',');
    const view = {
      lat: Number(latText),
      lng: Number(lngText),
      zoom: Number(z),
    };
    if (!isStoredMapView(view)) return null;
    return {
      lat: Math.max(-85.051128, Math.min(85.051128, view.lat)),
      lng: Math.max(-180, Math.min(179.999999, view.lng)),
      zoom: Math.max(0, Math.min(21, view.zoom)),
    };
  } catch {
    return null;
  }
}

function storeMapView(view: StoredMapView): void {
  try {
    window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Local storage is optional; map sync should keep working when unavailable.
  }
}

function isBaseLayerId(value: string | null): value is IitcIrisBaseLayerId {
  return value === 'osm' || value === 'cartodb-dark-matter' || value === 'cartodb-positron';
}

function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = window.localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    return isBaseLayerId(value) ? value : DEFAULT_BASE_LAYER_ID;
  } catch {
    return DEFAULT_BASE_LAYER_ID;
  }
}

function storeBaseLayerId(value: IitcIrisBaseLayerId): void {
  try {
    window.localStorage.setItem(BASE_LAYER_STORAGE_KEY, value);
  } catch {
    // Base layer preference is optional.
  }
}

function loadStoredCommTab(): IitcCommChannel {
  try {
    return normalizeCommTab(window.localStorage.getItem(COMM_TAB_STORAGE_KEY));
  } catch {
    return 'all';
  }
}

function setIntelMapCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function syncIntelMapCookies(view: StoredMapView): void {
  setIntelMapCookie('ingress.intelmap.shflt', 'hdn');
  setIntelMapCookie('ingress.intelmap.lat', String(view.lat));
  setIntelMapCookie('ingress.intelmap.lng', String(view.lng));
  setIntelMapCookie('ingress.intelmap.zoom', String(Math.round(view.zoom)));
}

function syncUrlMapView(view: StoredMapView): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('ll', `${view.lat.toFixed(6)},${view.lng.toFixed(6)}`);
    url.searchParams.set('z', String(Math.round(view.zoom * 100) / 100));
    window.history.replaceState(window.history.state, '', url);
  } catch {
    // URL sync is diagnostic-only; ignore restricted history cases.
  }
}

function setBaseLayer(nextBaseLayerId: IitcIrisBaseLayerId): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  if (baseLayer && baseLayerId === nextBaseLayerId) return;

  const config = BASE_LAYERS[nextBaseLayerId];
  if (baseLayer) map.removeLayer(baseLayer);
  baseLayer = L.tileLayer(config.url, {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
  }).addTo(map);
  baseLayerId = nextBaseLayerId;
  storeBaseLayerId(nextBaseLayerId);
}

function cancelActiveEntityFetch(): void {
  currentFetchAbortController?.abort();
  currentFetchAbortController = undefined;
}

function cancelActivePortalDetailsFetch(): void {
  currentPortalDetailsAbortController?.abort();
  currentPortalDetailsAbortController = undefined;
}

function cancelActiveCommFetch(): void {
  currentCommAbortController?.abort();
  currentCommAbortController = undefined;
}

function cancelActiveScoresFetch(): void {
  currentScoresAbortController?.abort();
  currentScoresAbortController = undefined;
}

function cancelActivePasscodeFetch(): void {
  currentPasscodeAbortController?.abort();
  currentPasscodeAbortController = undefined;
}

function cancelActiveInventoryFetch(): void {
  currentInventoryAbortController?.abort();
  currentInventoryAbortController = undefined;
}

function cancelActivePanelRequests(): void {
  cancelActivePortalDetailsFetch();
  cancelActiveCommFetch();
  cancelActiveScoresFetch();
  cancelActivePasscodeFetch();
  cancelActiveInventoryFetch();
  cancelActiveMissionsFetch();
  cancelActiveMissionDetailsFetch();
}

function postMapMoveStarted(): void {
  mapMoveInProgress = true;
  latestFetchGeneration += 1;
  latestRequestKey = '';
  latestWantedTileKeys = new Set();
  window.clearTimeout(refreshTimer);
}

function postMapMoved(): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  mapMoveInProgress = false;
  latestFetchGeneration += 1;
  latestRequestKey = '';
  const center = map.getCenter();
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  const view = {lat: center.lat, lng: center.lng, zoom};
  storeMapView(view);
  syncIntelMapCookies(view);
  syncUrlMapView(view);
  window.postMessage({
    type: IITC_IRIS_MESSAGES.mapMoved,
    lat: center.lat,
    lng: center.lng,
    zoom,
    bounds: {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    },
  }, '*');
  scheduleEntityRefresh(lifecycleSettings.iitcMovementDelay ? IITC_MOVE_REFRESH_DELAY_MS : FAST_MOVE_REFRESH_DELAY_MS);
  schedulePlayerTrackerRefresh();
}

declare global {
  interface Window {
    __iitcIrisMap?: LeafletMap;
    __iitcIrisMapContainer?: HTMLElement;
    __iitcIrisLayers?: {
      tiles: LeafletLayer[];
      fields: LeafletLayer[];
      links: LeafletLayer[];
      portals: LeafletLayer[];
      selectedPortal: LeafletLayer[];
      selectedMapObject: LeafletLayer[];
      ornaments: LeafletLayer[];
      artifacts: LeafletLayer[];
      labels: LeafletLayer[];
      drawnItems: LeafletLayer[];
      playerTracker: LeafletLayer[];
      search: LeafletLayer[];
      missions: LeafletLayer[];
      userLocation: LeafletLayer[];
    };
  }
}

const TEAM_COLORS = IITC_TEAM_COLORS;
const HEALTH_COLORS = {
  cond85: '#ffff00',
  cond70: '#ffa500',
  cond60: '#ff8c00',
  cond45: '#ff0000',
  cond30: '#ff0000',
  cond15: '#ff0000',
  cond0: '#ff00ff',
} as const;
const LEVEL_COLORS = IITC_LEVEL_COLORS;
const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4] as const;
const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11] as const;
const LEVEL_LABEL_COLLISION_SIZE = 15;
type IitcIrisLayerPaneKey = keyof IitcIrisLayerSettings | 'drawnItems' | 'selectedPortal' | 'selectedMapObject' | 'search' | 'missions' | 'userLocation';

function toLatLng(latE6: number, lngE6: number): [number, number] {
  return [latE6 / 1e6, lngE6 / 1e6];
}

function getTeamColor(team: keyof typeof TEAM_COLORS): string {
  return TEAM_COLORS[team] ?? TEAM_COLORS.N;
}

function getPortalMarkerScale(zoom: number): number {
  return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
}

function getPortalLevel(level: number | undefined, isPlaceholder: boolean): number {
  if (isPlaceholder) return 0;
  return Math.max(0, Math.min(8, Math.floor(level ?? 0)));
}

function getPortalRadius(level: number | undefined, isPlaceholder: boolean): number {
  const scale = getPortalMarkerScale(window.__iitcIrisMap?.getZoom() ?? DEFAULT_ZOOM);
  return LEVEL_TO_RADIUS[getPortalLevel(level, isPlaceholder)] * scale;
}

function getPortalWeight(level: number | undefined, isPlaceholder: boolean): number {
  if (isPlaceholder) return 1;
  const scale = getPortalMarkerScale(window.__iitcIrisMap?.getZoom() ?? DEFAULT_ZOOM);
  return LEVEL_TO_WEIGHT[getPortalLevel(level, isPlaceholder)] * Math.sqrt(scale);
}

function getPortalFillOpacity(_health: number | undefined, _level: number | undefined, _team: keyof typeof TEAM_COLORS, _isPlaceholder: boolean): number {
  if (getPortalHealthFillColor(_health, _team)) return getPortalHealthFillOpacity(_health ?? 100);
  if (getPortalLevelFillColor(_level, _team, _isPlaceholder)) return 0.6;
  return 0.5;
}

function getPortalFillColor(team: keyof typeof TEAM_COLORS, level: number | undefined, isPlaceholder: boolean, health: number | undefined): string {
  const healthColor = getPortalHealthFillColor(health, team);
  if (healthColor) return healthColor;
  const levelColor = getPortalLevelFillColor(level, team, isPlaceholder);
  if (levelColor) return levelColor;
  return getTeamColor(team);
}

function getPortalLevelFillColor(level: number | undefined, team: keyof typeof TEAM_COLORS, isPlaceholder: boolean): string | null {
  if (!layerSettings.levelFill || isPlaceholder || level === undefined) return null;
  return LEVEL_COLORS[getPortalLevel(level, false)] ?? null;
}

function getPortalHealthFillColor(health: number | undefined, team: keyof typeof TEAM_COLORS): string | null {
  if (!layerSettings.healthFill || team === 'N' || health === undefined || health >= 100) return null;
  if (health > 85) return HEALTH_COLORS.cond85;
  if (health > 70) return HEALTH_COLORS.cond70;
  if (health > 60) return HEALTH_COLORS.cond60;
  if (health > 45) return HEALTH_COLORS.cond45;
  if (health > 30) return HEALTH_COLORS.cond30;
  if (health > 15) return HEALTH_COLORS.cond15;
  return HEALTH_COLORS.cond0;
}

function getPortalHealthFillOpacity(health: number): number {
  if (health > 85) return 0.5;
  if (health > 70) return 0.5;
  if (health > 60) return 0.5;
  if (health > 45) return 0.4;
  if (health > 30) return 0.6;
  if (health > 15) return 0.8;
  return 1;
}

function triStateMatches(mode: IitcIrisTriStateLayer, value: boolean | undefined): boolean {
  if (mode === 'off') return false;
  if (value === undefined) return mode === 'invert';
  return mode === 'invert' ? !value : value;
}

function getPortalKeyCount(portalGuid: string): number | undefined {
  if (!latestInventorySummary) return undefined;
  return getIitcInventoryPortalKeyCount(latestInventorySummary, portalGuid)?.count ?? 0;
}

function getPortalDataOverlayStyle(portal: IitcIrisRenderPortal): Partial<L.CircleMarkerOptions> {
  const history = portal.history ?? portalHistoryByGuid.get(portal.guid);
  const keyCount = getPortalKeyCount(portal.guid);

  if (triStateMatches(layerSettings.historyScoutControlled, history?.scoutControlled)) {
    return {color: '#4ee7ff', fillColor: '#4ee7ff', fillOpacity: 0.75, opacity: 1, weight: Math.max(3, getPortalWeight(portal.level, portal.isPlaceholder) + 1)};
  }
  if (triStateMatches(layerSettings.historyCaptured, history?.captured)) {
    return {color: '#ffe66d', fillColor: '#ffe66d', fillOpacity: 0.72, opacity: 1, weight: Math.max(3, getPortalWeight(portal.level, portal.isPlaceholder) + 1)};
  }
  if (triStateMatches(layerSettings.historyVisited, history?.visited)) {
    return {color: '#fb6fff', fillColor: '#fb6fff', fillOpacity: 0.72, opacity: 1, weight: Math.max(3, getPortalWeight(portal.level, portal.isPlaceholder) + 1)};
  }
  if (triStateMatches(layerSettings.keyCount, keyCount !== undefined && keyCount > 0)) {
    return {color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.68, opacity: 1, weight: Math.max(3, getPortalWeight(portal.level, portal.isPlaceholder) + 1)};
  }

  return {};
}

function createKeyCountMarker(latLng: [number, number], count: number, portalRadius: number): LeafletLayer {
  return L.marker(latLng, {
    icon: L.divIcon({
      className: 'iitc-iris-key-count-label',
      html: String(count),
      iconSize: [20, 14],
      iconAnchor: [10, portalRadius + 12],
    }),
    interactive: false,
    keyboard: false,
    pane: getLayerPane('labels'),
    zIndexOffset: 1001,
  });
}

function toRenderArtifacts(artifacts: IitcPortalArtifact[]): IitcIrisRenderArtifact[] | undefined {
  return artifacts.length > 0 ? artifacts : undefined;
}

function isRawGameEntity(value: unknown): value is IitcRawGameEntity {
  return Array.isArray(value) &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'number' &&
    Array.isArray(value[2]);
}

function isPortalSummary(value: unknown): value is unknown[] {
  return Array.isArray(value) && value[0] === 'p';
}

function ensureLayers(): NonNullable<Window['__iitcIrisLayers']> {
  if (window.__iitcIrisLayers) return window.__iitcIrisLayers;

  window.__iitcIrisLayers = {
    tiles: [],
    fields: [],
    links: [],
    portals: [],
    selectedPortal: [],
    selectedMapObject: [],
    ornaments: [],
    artifacts: [],
    labels: [],
    drawnItems: [],
    playerTracker: [],
    search: [],
    missions: [],
    userLocation: [],
  };
  return window.__iitcIrisLayers;
}

function clearRenderedLayers(layers: LeafletLayer[]): void {
  while (layers.length > 0) {
    const layer = layers.pop();
    layer?.remove();
  }
}

function addRenderedLayer(layers: LeafletLayer[], layer: LeafletLayer): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  layer.addTo(map);
  layers.push(layer);
}

function getLayerPane(layerKey: IitcIrisLayerPaneKey): string {
  return `iitc-iris-${layerKey}`;
}

function getLayerRenderer(layerKey: 'fields' | 'links' | 'portals'): L.Renderer | undefined {
  const map = window.__iitcIrisMap;
  if (!map) return undefined;
  const rendererKey = `__iitcIris${layerKey[0].toUpperCase()}${layerKey.slice(1)}Renderer`;
  const runtimeMap = map as LeafletMap & Record<string, L.Renderer | undefined>;
  runtimeMap[rendererKey] ??= L.canvas({pane: getLayerPane(layerKey)});
  return runtimeMap[rendererKey];
}

function loadIitcDrawToolsItems(): IitcDrawToolsItem[] {
  try {
    const stored = window.localStorage.getItem(IITC_DRAW_TOOLS_KEY_STORAGE);
    return stored ? parseIitcDrawToolsLayer(stored) : [];
  } catch (error) {
    console.warn(`draw-tools: failed to load data from localStorage: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function saveIitcDrawToolsItems(items: readonly IitcDrawToolsItem[]): void {
  window.localStorage.setItem(IITC_DRAW_TOOLS_KEY_STORAGE, serializeIitcDrawToolsLayer(items));
}

function getIitcDrawToolsSupportedItems(items = loadIitcDrawToolsItems()): NonNullable<IitcIrisMessage['drawToolsItems']> {
  const supportedItems: NonNullable<IitcIrisMessage['drawToolsItems']> = [];
  items.forEach((item, storageIndex) => {
    if (item.type === 'polyline') supportedItems.push({...item, storageIndex});
    if (item.type === 'marker') supportedItems.push({...item, storageIndex});
  });
  return supportedItems;
}

function postIitcDrawToolsStatus(statusText?: string, error?: string): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.drawToolsStatus,
    drawToolsItems: getIitcDrawToolsSupportedItems(),
    drawToolsStatusText: statusText,
    drawToolsError: error,
  } satisfies IitcIrisMessage, '*');
}

function getIitcDrawToolsRenderColor(color: string | undefined): string {
  if (!color) return IITC_DRAW_TOOLS_DEFAULT_COLOR;
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : IITC_DRAW_TOOLS_DEFAULT_COLOR;
}

function distanceToSegmentMeters(
  point: {lat: number; lng: number},
  start: {lat: number; lng: number},
  end: {lat: number; lng: number},
): number {
  const map = window.__iitcIrisMap;
  if (!map) return Infinity;
  const zoom = map.getZoom();
  const pointLayer = map.project([point.lat, point.lng], zoom);
  const startLayer = map.project([start.lat, start.lng], zoom);
  const endLayer = map.project([end.lat, end.lng], zoom);
  const segmentX = endLayer.x - startLayer.x;
  const segmentY = endLayer.y - startLayer.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const t = segmentLengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((pointLayer.x - startLayer.x) * segmentX + (pointLayer.y - startLayer.y) * segmentY) / segmentLengthSquared));
  const closest = map.unproject([startLayer.x + segmentX * t, startLayer.y + segmentY * t], zoom);
  return map.distance([point.lat, point.lng], closest);
}

function getIitcDrawToolsItemDistanceMeters(item: IitcDrawToolsItem, lat: number, lng: number): number {
  const map = window.__iitcIrisMap;
  if (!map) return Infinity;
  const point = {lat, lng};

  if (item.type === 'marker') return map.distance([lat, lng], [item.latLng.lat, item.latLng.lng]);
  if (item.type !== 'polyline') return Infinity;

  let closest = Infinity;
  for (let index = 1; index < item.latLngs.length; index += 1) {
    closest = Math.min(closest, distanceToSegmentMeters(point, item.latLngs[index - 1], item.latLngs[index]));
  }
  return closest;
}

function getIitcSegmentBounds(
  a: {lng: number; lat: number},
  b: {lng: number; lat: number},
): {minLng: number; minLat: number; maxLng: number; maxLat: number} {
  return {
    minLng: Math.min(a.lng, b.lng),
    minLat: Math.min(a.lat, b.lat),
    maxLng: Math.max(a.lng, b.lng),
    maxLat: Math.max(a.lat, b.lat),
  };
}

function iitcSegmentBoundsOverlap(
  a: {minLng: number; minLat: number; maxLng: number; maxLat: number},
  b: {minLng: number; minLat: number; maxLng: number; maxLat: number},
): boolean {
  return a.minLng <= b.maxLng &&
    a.maxLng >= b.minLng &&
    a.minLat <= b.maxLat &&
    a.maxLat >= b.minLat;
}

function iitcSegmentsIntersect(
  a: {lng: number; lat: number},
  b: {lng: number; lat: number},
  c: {lng: number; lat: number},
  d: {lng: number; lat: number},
): boolean {
  const denominator = ((a.lng - b.lng) * (c.lat - d.lat)) - ((a.lat - b.lat) * (c.lng - d.lng));
  if (Math.abs(denominator) < 1e-12) return false;

  const t = (((a.lng - c.lng) * (c.lat - d.lat)) - ((a.lat - c.lat) * (c.lng - d.lng))) / denominator;
  const u = -(((a.lng - b.lng) * (a.lat - c.lat)) - ((a.lat - b.lat) * (a.lng - c.lng))) / denominator;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function getIitcDrawToolsGeodesicSegments(latLngs: readonly {lat: number; lng: number}[]): {a: {lat: number; lng: number}; b: {lat: number; lng: number}}[] {
  const points = convertIitcGeodesicLatLngs(latLngs.map((latLng) => [latLng.lat, latLng.lng]));
  return points.slice(1).map((latLng, index) => ({
    a: {lat: points[index].lat, lng: points[index].lng},
    b: {lat: latLng.lat, lng: latLng.lng},
  }));
}

function snapIitcDrawToolsToPortals(): void {
  const map = window.__iitcIrisMap;
  if (!map || !latestEntities) {
    postIitcDrawToolsStatus(undefined, 'snap unavailable');
    return;
  }

  const visibleBounds = map.getBounds();
  const visiblePortals = latestEntities.portals
    .filter((portal) => !portal.isPlaceholder)
    .map((portal) => ({
      latLng: {lat: portal.latE6 / 1_000_000, lng: portal.lngE6 / 1_000_000},
      point: map.project(toLatLng(portal.latE6, portal.lngE6)),
    }))
    .filter((portal) => visibleBounds.contains(portal.latLng));

  if (visiblePortals.length === 0) {
    postIitcDrawToolsStatus('snap tested 0, moved 0', 'no visible portals');
    return;
  }

  const findClosestPortalLatLng = (latLng: {lat: number; lng: number}): {lat: number; lng: number} | undefined => {
    const point = map.project([latLng.lat, latLng.lng]);
    let bestPortal: typeof visiblePortals[number] | undefined;
    let bestDistanceSquared = Infinity;

    for (const portal of visiblePortals) {
      const distanceSquared = point.distanceTo(portal.point) ** 2;
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestPortal = portal;
      }
    }

    if (!bestPortal || (bestPortal.latLng.lat === latLng.lat && bestPortal.latLng.lng === latLng.lng)) return undefined;
    return bestPortal.latLng;
  };

  let testedCount = 0;
  let changedCount = 0;
  let anyChanged = false;

  const snapLatLng = (latLng: {lat: number; lng: number}): {lat: number; lng: number} => {
    if (!visibleBounds.contains(latLng)) return latLng;
    testedCount += 1;
    const snapped = findClosestPortalLatLng(latLng);
    if (!snapped) return latLng;
    changedCount += 1;
    anyChanged = true;
    return snapped;
  };

  const items = loadIitcDrawToolsItems().map((item): IitcDrawToolsItem => {
    if (item.type === 'marker') return {...item, latLng: snapLatLng(item.latLng)};
    if (item.type === 'circle') return {...item, latLng: snapLatLng(item.latLng)};
    if (item.type === 'polyline') return {...item, latLngs: item.latLngs.map(snapLatLng)};
    if (item.type === 'polygon') return {...item, latLngs: item.latLngs.map(snapLatLng)};
    return item;
  });

  if (anyChanged) {
    saveIitcDrawToolsItems(items);
    renderIitcDrawTools();
  }

  const incompleteWarning = latestPlan && !latestPlan.tileParams.hasPortals ? '; portal data may be incomplete' : '';
  postIitcDrawToolsStatus(`snap tested ${testedCount}, moved ${changedCount}${incompleteWarning}`);
}

function deleteIitcDrawToolsItemAt(lat: number, lng: number, itemType?: 'polyline' | 'marker'): boolean {
  const items = loadIitcDrawToolsItems();
  let bestIndex = -1;
  let bestDistance = Infinity;

  items.forEach((item, index) => {
    if (itemType && item.type !== itemType) return;
    const distance = getIitcDrawToolsItemDistanceMeters(item, lat, lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  if (bestIndex === -1 || bestDistance > 100) return false;
  saveIitcDrawToolsItems(items.filter((_, index) => index !== bestIndex));
  renderIitcDrawTools();
  postIitcDrawToolsStatus();
  return true;
}

function applyIitcDrawToolsAction(message: IitcIrisMessage): void {
  const action = message.drawToolsAction;
  if (!action) return;

  if (action === 'requestStatus') {
    postIitcDrawToolsStatus();
    return;
  }

  if (action === 'clear') {
    saveIitcDrawToolsItems(message.drawToolsItemType
      ? loadIitcDrawToolsItems().filter((item) => item.type !== message.drawToolsItemType)
      : []);
    renderIitcDrawTools();
    postIitcDrawToolsStatus();
    return;
  }

  if (action === 'deleteAt') {
    if (message.drawToolsLatLngs?.[0]) {
      deleteIitcDrawToolsItemAt(message.drawToolsLatLngs[0].lat, message.drawToolsLatLngs[0].lng, message.drawToolsItemType);
    }
    return;
  }

  if (action === 'deleteIndex') {
    const items = loadIitcDrawToolsItems();
    if (message.drawToolsIndex !== undefined && items[message.drawToolsIndex]) {
      saveIitcDrawToolsItems(items.filter((_, index) => index !== message.drawToolsIndex));
      renderIitcDrawTools();
    }
    postIitcDrawToolsStatus();
    return;
  }

  if (action === 'undo') {
    const items = loadIitcDrawToolsItems();
    const index = [...items].reverse().findIndex((item) => !message.drawToolsItemType || item.type === message.drawToolsItemType);
    if (index >= 0) {
      const storageIndex = items.length - 1 - index;
      saveIitcDrawToolsItems(items.filter((_, itemIndex) => itemIndex !== storageIndex));
      renderIitcDrawTools();
    }
    postIitcDrawToolsStatus();
    return;
  }

  if (action === 'import') {
    try {
      const importedItems = parseIitcDrawToolsLayer(message.drawToolsJson ?? '').filter((item) => item.type === 'polyline' || item.type === 'marker');
      const nextItems = importIitcDrawToolsItems(loadIitcDrawToolsItems(), importedItems, {merge: message.drawToolsMerge !== false});
      saveIitcDrawToolsItems(nextItems);
      renderIitcDrawTools();
      postIitcDrawToolsStatus();
    } catch (error) {
      postIitcDrawToolsStatus(undefined, error instanceof Error ? error.message : String(error));
    }
    return;
  }

  if (action === 'snapToPortals') {
    snapIitcDrawToolsToPortals();
    return;
  }

  const items = loadIitcDrawToolsItems();
  if (action === 'addMarker' && message.drawToolsLatLngs?.[0]) {
    const latLng = message.drawToolsLatLngs[0];
    saveIitcDrawToolsItems([...items, {
      type: 'marker',
      latLng,
      color: message.drawToolsColor ?? IITC_DRAW_TOOLS_DEFAULT_COLOR,
    }]);
    renderIitcDrawTools();
    postIitcDrawToolsStatus();
    return;
  }

  if (action === 'addPolyline' && message.drawToolsLatLngs && message.drawToolsLatLngs.length >= 2) {
    saveIitcDrawToolsItems([...items, {
      type: 'polyline',
      latLngs: message.drawToolsLatLngs,
      color: message.drawToolsColor ?? IITC_DRAW_TOOLS_DEFAULT_COLOR,
    }]);
    renderIitcDrawTools();
    postIitcDrawToolsStatus();
  }
}

function createIitcDrawToolsMarkerIcon(color = IITC_DRAW_TOOLS_DEFAULT_COLOR): L.DivIcon {
  const markerColor = getIitcDrawToolsRenderColor(color);
  return L.divIcon({
    className: 'iitc-iris-draw-tools-marker',
    html: [
      `<svg viewBox="0 0 25 41" style="fill:${markerColor}" aria-hidden="true" focusable="false">`,
      '<path d="M1.36241844765,18.67488124675 A12.5,12.5 0 1,1 23.63758155235,18.67488124675 L12.5,40.5336158073 Z" style="stroke:none;" />',
      '<path d="M1.80792170975,18.44788599685 A12,12 0 1,1 23.19207829025,18.44788599685 L12.5,39.432271175 Z" style="stroke:#000000; stroke-width:1px; stroke-opacity:0.15; fill:none;" />',
      '<path d="M2.921679865,17.8803978722 A10.75,10.75 0 1,1 22.078320135,17.8803978722 L12.5,36.6789095943 Z" style="stroke:#ffffff; stroke-width:1.5px; stroke-opacity:0.35; fill:none;" />',
      '<path d="M19.86121593215,17.25 L12.5,21.5 L5.13878406785,17.25 L5.13878406785,8.75 L12.5,4.5 L19.86121593215,8.75 Z M7.7368602792,10.25 L17.2631397208,10.25 L12.5,18.5 Z M12.5,13 L7.7368602792,10.25 M12.5,13 L17.2631397208,10.25 M12.5,13 L12.5,18.5 M19.86121593215,17.25 L16.39711431705,15.25 M5.13878406785,17.25 L8.60288568295,15.25 M12.5,4.5 L12.5,8.5" style="stroke:#ffffff; stroke-width:1.25px; stroke-opacity:1; fill:none;" />',
      '</svg>',
    ].join(''),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

function createIitcDrawToolsPolyline(item: IitcDrawToolsPolyline): LeafletLayer {
  return createIitcGeodesicPolyline(item.latLngs.map((latLng) => [latLng.lat, latLng.lng]), {
    pane: getLayerPane('drawnItems'),
    color: getIitcDrawToolsRenderColor(item.color),
    weight: DRAW_TOOLS_LINE_WEIGHT,
    opacity: DRAW_TOOLS_LINE_OPACITY,
    fill: false,
    interactive: false,
  });
}

function createIitcDrawToolsCrossingLink(link: IitcIrisRenderLink): LeafletLayer {
  return createIitcGeodesicPolyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
    pane: getLayerPane('drawnItems'),
    color: DRAW_TOOLS_CROSSING_COLOR,
    opacity: 0.95,
    weight: 4,
    dashArray: '4,4',
    interactive: false,
  });
}

function renderIitcDrawToolsCrossings(items: readonly IitcDrawToolsItem[]): void {
  const layers = ensureLayers();
  if (!latestEntities || !layerSettings.drawnLinks || !layerSettings.links) return;

  const drawnSegments = items
    .filter((item): item is IitcDrawToolsPolyline => item.type === 'polyline')
    .flatMap((item) => getIitcDrawToolsGeodesicSegments(item.latLngs));
  if (drawnSegments.length === 0) return;

  const crossingLinkGuids = new Set<string>();
  for (const link of latestEntities.links) {
    if (!isLinkVisible(link)) continue;
    const linkSegments = getIitcDrawToolsGeodesicSegments([
      {lat: link.oLatE6 / 1_000_000, lng: link.oLngE6 / 1_000_000},
      {lat: link.dLatE6 / 1_000_000, lng: link.dLngE6 / 1_000_000},
    ]);
    if (drawnSegments.some((drawnSegment) => (
      linkSegments.some((linkSegment) => (
        iitcSegmentBoundsOverlap(getIitcSegmentBounds(drawnSegment.a, drawnSegment.b), getIitcSegmentBounds(linkSegment.a, linkSegment.b)) &&
        iitcSegmentsIntersect(drawnSegment.a, drawnSegment.b, linkSegment.a, linkSegment.b)
      ))
    ))) {
      crossingLinkGuids.add(link.guid);
    }
  }

  for (const link of latestEntities.links) {
    if (crossingLinkGuids.has(link.guid)) addRenderedLayer(layers.drawnItems, createIitcDrawToolsCrossingLink(link));
  }
}

function createIitcDrawToolsMarker(item: IitcDrawToolsMarker): LeafletLayer {
  return L.marker([item.latLng.lat, item.latLng.lng], {
    pane: getLayerPane('drawnItems'),
    icon: createIitcDrawToolsMarkerIcon(item.color),
    interactive: false,
    keyboard: false,
    zIndexOffset: 2000,
  });
}

function renderIitcDrawTools(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.drawnItems);
  const items = loadIitcDrawToolsItems();
  for (const item of items) {
    if (item.type === 'polyline' && layerSettings.drawnLinks) {
      addRenderedLayer(layers.drawnItems, createIitcDrawToolsPolyline(item));
    } else if (item.type === 'marker' && layerSettings.drawnMarkers) {
      addRenderedLayer(layers.drawnItems, createIitcDrawToolsMarker(item));
    }
  }
  renderIitcDrawToolsCrossings(items);
}

function clearAllRenderedLayers(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.tiles);
  clearRenderedLayers(layers.fields);
  clearRenderedLayers(layers.links);
  clearRenderedLayers(layers.portals);
  clearRenderedLayers(layers.selectedPortal);
  clearRenderedLayers(layers.selectedMapObject);
  clearRenderedLayers(layers.ornaments);
  clearRenderedLayers(layers.artifacts);
  clearRenderedLayers(layers.labels);
  clearRenderedLayers(layers.drawnItems);
  clearRenderedLayers(layers.playerTracker);
  clearRenderedLayers(layers.missions);
  clearRenderedLayers(layers.userLocation);
}

function clearEntityLayers(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.fields);
  clearRenderedLayers(layers.links);
  clearRenderedLayers(layers.portals);
  clearRenderedLayers(layers.selectedPortal);
  clearRenderedLayers(layers.selectedMapObject);
  clearRenderedLayers(layers.ornaments);
  clearRenderedLayers(layers.artifacts);
  clearRenderedLayers(layers.labels);
}

function createOrnamentMarker(latLng: [number, number], ornament: string, portalRadius: number): LeafletLayer {
  const definition = getIitcOrnamentDefinition(ornament);
  const size = Math.round(60 * getPortalMarkerScale(window.__iitcIrisMap?.getZoom() ?? DEFAULT_ZOOM));
  const iconUrl = definition?.url ?? `https://commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/${ornament}.png`;
  const offset = definition?.url && definition.offset ? definition.offset : [0, 0];
  const anchor: [number, number] = [
    size * offset[0] + size / 2,
    size * offset[1] + size / 2,
  ];

  return L.marker(latLng, {
    icon: L.icon({
      iconUrl,
      iconSize: [size, size],
      iconAnchor: anchor,
      className: 'iitc-iris-ornament-icon',
    }),
    interactive: false,
    keyboard: false,
    opacity: definition?.opacity ?? 0.6,
    pane: getLayerPane('ornaments'),
    zIndexOffset: Math.round(portalRadius),
  });
}

function loadOrnamentVisibilitySettings(): IitcOrnamentVisibilitySettings {
  let excludedOrnaments: unknown = [];
  let knownOrnaments: unknown = {};
  let layerGroupDisplayed: unknown = {};
  try {
    const rawExcluded = window.localStorage.getItem('excludedOrnaments');
    excludedOrnaments = rawExcluded ? JSON.parse(rawExcluded) : [];
  } catch {
    excludedOrnaments = [];
  }
  try {
    const rawKnown = window.localStorage.getItem('knownOrnaments');
    knownOrnaments = rawKnown ? JSON.parse(rawKnown) : {};
  } catch {
    knownOrnaments = {};
  }
  try {
    const rawLayers = window.localStorage.getItem('ingress.intelmap.layergroupdisplayed');
    layerGroupDisplayed = rawLayers ? JSON.parse(rawLayers) : {};
  } catch {
    layerGroupDisplayed = {};
  }
  return parseIitcOrnamentVisibilitySettings({
    excludedOrnaments,
    knownOrnaments,
    layerGroupDisplayed,
  });
}

function createEmptyOrnamentDiagnostics(): OrnamentDiagnostics {
  return {
    drawnMarkers: 0,
    hiddenMarkers: 0,
    types: {},
  };
}

function createArtifactMarker(latLng: [number, number], artifact: IitcIrisRenderArtifact): LeafletLayer {
  const isTarget = artifact.role === 'target';
  const size = isTarget ? 50 : 30;
  const suffix = isTarget ? 'shard_target' : 'shard';
  const iconUrl = `https://commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/${artifact.type}_${suffix}.png`;

  return L.marker(latLng, {
    icon: L.icon({
      iconUrl,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: 'iitc-iris-artifact-icon',
    }),
    interactive: false,
    keyboard: false,
    opacity: isTarget ? 1 : 0.6,
    pane: getLayerPane('artifacts'),
    zIndexOffset: isTarget ? 1200 : 1100,
  });
}

function toSelectedPortal(portal: IitcIrisRenderPortal): IitcIrisSelectedPortal {
  const incomingLinks = latestEntities?.links.filter((link) => link.dGuid === portal.guid) ?? [];
  const outgoingLinks = latestEntities?.links.filter((link) => link.oGuid === portal.guid) ?? [];
  const linkGuids = [...outgoingLinks, ...incomingLinks].map((link) => link.guid);
  const fieldGuids = latestEntities?.fields
    .filter((field) => field.points.some((point) => point.guid === portal.guid))
    .map((field) => field.guid) ?? [];

  return {
    guid: portal.guid,
    title: portal.title,
    image: portal.image,
    team: portal.team,
    latE6: portal.latE6,
    lngE6: portal.lngE6,
    level: portal.level,
    health: portal.health,
    resCount: portal.resCount,
    mission: portal.mission,
    mission50plus: portal.mission50plus,
    isPlaceholder: portal.isPlaceholder,
    ornaments: portal.ornaments ?? [],
    artifacts: portal.artifacts ?? [],
    links: {
      count: linkGuids.length,
      incoming: incomingLinks.length,
      outgoing: outgoingLinks.length,
      guids: linkGuids,
    },
    fields: {
      count: fieldGuids.length,
      guids: fieldGuids,
    },
  };
}

function createSelectedPortalMarker(portal: IitcIrisRenderPortal): LeafletLayer {
  const radius = Math.max(10, getPortalRadius(portal.level, portal.isPlaceholder) + 5);
  return L.circleMarker(toLatLng(portal.latE6, portal.lngE6), {
    radius,
    color: '#ff9900',
    fill: false,
    opacity: 1,
    pane: getLayerPane('selectedPortal'),
    weight: 4,
    interactive: false,
  });
}

function createSelectedLinkMarker(link: IitcIrisRenderLink): LeafletLayer {
  return createIitcGeodesicPolyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
    color: '#ff9900',
    opacity: 0.95,
    pane: getLayerPane('selectedMapObject'),
    weight: 5,
    interactive: false,
  });
}

function createSelectedFieldMarker(field: IitcIrisRenderField): LeafletLayer {
  return createIitcGeodesicPolygon(field.points.map((point) => toLatLng(point.latE6, point.lngE6)), {
    color: '#ff9900',
    fill: false,
    opacity: 0.95,
    pane: getLayerPane('selectedMapObject'),
    weight: 4,
    interactive: false,
  });
}

function renderSelectedPortal(visiblePortals: IitcIrisRenderPortal[]): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.selectedPortal);
  if (!selectedPortalGuid) {
    selectedPortal = null;
    return;
  }

  const portal = latestEntities?.portals.find((candidate) => candidate.guid === selectedPortalGuid);
  if (!portal) {
    selectedPortal = null;
    return;
  }

  selectedPortal = toSelectedPortal(portal);
  if (!visiblePortals.some((candidate) => candidate.guid === portal.guid)) return;
  addRenderedLayer(layers.selectedPortal, createSelectedPortalMarker(portal));
}

function renderSelectedMapObject(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.selectedMapObject);
  if (!selectedMapObject || !latestEntities) return;

  if (selectedMapObject.type === 'link') {
    const link = latestEntities.links.find((candidate) => candidate.guid === selectedMapObject?.guid);
    if (link && isLinkVisible(link)) addRenderedLayer(layers.selectedMapObject, createSelectedLinkMarker(link));
    return;
  }

  const field = latestEntities.fields.find((candidate) => candidate.guid === selectedMapObject?.guid);
  if (field && isFieldVisible(field) && field.points.length >= 3) addRenderedLayer(layers.selectedMapObject, createSelectedFieldMarker(field));
}

function selectMapObject(type: 'link' | 'field', guid: string): void {
  selectedMapObject = {type, guid};
  renderSelectedMapObject();
}

function clearSelectedMapObject(): void {
  selectedMapObject = null;
  clearRenderedLayers(ensureLayers().selectedMapObject);
}

function selectPortal(portal: IitcIrisRenderPortal, rerender = true): void {
  selectedMapObject = null;
  selectedPortalGuid = portal.guid;
  selectedPortal = toSelectedPortal(portal);
  pendingPortalSelection = null;
  refreshInventorySelectedPortalState();
  postInventoryState();
  void refreshSelectedPortalDetails(portal.guid);
  if (rerender && latestEntities) renderEntities(latestEntities);
  repostLatestEntityStatus();
}

function postMapContext(lat: number, lng: number, portal?: IitcIrisRenderPortal): void {
  const map = window.__iitcIrisMap;
  lastContextPostAt = performance.now();
  window.postMessage(createIitcIrisMapContextMessage({lat, lng, zoom: map?.getZoom(), portal}), '*');
}

function postPortalContextReference(guid: string | undefined, lat: number, lng: number): void {
  const map = window.__iitcIrisMap;
  lastContextPostAt = performance.now();
  window.postMessage(createIitcIrisMapContextMessage({
    lat,
    lng,
    zoom: map?.getZoom(),
    portalGuid: guid,
    portalLat: lat,
    portalLng: lng,
  }), '*');
}

function postMapObjectContext(
  contextTarget: 'link' | 'field',
  lat: number,
  lng: number,
  object: {guid: string; team: 'E' | 'R' | 'N' | 'M'; portalGuids: string[]; portalAnchors: IitcIrisMapContextPortalAnchor[]; distanceMeters?: number},
): void {
  const map = window.__iitcIrisMap;
  lastContextPostAt = performance.now();
  window.postMessage(createIitcIrisMapContextMessage({
    contextTarget,
    lat,
    lng,
    zoom: map?.getZoom(),
    contextGuid: object.guid,
    contextTeam: object.team,
    contextPortalGuids: object.portalGuids,
    contextPortalAnchors: object.portalAnchors,
    contextDistanceMeters: object.distanceMeters,
  }), '*');
}

function openPortalContext(portal: IitcIrisRenderPortal, event?: LeafletMouseEvent): void {
  if (event) L.DomEvent.stop(event);
  suppressPortalClickUntil = Date.now() + LONG_PRESS_CLICK_SUPPRESS_MS;
  selectPortal(portal);
  postMapContext(portal.latE6 / 1_000_000, portal.lngE6 / 1_000_000, portal);
}

function openMapContextAtPoint(point: L.Point): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  const portal = findContextPortalAtPoint(point);
  if (portal) {
    openPortalContext(portal);
    return;
  }
  const link = findContextLinkAtPoint(point);
  if (link) {
    const latLng = map.containerPointToLatLng(point);
    selectMapObject('link', link.guid);
    postMapObjectContext('link', latLng.lat, latLng.lng, {
      guid: link.guid,
      team: link.team,
      portalGuids: getLinkPortalGuids(link),
      portalAnchors: getLinkPortalAnchors(link),
      distanceMeters: getLinkDistanceMeters(link),
    });
    return;
  }
  const field = findContextFieldAtPoint(point);
  if (field) {
    const latLng = map.containerPointToLatLng(point);
    selectMapObject('field', field.guid);
    postMapObjectContext('field', latLng.lat, latLng.lng, {
      guid: field.guid,
      team: field.team,
      portalGuids: getFieldPortalGuids(field),
      portalAnchors: getFieldPortalAnchors(field),
      distanceMeters: getFieldPerimeterMeters(field),
    });
    return;
  }
  const latLng = map.containerPointToLatLng(point);
  clearSelectedMapObject();
  postMapContext(latLng.lat, latLng.lng);
}

function findContextPortalAtPoint(point: L.Point): IitcIrisRenderPortal | undefined {
  const map = window.__iitcIrisMap;
  if (!map || !latestEntities) return undefined;

  let nearest: {portal: IitcIrisRenderPortal; distance: number} | undefined;
  for (const portal of latestEntities.portals) {
    if (!isPortalVisible(portal)) continue;
    const portalPoint = map.latLngToContainerPoint(toLatLng(portal.latE6, portal.lngE6));
    const distance = point.distanceTo(portalPoint);
    const hitTolerance = getPortalRadius(portal.level, portal.isPlaceholder) + PORTAL_CONTEXT_HIT_TOLERANCE_PX;
    if (distance > hitTolerance) continue;
    if (!nearest || distance < nearest.distance) nearest = {portal, distance};
  }
  return nearest?.portal;
}

function getPointToSegmentDistance(point: L.Point, start: L.Point, end: L.Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return point.distanceTo(start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return point.distanceTo(L.point(start.x + t * dx, start.y + t * dy));
}

function getDistanceMeters(from: {latE6: number; lngE6: number}, to: {latE6: number; lngE6: number}): number {
  const earthRadiusMeters = 6_371_000;
  const lat1 = from.latE6 / 1_000_000 * Math.PI / 180;
  const lat2 = to.latE6 / 1_000_000 * Math.PI / 180;
  const deltaLat = lat2 - lat1;
  const deltaLng = (to.lngE6 - from.lngE6) / 1_000_000 * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPortalLabelByGuid(guid: string | undefined, fallback: string): string {
  if (!guid || !latestEntities) return fallback;
  const portal = latestEntities.portals.find((candidate) => candidate.guid === guid);
  return portal?.title || guid;
}

function getLinkPortalGuids(link: IitcIrisRenderLink): string[] {
  return [link.oGuid, link.dGuid].filter((guid): guid is string => Boolean(guid));
}

function getLinkPortalAnchors(link: IitcIrisRenderLink): IitcIrisMapContextPortalAnchor[] {
  return [
    {
      guid: link.oGuid,
      label: getPortalLabelByGuid(link.oGuid, `${(link.oLatE6 / 1_000_000).toFixed(6)}, ${(link.oLngE6 / 1_000_000).toFixed(6)}`),
      latE6: link.oLatE6,
      lngE6: link.oLngE6,
    },
    {
      guid: link.dGuid,
      label: getPortalLabelByGuid(link.dGuid, `${(link.dLatE6 / 1_000_000).toFixed(6)}, ${(link.dLngE6 / 1_000_000).toFixed(6)}`),
      latE6: link.dLatE6,
      lngE6: link.dLngE6,
    },
  ];
}

function getLinkDistanceMeters(link: IitcIrisRenderLink): number {
  return getDistanceMeters(
    {latE6: link.oLatE6, lngE6: link.oLngE6},
    {latE6: link.dLatE6, lngE6: link.dLngE6},
  );
}

function getFieldPortalGuids(field: IitcIrisRenderField): string[] {
  return field.points.map((fieldPoint) => fieldPoint.guid).filter((guid): guid is string => Boolean(guid));
}

function getFieldPortalAnchors(field: IitcIrisRenderField): IitcIrisMapContextPortalAnchor[] {
  return field.points.map((fieldPoint) => ({
    guid: fieldPoint.guid,
    label: getPortalLabelByGuid(
      fieldPoint.guid,
      `${(fieldPoint.latE6 / 1_000_000).toFixed(6)}, ${(fieldPoint.lngE6 / 1_000_000).toFixed(6)}`,
    ),
    latE6: fieldPoint.latE6,
    lngE6: fieldPoint.lngE6,
  }));
}

function getFieldPerimeterMeters(field: IitcIrisRenderField): number | undefined {
  if (field.points.length < 2) return undefined;
  return field.points.reduce((total, point, index) => {
    const next = field.points[(index + 1) % field.points.length];
    return total + getDistanceMeters(point, next);
  }, 0);
}

function findContextLinkAtPoint(point: L.Point): IitcIrisRenderLink | undefined {
  const map = window.__iitcIrisMap;
  if (!map || !latestEntities) return undefined;

  let nearest: {link: IitcIrisRenderLink; distance: number} | undefined;
  for (const link of latestEntities.links) {
    if (!isLinkVisible(link)) continue;
    const linePoints = convertIitcGeodesicLatLngs([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)])
      .map((latLng) => map.latLngToContainerPoint(latLng));
    for (let index = 0; index < linePoints.length - 1; index += 1) {
      const distance = getPointToSegmentDistance(point, linePoints[index], linePoints[index + 1]);
      if (distance > LINK_CONTEXT_HIT_TOLERANCE_PX) continue;
      if (!nearest || distance < nearest.distance) nearest = {link, distance};
    }
  }
  return nearest?.link;
}

function isPointInPolygon(point: L.Point, polygon: L.Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function getPolygonArea(points: L.Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2);
}

function findContextFieldAtPoint(point: L.Point): IitcIrisRenderField | undefined {
  const map = window.__iitcIrisMap;
  if (!map || !latestEntities) return undefined;

  let smallest: {field: IitcIrisRenderField; area: number} | undefined;
  for (const field of latestEntities.fields) {
    if (!isFieldVisible(field) || field.points.length < 3) continue;
    const polygon = convertIitcGeodesicLatLngs(field.points.map((fieldPoint) => toLatLng(fieldPoint.latE6, fieldPoint.lngE6)), {closed: true})
      .map((latLng) => map.latLngToContainerPoint(latLng));
    if (!isPointInPolygon(point, polygon)) continue;
    const area = getPolygonArea(polygon);
    if (!smallest || area < smallest.area) smallest = {field, area};
  }
  return smallest?.field;
}

function findPortalByGuidOrLatLng(guid: string | undefined, lat: number | undefined, lng: number | undefined): IitcIrisRenderPortal | undefined {
  if (!latestEntities) return undefined;
  if (guid) {
    const portal = latestEntities.portals.find((candidate) => candidate.guid === guid);
    if (portal) return portal;
  }
  if (lat === undefined || lng === undefined) return undefined;
  const latE6 = Math.round(lat * 1_000_000);
  const lngE6 = Math.round(lng * 1_000_000);
  return latestEntities.portals.find((portal) => Math.abs(portal.latE6 - latE6) <= 1 && Math.abs(portal.lngE6 - lngE6) <= 1);
}

function selectPortalByLatLng(lat: number | undefined, lng: number | undefined): IitcIrisRenderPortal | undefined {
  const portal = findPortalByGuidOrLatLng(undefined, lat, lng);
  if (portal) {
    selectPortal(portal);
    return portal;
  }
  if (lat !== undefined && lng !== undefined) pendingPortalSelection = {lat, lng};
  return undefined;
}

function zoomToAndShowPortal(guid: string | undefined, lat: number | undefined, lng: number | undefined, zoom: number | undefined): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  const portal = guid ? findPortalByGuidOrLatLng(guid, lat, lng) : selectPortalByLatLng(lat, lng);
  if (portal) {
    const latLng = toLatLng(portal.latE6, portal.lngE6);
    map.setView(latLng, zoom ?? Math.max(map.getZoom(), 15));
    if (guid) selectPortal(portal);
    return;
  }
  if (lat === undefined || lng === undefined) {
    if (guid) pendingPortalSelection = {guid};
    return;
  }
  pendingPortalSelection = {guid, lat, lng};
  map.setView([lat, lng], zoom ?? Math.max(map.getZoom(), 15));
}

function selectMissionWaypoint(waypoint: IitcIrisMissionWaypoint): void {
  const map = window.__iitcIrisMap;
  if (!map || waypoint.latE6 === undefined || waypoint.lngE6 === undefined) return;
  zoomToAndShowPortal(
    waypoint.portalGuid,
    waypoint.latE6 / 1_000_000,
    waypoint.lngE6 / 1_000_000,
    Math.max(map.getZoom(), 15),
  );
}

function openMissionWaypointContext(waypoint: IitcIrisMissionWaypoint, event?: LeafletMouseEvent): void {
  if (event) L.DomEvent.stop(event);
  if (waypoint.latE6 === undefined || waypoint.lngE6 === undefined) return;
  const lat = waypoint.latE6 / 1_000_000;
  const lng = waypoint.lngE6 / 1_000_000;
  const portal = findPortalByGuidOrLatLng(waypoint.portalGuid, lat, lng);
  if (portal) {
    openPortalContext(portal);
    return;
  }
  suppressPortalClickUntil = Date.now() + LONG_PRESS_CLICK_SUPPRESS_MS;
  zoomToAndShowPortal(waypoint.portalGuid, lat, lng, undefined);
  postPortalContextReference(waypoint.portalGuid, lat, lng);
}

function clearPortalSelection(): void {
  selectedPortalGuid = undefined;
  selectedPortal = null;
  pendingPortalSelection = null;
  latestPortalDetails = null;
  refreshInventorySelectedPortalState();
  postInventoryState();
  cancelActivePortalDetailsFetch();
  clearRenderedLayers(ensureLayers().selectedPortal);
  repostLatestEntityStatus();
}

function describeSearchPortal(portal: IitcIrisRenderPortal): string {
  const team = portal.team === 'R' ? 'RES' : portal.team === 'E' ? 'ENL' : portal.team === 'M' ? 'MAC' : 'NEU';
  const level = portal.level === undefined || portal.isPlaceholder ? 'L-' : `L${portal.level}`;
  const health = portal.health === undefined || portal.isPlaceholder ? '-' : `${Math.round(portal.health)}%`;
  const resonators = portal.resCount === undefined || portal.isPlaceholder ? '-' : `${portal.resCount} Resonators`;
  return `${team}, ${level}, ${health}, ${resonators}`;
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function createPortalSearchResult(portal: IitcIrisRenderPortal, type: IitcIrisSearchResult['type'] = 'portal'): IitcIrisSearchResult {
  return {
    id: `${type}:${portal.guid}`,
    type,
    title: portal.title || portal.guid,
    description: describeSearchPortal(portal),
    lat: portal.latE6 / 1e6,
    lng: portal.lngE6 / 1e6,
    guid: portal.guid,
    team: portal.team,
    level: portal.level,
    health: portal.health,
  };
}

function getLocalSearchResults(term: string): IitcIrisSearchResult[] {
  const normalized = normalizeSearchText(term);
  if ((normalized.length < SEARCH_AUTO_MIN_LENGTH && normalized.length > 0) || !latestEntities) return [];
  const results: IitcIrisSearchResult[] = [];
  if (normalized.length === 0) return results;

  const guidMatch = normalized.match(/[0-9a-f]{32}\.[0-9a-f]{2}/);
  if (guidMatch) {
    const portal = latestEntities.portals.find((candidate) => candidate.guid.toLowerCase() === guidMatch[0]);
    if (portal) results.push(createPortalSearchResult(portal, 'guid'));
  }

  for (const portal of latestEntities.portals) {
    if (!normalizeSearchText(portal.title).includes(normalized)) continue;
    if (results.some((result) => result.guid === portal.guid)) continue;
    results.push(createPortalSearchResult(portal));
    if (results.length >= 20) break;
  }

  return results;
}

function parseSearchCoordinateResults(term: string): IitcIrisSearchResult[] {
  const added = new Set<string>();
  const results: IitcIrisSearchResult[] = [];
  const addResult = (lat: number, lng: number): void => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const title = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (added.has(title)) return;
    added.add(title);
    results.push({id: `coordinate:${title}`, type: 'coordinate', title, description: 'geo coordinates', lat, lng});
  };

  const decimalMatches = term.replace(/%2C/gi, ',').match(/[+-]?\d+\.\d+, ?[+-]?\d+\.\d+/g);
  decimalMatches?.forEach((location) => {
    const [lat, lng] = location.split(',').map(Number);
    addResult(lat, lng);
  });

  const dmsRegex = /(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)?"\s*([NS]),?\s*(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)?"\s*([EW])/g;
  for (const match of term.matchAll(dmsRegex)) {
    const parseDms = (deg: string, min: string, sec: string, dir: string): number => {
      const decimal = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
      return dir === 'S' || dir === 'W' ? -decimal : decimal;
    };
    addResult(parseDms(match[1], match[2], match[3], match[4]), parseDms(match[5], match[6], match[7], match[8]));
  }

  return results;
}

interface NominatimResult {
  place_id?: number | string;
  display_name?: string;
  type?: string;
  lat?: string;
  lon?: string;
  icon?: string;
  boundingbox?: [string, string, string, string];
  geojson?: unknown;
}

async function fetchNominatimSearchResults(term: string): Promise<IitcIrisSearchResult[]> {
  const map = window.__iitcIrisMap;
  if (!map) return [];
  const bounds = map.getBounds();
  const viewbox = `&viewbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
  const seen = new Set<string>();
  const results: IitcIrisSearchResult[] = [];

  const fetchResults = async (bounded: boolean): Promise<boolean> => {
    const response = await fetch(`${NOMINATIM_SEARCH_URL}${encodeURIComponent(term)}${viewbox}${bounded ? '&bounded=1' : ''}`);
    const data = await response.json() as NominatimResult[];
    if (bounded && data.length === 0) return false;
    for (const item of data) {
      const key = String(item.place_id ?? `${item.lat},${item.lon},${item.display_name}`);
      if (seen.has(key)) continue;
      seen.add(key);
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      const result: IitcIrisSearchResult = {
        id: `address:${key}`,
        type: 'address',
        title: item.display_name || `${lat.toFixed(6)},${lng.toFixed(6)}`,
        description: item.type ? `Type: ${item.type}` : 'OpenStreetMap',
        lat,
        lng,
        icon: item.icon,
        geojson: item.geojson,
      };
      if (item.boundingbox) {
        const [south, north, west, east] = item.boundingbox.map(Number);
        result.bounds = {south, west, north, east};
      }
      results.push(result);
      if (results.length >= 10) break;
    }
    return data.length > 0;
  };

  const hadBoundedResults = await fetchResults(true);
  if (!hadBoundedResults) await fetchResults(false);
  return results;
}

function postSearchState(search: IitcIrisSearchState): void {
  latestSearchState = search;
  window.postMessage({
    type: IITC_IRIS_MESSAGES.searchStatus,
    search,
  } satisfies IitcIrisMessage, '*');
}

async function runSearch(term: string | undefined, confirmed = false): Promise<void> {
  const searchTerm = (term ?? '').trim();
  latestSearchSequence += 1;
  const sequence = latestSearchSequence;
  clearRenderedLayers(ensureLayers().search);

  if (!searchTerm) {
    postSearchState({status: 'idle', term: '', confirmed, results: [], localResults: 0});
    return;
  }
  if (searchTerm.length < SEARCH_AUTO_MIN_LENGTH && !confirmed) return;

  const localResults = [...getLocalSearchResults(searchTerm), ...parseSearchCoordinateResults(searchTerm)];
  const initialStatus: IitcIrisSearchState['status'] = confirmed ? 'loading' : localResults.length > 0 ? 'ready' : 'empty';
  postSearchState({status: initialStatus, term: searchTerm, confirmed, results: localResults, localResults: localResults.length});

  if (!confirmed) return;

  const startedAt = performance.now();
  try {
    const onlineResults = await fetchNominatimSearchResults(searchTerm);
    if (sequence !== latestSearchSequence) return;
    const combined = [...localResults, ...onlineResults];
    postSearchState({
      status: combined.length > 0 ? 'ready' : 'empty',
      term: searchTerm,
      confirmed,
      results: combined.length > 0 ? combined : [{id: 'empty:osm', type: 'empty', title: 'No results on OpenStreetMap'}],
      localResults: localResults.length,
      onlineResults: onlineResults.length,
      elapsedMs: performance.now() - startedAt,
    });
  } catch (error) {
    if (sequence !== latestSearchSequence) return;
    postSearchState({
      status: localResults.length > 0 ? 'ready' : 'error',
      term: searchTerm,
      confirmed,
      results: localResults,
      localResults: localResults.length,
      elapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function clearSearch(): void {
  latestSearchSequence += 1;
  clearRenderedLayers(ensureLayers().search);
  postSearchState({status: 'idle', term: '', confirmed: false, results: [], localResults: 0});
}

function previewSearchResult(result: IitcIrisSearchResult | undefined): void {
  clearRenderedLayers(ensureLayers().search);
  if (!result || result.type === 'empty') return;
  if (result.guid && latestEntities) {
    const portal = latestEntities.portals.find((candidate) => candidate.guid === result.guid);
    if (portal) {
      const latLng = toLatLng(portal.latE6, portal.lngE6);
      addRenderedLayer(ensureLayers().search, L.circleMarker(latLng, {
        pane: getLayerPane('search'),
        radius: Math.max(10, getPortalRadius(portal.level, portal.isPlaceholder) + 4),
        color: '#ff3b30',
        fillColor: '#ff3b30',
        fillOpacity: 0.18,
        opacity: 0.9,
        weight: 2,
        interactive: false,
      }));
      return;
    }
  }
  if (result.bounds) {
    const bounds = L.latLngBounds([result.bounds.south, result.bounds.west], [result.bounds.north, result.bounds.east]);
    addRenderedLayer(ensureLayers().search, createSearchResultLayer(result, bounds));
    return;
  }
  if (typeof result.lat === 'number' && typeof result.lng === 'number') {
    addRenderedLayer(ensureLayers().search, createSearchResultLayer(result));
  }
}

function selectSearchResult(result: IitcIrisSearchResult | undefined, zoom = false): void {
  if (!result || result.type === 'empty') return;
  const map = window.__iitcIrisMap;
  if (!map) return;
  clearRenderedLayers(ensureLayers().search);

  if (result.guid && latestEntities) {
    const portal = latestEntities.portals.find((candidate) => candidate.guid === result.guid);
    if (portal) {
      const latLng = toLatLng(portal.latE6, portal.lngE6);
      if (zoom) map.setView(latLng, DEFAULT_ZOOM);
      else if (!map.getBounds().contains(latLng)) map.setView(latLng);
      selectPortal(portal);
      return;
    }
  }

  if (result.bounds) {
    const bounds = L.latLngBounds([result.bounds.south, result.bounds.west], [result.bounds.north, result.bounds.east]);
    map.fitBounds(bounds, {maxZoom: DEFAULT_ZOOM});
    addRenderedLayer(ensureLayers().search, createSearchResultLayer(result, bounds));
    return;
  }

  if (typeof result.lat === 'number' && typeof result.lng === 'number') {
    const latLng: [number, number] = [result.lat, result.lng];
    map.setView(latLng, zoom ? DEFAULT_ZOOM : map.getZoom());
    addRenderedLayer(ensureLayers().search, L.circleMarker(latLng, {
      pane: getLayerPane('search'),
      radius: 8,
      color: '#ff3b30',
      fillColor: '#ff3b30',
      fillOpacity: 0.24,
      weight: 2,
      interactive: false,
    }));
  }
}

function renderUserLocation(lat: number | undefined, lng: number | undefined, accuracy: number | undefined): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.userLocation);
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  const latLng: [number, number] = [lat, lng];
  if (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0) {
    addRenderedLayer(layers.userLocation, L.circle(latLng, {
      radius: accuracy,
      color: '#65d9ff',
      fillColor: '#65d9ff',
      fillOpacity: 0.08,
      opacity: 0.24,
      pane: getLayerPane('userLocation'),
      interactive: false,
      weight: 1,
    }));
  }
  addRenderedLayer(layers.userLocation, L.marker(latLng, {
    icon: L.divIcon({
      className: 'iitc-iris-user-location-pin',
      html: '<span></span>',
      iconSize: [22, 30],
      iconAnchor: [11, 30],
    }),
    pane: getLayerPane('userLocation'),
    interactive: false,
  }));
}

function createSearchResultLayer(result: IitcIrisSearchResult, bounds?: L.LatLngBounds): LeafletLayer {
  const options: L.PathOptions = {
    pane: getLayerPane('search'),
    interactive: false,
    color: '#ff3b30',
    fill: false,
    weight: 2,
    opacity: 0.8,
  };

  if (result.geojson && typeof result.geojson === 'object') {
    return L.geoJSON(result.geojson as GeoJSON.GeoJsonObject, {
      ...options,
      pointToLayer: (_feature, latLng) => L.marker(latLng, {
        pane: getLayerPane('search'),
        icon: L.divIcon({
          className: 'iitc-iris-search-marker',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        title: result.title,
        interactive: false,
      }),
    });
  }

  if (bounds) {
    return L.rectangle(bounds, options);
  }

  const latLng: [number, number] = [result.lat ?? 0, result.lng ?? 0];
  return L.circleMarker(latLng, {
    ...options,
    radius: 8,
    fillColor: '#ff3b30',
    fillOpacity: 0.24,
  });
}

function createLevelLabelMarker(latLng: [number, number], level: number, team: keyof typeof TEAM_COLORS): LeafletLayer {
  return L.marker(latLng, {
    icon: L.divIcon({
      className: `iitc-iris-level-label iitc-iris-level-label-${team}`,
      html: String(level),
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    }),
    interactive: false,
    keyboard: false,
    pane: getLayerPane('labels'),
    zIndexOffset: 1000,
  });
}

function getVisibleLevelLabelGuids(portals: IitcIrisRenderEntities['portals']): Set<string> {
  const map = window.__iitcIrisMap;
  if (!map) return new Set();

  const candidates = portals
    .filter((portal) => !portal.isPlaceholder && portal.level !== undefined)
    .map((portal) => ({
      guid: portal.guid,
      level: getPortalLevel(portal.level, false),
      point: map.project(L.latLng(portal.latE6 / 1e6, portal.lngE6 / 1e6)),
    }))
    .sort((a, b) => b.level - a.level || a.guid.localeCompare(b.guid));

  const visible = new Set<string>();
  const keptPoints: L.Point[] = [];
  for (const candidate of candidates) {
    const overlaps = keptPoints.some((point) =>
      Math.abs(point.x - candidate.point.x) <= LEVEL_LABEL_COLLISION_SIZE &&
      Math.abs(point.y - candidate.point.y) <= LEVEL_LABEL_COLLISION_SIZE);
    if (overlaps) continue;
    visible.add(candidate.guid);
    keptPoints.push(candidate.point);
  }

  return visible;
}

function getRenderPolicy(): IitcIrisRenderPolicy {
  const mapZoom = window.__iitcIrisMap?.getZoom() ?? DEFAULT_ZOOM;
  const detailedPortals = latestPlan?.tileParams.hasPortals ?? false;
  const optionalOverlaysVisible = detailedPortals && mapZoom >= OPTIONAL_OVERLAY_MIN_ZOOM;
  return {
    optionalOverlayMinZoom: OPTIONAL_OVERLAY_MIN_ZOOM,
    detailedPortals,
    levelFill: layerSettings.levelFill && optionalOverlaysVisible,
    healthFill: layerSettings.healthFill && optionalOverlaysVisible,
    ornaments: layerSettings.ornaments,
    artifacts: layerSettings.artifacts,
    labels: layerSettings.labels && optionalOverlaysVisible,
  };
}

function isTeamLayerVisible(team: 'E' | 'R' | 'N' | 'M'): boolean {
  if (team === 'R') return layerSettings.resistance;
  if (team === 'E') return layerSettings.enlightened;
  if (team === 'M') return layerSettings.machina;
  return layerSettings.unclaimedPortals;
}

function isPortalLevelLayerVisible(portal: IitcIrisRenderPortal): boolean {
  if (portal.team === 'N' || portal.isPlaceholder || portal.level === undefined || portal.level < 1 || portal.level > 8) {
    return layerSettings.unclaimedPortals;
  }

  const levelKey = `level${portal.level}Portals` as keyof IitcIrisLayerSettings;
  return layerSettings[levelKey] === true;
}

function isPortalVisible(portal: IitcIrisRenderPortal): boolean {
  return layerSettings.portals && isTeamLayerVisible(portal.team) && isPortalLevelLayerVisible(portal);
}

function isLinkVisible(link: IitcIrisRenderLink): boolean {
  return layerSettings.links && isTeamLayerVisible(link.team);
}

function isFieldVisible(field: IitcIrisRenderField): boolean {
  return layerSettings.fields && isTeamLayerVisible(field.team);
}

function renderEntities(entities: IitcIrisRenderEntities): void {
  if (!window.__iitcIrisMap) return;
  const layers = ensureLayers();
  const renderPolicy = getRenderPolicy();
  const ornamentVisibility = loadOrnamentVisibilitySettings();
  const ornamentDiagnostics = createEmptyOrnamentDiagnostics();
  const visiblePortals = entities.portals.filter(isPortalVisible);
  const visibleLevelLabelGuids = renderPolicy.labels ? getVisibleLevelLabelGuids(visiblePortals) : new Set<string>();

  latestEntities = entities;
  if (pendingPortalSelection) {
    const portal = findPortalByGuidOrLatLng(pendingPortalSelection.guid, pendingPortalSelection.lat, pendingPortalSelection.lng);
    if (portal) selectPortal(portal, false);
  }
  clearEntityLayers();

  for (const field of entities.fields) {
    if (!isFieldVisible(field) || field.points.length !== 3) continue;
    addRenderedLayer(layers.fields, createIitcGeodesicPolygon(field.points.map((point) => toLatLng(point.latE6, point.lngE6)), {
      color: getTeamColor(field.team),
      fillColor: getTeamColor(field.team),
      fillOpacity: 0.25,
      opacity: 0,
      pane: getLayerPane('fields'),
      renderer: getLayerRenderer('fields'),
      weight: 0,
      interactive: false,
    }));
  }

  for (const link of entities.links) {
    if (!isLinkVisible(link)) continue;
    addRenderedLayer(layers.links, createIitcGeodesicPolyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
      color: getTeamColor(link.team),
      opacity: 1,
      pane: getLayerPane('links'),
      renderer: getLayerRenderer('links'),
      weight: 2,
      interactive: false,
    }));
  }

  for (const portal of visiblePortals) {
    const color = getTeamColor(portal.team);
    const latLng = toLatLng(portal.latE6, portal.lngE6);
    const radius = getPortalRadius(portal.level, portal.isPlaceholder);
    const dataOverlayStyle = getPortalDataOverlayStyle(portal);

    const marker = L.circleMarker(latLng, {
      radius,
      color,
      fillColor: renderPolicy.healthFill || renderPolicy.levelFill
        ? getPortalFillColor(portal.team, portal.level, portal.isPlaceholder, portal.health)
        : getTeamColor(portal.team),
      fillOpacity: renderPolicy.healthFill || renderPolicy.levelFill
        ? getPortalFillOpacity(portal.health, portal.level, portal.team, portal.isPlaceholder)
        : 0.5,
      opacity: portal.isPlaceholder ? 0.6 : 1,
      pane: getLayerPane('portals'),
      renderer: getLayerRenderer('portals'),
      weight: getPortalWeight(portal.level, portal.isPlaceholder),
      dashArray: portal.isPlaceholder ? '1,2' : undefined,
      interactive: true,
      ...dataOverlayStyle,
    });
    marker.on('click', (event) => {
      L.DomEvent.stop(event);
      if (Date.now() < suppressPortalClickUntil) return;
      selectPortal(portal);
    });
    marker.on('contextmenu', (event) => openPortalContext(portal, event));
    addRenderedLayer(layers.portals, marker);

    if (renderPolicy.labels && visibleLevelLabelGuids.has(portal.guid) && portal.level !== undefined) {
      addRenderedLayer(layers.labels, createLevelLabelMarker(latLng, portal.level, portal.team));
    }
    const keyCount = getPortalKeyCount(portal.guid);
    if (layerSettings.keyCount === 'on' && keyCount !== undefined && keyCount > 0) {
      addRenderedLayer(layers.labels, createKeyCountMarker(latLng, keyCount, radius));
    }
  }

  if (renderPolicy.artifacts) {
    for (const portal of entities.portals) {
      if (portal.isPlaceholder || !portal.artifacts || portal.artifacts.length === 0) continue;
      const latLng = toLatLng(portal.latE6, portal.lngE6);
      for (const artifact of portal.artifacts) {
        addRenderedLayer(layers.artifacts, createArtifactMarker(latLng, artifact));
      }
    }
  }

  if (renderPolicy.ornaments) {
    for (const portal of entities.portals) {
      if (!portal.ornaments || portal.ornaments.length === 0) continue;
      const latLng = toLatLng(portal.latE6, portal.lngE6);
      const radius = getPortalRadius(portal.level, portal.isPlaceholder);
      for (const ornament of portal.ornaments) {
        ornamentDiagnostics.types[ornament] = (ornamentDiagnostics.types[ornament] ?? 0) + 1;
        if (isIitcExcludedOrnament(ornament, ornamentVisibility)) {
          ornamentDiagnostics.hiddenMarkers += 1;
          continue;
        }
        ornamentDiagnostics.drawnMarkers += 1;
        addRenderedLayer(layers.ornaments, createOrnamentMarker(latLng, ornament, radius));
      }
    }
  }
  renderSelectedPortal(visiblePortals);
  renderSelectedMapObject();
  renderIitcDrawTools();
  latestOrnamentDiagnostics = ornamentDiagnostics;
}

function renderTileDebug(plan: IitcMapDataPlan, response: IitcGetEntitiesResponse): void {
  if (!window.__iitcIrisMap) return;
  const layers = ensureLayers();
  clearRenderedLayers(layers.tiles);
  if (!layerSettings.tiles) return;

  const tilePayloads = response.result?.map ?? {};
  for (const tile of plan.tiles) {
    const payload = tilePayloads[tile.id];
    const entityCount = payload?.gameEntities?.length ?? 0;
    const color = payload ? (entityCount > 0 ? '#00ff73' : '#ffce00') : '#ff1010';

    addRenderedLayer(layers.tiles, L.rectangle([
      [tile.bounds.south, tile.bounds.west],
      [tile.bounds.north, tile.bounds.east],
    ], {
      color,
      fillColor: color,
      fillOpacity: entityCount > 0 ? 0.08 : 0.14,
      opacity: 0.75,
      pane: getLayerPane('tiles'),
      weight: 1,
      interactive: false,
    }));
  }
}

function renderLatestTileDebug(): void {
  if (!latestPlan || !latestResponse) {
    clearRenderedLayers(ensureLayers().tiles);
    return;
  }
  renderTileDebug(latestPlan, latestResponse);
}

function formatPlayerTrackerAgo(time: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d${hours % 24}h${minutes % 60}m`;
  if (hours > 0) return `${hours}h${minutes % 60}m`;
  return `${minutes}m`;
}

function createPlayerTrackerPopup(playerName: string, player: IitcPlayerTrackerStored[string]): HTMLElement {
  const root = document.createElement('div');
  root.className = 'plugin-player-tracker-popup iitc-iris-player-tracker-popup';
  const title = document.createElement('span');
  title.className = `nickname ${player.team === 'R' ? 'res' : player.team === 'E' ? 'enl' : 'mac'} iitc-iris-player-tracker-name iitc-iris-player-tracker-${player.team}`;
  title.textContent = playerName;
  root.append(title);

  const last = player.events[player.events.length - 1];
  root.append(document.createElement('br'));
  root.append(document.createTextNode(formatPlayerTrackerAgo(last.time)));
  root.append(document.createElement('br'));
  root.append(createPlayerTrackerPortalLink(last));

  const previous = player.events.slice(-IITC_PLAYER_TRACKER_MAX_DISPLAY_EVENTS, -1).reverse();
  if (previous.length > 0) {
    root.append(document.createElement('br'));
    root.append(document.createElement('br'));
    root.append(document.createTextNode('previous locations:'));
    root.append(document.createElement('br'));

    const table = document.createElement('table');
    table.className = 'iitc-iris-player-tracker-previous-table';
    for (const event of previous) {
      const row = document.createElement('tr');
      const ageCell = document.createElement('td');
      ageCell.textContent = `${formatPlayerTrackerAgo(event.time)} ago`;
      const portalCell = document.createElement('td');
      portalCell.append(createPlayerTrackerPortalLink(event));
      row.append(ageCell, portalCell);
      table.append(row);
    }
    root.append(table);
  }

  return root;
}

function createPlayerTrackerPortalLink(event: IitcPlayerTrackerStored[string]['events'][number]): HTMLButtonElement {
  const latLng = getIitcPlayerTrackerLatLng(event);
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'iitc-iris-player-tracker-link';
  link.textContent = event.name || event.address || 'portal';
  link.title = event.address ? `${event.name || 'portal'}\n${event.address}` : link.textContent;
  link.addEventListener('click', (clickEvent) => {
    clickEvent.preventDefault();
    const map = window.__iitcIrisMap;
    zoomToAndShowPortal(undefined, latLng[0], latLng[1], map ? Math.max(map.getZoom(), DEFAULT_ZOOM) : DEFAULT_ZOOM);
  });
  link.addEventListener('dblclick', (clickEvent) => {
    clickEvent.preventDefault();
    zoomToAndShowPortal(undefined, latLng[0], latLng[1], DEFAULT_ZOOM);
  });
  return link;
}

function createPlayerTrackerMarker(latLng: [number, number], playerName: string, team: keyof typeof TEAM_COLORS, opacity: number, latestTime: number): LeafletLayer {
  const icon = getPlayerTrackerMarkerIcon(team, playerName);
  return L.marker(latLng, {
    icon,
    opacity,
    keyboard: false,
    pane: getLayerPane('playerTracker'),
    title: `${playerName}, ${formatPlayerTrackerAgo(latestTime)} ago`,
  });
}

function getPlayerTrackerMarkerIcon(team: keyof typeof TEAM_COLORS, playerName: string): L.Icon | L.DivIcon {
  if ((team === 'R' || team === 'E') && IITC_IRIS_ASSET_BASE_URL) {
    const color = team === 'R' ? 'blue' : 'green';
    return L.icon({
      iconUrl: `${IITC_IRIS_ASSET_BASE_URL}images/marker-${color}.png`,
      iconRetinaUrl: `${IITC_IRIS_ASSET_BASE_URL}images/marker-${color}-2x.png`,
      shadowUrl: `${IITC_IRIS_ASSET_BASE_URL}images/marker-shadow.png`,
      className: `iitc-iris-player-tracker-marker-image iitc-iris-player-tracker-marker-${team}`,
      ...PLAYER_TRACKER_MARKER_ICON_OPTIONS,
    });
  }

  return L.divIcon({
    className: `iitc-iris-player-tracker-marker iitc-iris-player-tracker-marker-${team}`,
    html: `<span>${playerName.slice(0, 1).toUpperCase()}</span>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [1, -24],
  });
}

function isPlayerTrackerTeamVisible(team: keyof typeof TEAM_COLORS): boolean {
  if (team === 'R') return layerSettings.playerTrackerResistance || layerSettings.playerTracker;
  if (team === 'E') return layerSettings.playerTrackerEnlightened || layerSettings.playerTracker;
  if (team === 'M') return layerSettings.playerTrackerMachina || layerSettings.playerTracker;
  return false;
}

function renderPlayerTracker(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.playerTracker);
  playerTrackerStored = pruneIitcPlayerTrackerStored(playerTrackerStored);

  if (!isPlayerTrackerVisible()) {
    updatePlayerTrackerDiagnostics(0, 0);
    repostLatestEntityStatus();
    return;
  }

  const now = Date.now();
  const split = IITC_PLAYER_TRACKER_MAX_TIME / 4;
  let markers = 0;
  let traces = 0;

  for (const [playerName, player] of Object.entries(playerTrackerStored)) {
    if (player.events.length === 0) continue;
    if (!isPlayerTrackerTeamVisible(player.team)) continue;

    for (let index = 1; index < player.events.length; index += 1) {
      const current = player.events[index];
      const previous = player.events[index - 1];
      const currentLatLng = getIitcPlayerTrackerLatLng(current);
      const previousLatLng = getIitcPlayerTrackerLatLng(previous);
      if (currentLatLng[0] === previousLatLng[0] && currentLatLng[1] === previousLatLng[1]) continue;
      const ageBucket = Math.min(Math.trunc((now - current.time) / split), 3);
      addRenderedLayer(layers.playerTracker, L.polyline([previousLatLng, currentLatLng], {
        pane: getLayerPane('playerTracker'),
        color: IITC_PLAYER_TRACKER_LINE_COLOR,
        weight: 2 - 0.25 * ageBucket,
        opacity: 1 - 0.2 * ageBucket,
        dashArray: '5,8',
        interactive: false,
      }));
      traces += 1;
    }

    const last = player.events[player.events.length - 1];
    const lastLatLng = getIitcPlayerTrackerLatLng(last);
    const relativeOpacity = 1 - (now - last.time) / IITC_PLAYER_TRACKER_MAX_TIME;
    const opacity = IITC_PLAYER_TRACKER_MIN_OPACITY + (1 - IITC_PLAYER_TRACKER_MIN_OPACITY) * Math.max(0, relativeOpacity);
    const marker = createPlayerTrackerMarker(lastLatLng, playerName, player.team, opacity, last.time);
    marker.bindPopup(createPlayerTrackerPopup(playerName, player), {
      className: 'iitc-iris-player-tracker-leaflet-popup',
    });
    addRenderedLayer(layers.playerTracker, marker);
    markers += 1;
  }

  updatePlayerTrackerDiagnostics(markers, traces);
  repostLatestEntityStatus();
}

function repostLatestEntityStatus(): void {
  if (!latestEntities || !latestTileDiagnostics) return;
  postEntityStatus(latestEntityStatus, latestEntities, latestTileDiagnostics);
}

function getIitcRequestDiagnostics(): IitcIrisRequestDiagnostics {
  const activeByEndpoint: Record<string, number> = {};
  const now = performance.now();
  const active = [...activeIitcRequests.entries()].map(([id, request]) => {
    activeByEndpoint[request.endpoint] = (activeByEndpoint[request.endpoint] ?? 0) + 1;
    return {
      id,
      endpoint: request.endpoint,
      group: request.group,
      elapsedMs: Math.round(now - request.startedAt),
    };
  });
  return {
    activeRequests: active.length,
    activeByEndpoint,
    active,
  };
}

function toFiniteNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getAgentTeam(team: unknown): IitcIrisAgentState['team'] {
  if (team === 'ENLIGHTENED' || team === 'E') return 'E';
  if (team === 'RESISTANCE' || team === 'R') return 'R';
  return 'N';
}

function getIitcAgentState(): IitcIrisAgentState {
  const player = (window as Window & {PLAYER?: IitcPagePlayer}).PLAYER;
  if (!player || typeof player.nickname !== 'string' || !player.nickname) return {status: 'missing'};

  const level = toFiniteNumber(player.verified_level) ?? toFiniteNumber(player.level);
  const ap = toFiniteNumber(player.ap);
  const minApForCurrentLevel = toFiniteNumber(player.min_ap_for_current_level);
  const minApForNextLevel = toFiniteNumber(player.min_ap_for_next_level);
  const energy = toFiniteNumber(player.energy);
  const xmCapacity = toFiniteNumber(player.xm_capacity);
  const availableInvites = toFiniteNumber(player.available_invites);
  const levelSpan = minApForNextLevel !== undefined && minApForCurrentLevel !== undefined
    ? minApForNextLevel - minApForCurrentLevel
    : 0;
  const maxLevel = minApForNextLevel === undefined || minApForNextLevel <= 0 || levelSpan <= 0;
  const levelPercent = maxLevel || ap === undefined || minApForCurrentLevel === undefined
    ? maxLevel ? 100 : undefined
    : Math.max(0, Math.min(100, Math.round(((ap - minApForCurrentLevel) / levelSpan) * 100)));
  const xmPercent = energy !== undefined && xmCapacity !== undefined && xmCapacity > 0
    ? Math.max(0, Math.min(100, Math.round((energy / xmCapacity) * 100)))
    : undefined;

  return {
    status: 'ready',
    nickname: player.nickname,
    team: getAgentTeam(player.team),
    level,
    ap,
    energy,
    xmCapacity,
    availableInvites,
    minApForCurrentLevel,
    minApForNextLevel,
    xmPercent,
    levelPercent,
    apToNextLevel: maxLevel || ap === undefined || minApForNextLevel === undefined ? undefined : Math.max(0, minApForNextLevel - ap),
    maxLevel,
    staticFromPage: true,
    subscription: latestSubscriptionState,
  };
}

function postAgentState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.agentStatus,
    agent: getIitcAgentState(),
  } satisfies IitcIrisMessage, '*');
}

function postRequestDiagnostics(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.requestStatus,
    requestDiagnostics: getIitcRequestDiagnostics(),
  } satisfies IitcIrisMessage, '*');
}

function beginIitcRequest(endpoint: string, group?: string): () => void {
  const id = nextIitcRequestId;
  nextIitcRequestId += 1;
  activeIitcRequests.set(id, {endpoint, group, startedAt: performance.now()});
  postRequestDiagnostics();
  return () => {
    if (!activeIitcRequests.delete(id)) return;
    postRequestDiagnostics();
  };
}

function postCommState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.commStatus,
    comm: latestCommState,
    requestDiagnostics: getIitcRequestDiagnostics(),
  } satisfies IitcIrisMessage, '*');
}

function postScoresState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.scoresStatus,
    scores: latestScoresState,
    requestDiagnostics: getIitcRequestDiagnostics(),
  } satisfies IitcIrisMessage, '*');
}

function postPasscodeState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.passcodeStatus,
    passcode: latestPasscodeState,
    requestDiagnostics: getIitcRequestDiagnostics(),
  } satisfies IitcIrisMessage, '*');
}

function postInventoryState(): void {
  latestInventoryState = {
    ...latestInventoryState,
    subscription: latestSubscriptionState,
  };
  window.postMessage({
    type: IITC_IRIS_MESSAGES.inventoryStatus,
    inventory: latestInventoryState,
    requestDiagnostics: getIitcRequestDiagnostics(),
  } satisfies IitcIrisMessage, '*');
}

function postMissionsState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.missionsStatus,
    missions: latestMissionsState,
    requestDiagnostics: getIitcRequestDiagnostics(),
  } satisfies IitcIrisMessage, '*');
}

function toIrisMissionSummary(mission: CoreIitcMissionSummary): IitcIrisMissionSummary {
  return {
    guid: mission.guid,
    title: mission.title,
    image: mission.image,
    ratingE6: mission.ratingE6,
    ratingPercent: mission.ratingE6 === undefined ? undefined : Math.round(mission.ratingE6 / 10_000),
    medianCompletionTimeMs: mission.medianCompletionTimeMs,
    durationLabel: formatIitcMissionDuration(mission.medianCompletionTimeMs),
  };
}

function toMissionCacheSummary(mission: IitcIrisMissionSummary): IitcIrisMissionSummary {
  return {
    guid: mission.guid,
    title: mission.title,
    image: mission.image,
    ratingE6: mission.ratingE6,
    ratingPercent: mission.ratingPercent,
    medianCompletionTimeMs: mission.medianCompletionTimeMs,
    durationLabel: mission.durationLabel,
  };
}

function toIrisMissionDetails(mission: CoreIitcMissionDetails): IitcIrisMissionDetails {
  return {
    ...toIrisMissionSummary(mission),
    description: mission.description,
    authorNickname: mission.authorNickname,
    authorTeam: mission.authorTeam,
    typeNum: mission.typeNum,
    type: mission.type,
    numUniqueCompletedPlayers: mission.numUniqueCompletedPlayers,
    waypoints: mission.waypoints,
    routeLengthMeters: mission.routeLengthMeters,
    bounds: getIitcMissionBounds(mission) ?? undefined,
  };
}

function sortMissionSummaries(missions: IitcIrisMissionSummary[]): IitcIrisMissionSummary[] {
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
  return missions.slice().sort((a, b) => collator.compare(a.title, b.title));
}

function getMissionSummaryDetails(missionGuid: string): Partial<IitcIrisMissionSummary> | undefined {
  const details = getFreshMissionDetailsCache(missionGuid);
  if (!details) return undefined;
  return {
    authorNickname: details.authorNickname,
    authorTeam: details.authorTeam,
    typeNum: details.typeNum,
    type: details.type,
    numUniqueCompletedPlayers: details.numUniqueCompletedPlayers,
    waypointCount: details.waypoints.length,
    routeLengthMeters: details.routeLengthMeters,
  };
}

function enrichMissionSummariesWithCache(missions: IitcIrisMissionSummary[]): IitcIrisMissionSummary[] {
  return missions.map((mission) => ({
    ...toMissionCacheSummary(mission),
    ...getMissionSummaryDetails(mission.guid),
  }));
}

function isMissionCacheEntry<T>(value: unknown, isData: (data: unknown) => data is T): value is MissionCacheEntry<T> {
  if (!value || typeof value !== 'object') return false;
  const entry = value as {time?: unknown; data?: unknown};
  return Number.isFinite(entry.time) && isData(entry.data);
}

function isMissionSummaryArray(value: unknown): value is IitcIrisMissionSummary[] {
  return Array.isArray(value);
}

function isMissionDetails(value: unknown): value is IitcIrisMissionDetails {
  return !!value && typeof value === 'object' && typeof (value as {guid?: unknown}).guid === 'string';
}

function loadMissionCache<T>(
  key: string,
  cache: Map<string, MissionCacheEntry<T>>,
  isData: (data: unknown) => data is T,
): void {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== 'object') return;
    for (const [guid, value] of Object.entries(parsed)) {
      if (isMissionCacheEntry(value, isData)) cache.set(guid, value);
    }
  } catch {
    // Ignore corrupt or inaccessible mission caches; live requests can refill them.
  }
}

function pruneMissionCache<T>(cache: Map<string, MissionCacheEntry<T>>, maxAgeMs: number): void {
  const expiredBefore = Date.now() - maxAgeMs;
  for (const [guid, entry] of cache.entries()) {
    if (entry.time <= expiredBefore) cache.delete(guid);
  }
}

function trimMissionCacheEntries<T>(cache: Map<string, MissionCacheEntry<T>>, maxEntries: number): void {
  while (cache.size > maxEntries) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].time - b[1].time)[0]?.[0];
    if (!oldest) return;
    cache.delete(oldest);
  }
}

function storeMissionCache<T>(key: string, cache: Map<string, MissionCacheEntry<T>>, maxChars: number): void {
  try {
    const entries = [...cache.entries()].sort((a, b) => b[1].time - a[1].time);
    let serialized = JSON.stringify(Object.fromEntries(entries));
    while (serialized.length > maxChars && entries.length > 1) {
      const oldest = entries.pop();
      if (oldest) cache.delete(oldest[0]);
      serialized = JSON.stringify(Object.fromEntries(entries));
    }
    window.localStorage.setItem(key, serialized);
  } catch {
    // Storage quota/private-mode failures should not block mission display.
  }
}

function storePortalMissionsCache(): void {
  pruneMissionCache(portalMissionsCache, PORTAL_MISSIONS_CACHE_MS);
  trimMissionCacheEntries(portalMissionsCache, 50);
  storeMissionCache(PORTAL_MISSIONS_CACHE_STORAGE_KEY, portalMissionsCache, PORTAL_MISSIONS_CACHE_STORAGE_MAX_CHARS);
}

function storeMissionDetailsCache(): void {
  pruneMissionCache(missionDetailsCache, MISSION_DETAILS_CACHE_MS);
  trimMissionCacheEntries(missionDetailsCache, 100);
  storeMissionCache(MISSION_DETAILS_CACHE_STORAGE_KEY, missionDetailsCache, MISSION_DETAILS_CACHE_STORAGE_MAX_CHARS);
}

loadMissionCache(PORTAL_MISSIONS_CACHE_STORAGE_KEY, portalMissionsCache, isMissionSummaryArray);
loadMissionCache(MISSION_DETAILS_CACHE_STORAGE_KEY, missionDetailsCache, isMissionDetails);
storePortalMissionsCache();
storeMissionDetailsCache();

function getFreshPortalMissionsCache(portalGuid: string): IitcIrisMissionSummary[] | undefined {
  const cached = portalMissionsCache.get(portalGuid);
  if (!cached || cached.time <= Date.now() - PORTAL_MISSIONS_CACHE_MS) {
    if (cached) {
      portalMissionsCache.delete(portalGuid);
      storePortalMissionsCache();
    }
    return undefined;
  }
  return cached.data.slice();
}

function setPortalMissionsCache(portalGuid: string, missions: IitcIrisMissionSummary[]): void {
  portalMissionsCache.set(portalGuid, {time: Date.now(), data: missions.map(toMissionCacheSummary)});
  storePortalMissionsCache();
}

function getFreshMissionDetailsCache(missionGuid: string): IitcIrisMissionDetails | undefined {
  const cached = missionDetailsCache.get(missionGuid);
  if (!cached || cached.time <= Date.now() - MISSION_DETAILS_CACHE_MS) {
    if (cached) {
      missionDetailsCache.delete(missionGuid);
      storeMissionDetailsCache();
    }
    return undefined;
  }
  return cached.data;
}

function setMissionDetailsCache(missionGuid: string, mission: IitcIrisMissionDetails): void {
  missionDetailsCache.set(missionGuid, {time: Date.now(), data: mission});
  storeMissionDetailsCache();
  latestMissionsState = {
    ...latestMissionsState,
    missions: latestMissionsState.missions.map((summary) => summary.guid === missionGuid
      ? {...summary, ...getMissionSummaryDetails(missionGuid)}
      : summary),
  };
}

function getCurrentMissionBoundsPayload(): {northE6: number; southE6: number; westE6: number; eastE6: number} | undefined {
  const map = window.__iitcIrisMap;
  if (!map) return undefined;
  const bounds = map.getBounds();
  return {
    northE6: Math.round(bounds.getNorth() * 1_000_000),
    southE6: Math.round(bounds.getSouth() * 1_000_000),
    westE6: Math.round(bounds.getWest() * 1_000_000),
    eastE6: Math.round(bounds.getEast() * 1_000_000),
  };
}

function cancelActiveMissionsFetch(): void {
  currentMissionsAbortController?.abort();
  currentMissionsAbortController = undefined;
}

function cancelActiveMissionDetailsFetch(): void {
  currentMissionDetailsAbortController?.abort();
  currentMissionDetailsAbortController = undefined;
}

function clearMissionOverlay(): void {
  clearRenderedLayers(ensureLayers().missions);
}

function renderMissionOverlay(mission: IitcIrisMissionDetails | undefined): void {
  clearMissionOverlay();
  if (!mission) return;
  const layers = ensureLayers();
  const points = mission.waypoints
    .flatMap((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined
      ? [{waypoint, latLng: toLatLng(waypoint.latE6, waypoint.lngE6)}]
      : []);
  if (points.length === 0) return;

  if (mission.typeNum === IITC_MISSION_ORDER.sequential && points.length > 1) {
    addRenderedLayer(layers.missions, L.polyline(points.map((point) => point.latLng), {
      color: MISSION_ROUTE_COLOR,
      opacity: 1,
      pane: getLayerPane('missions'),
      weight: 2,
      interactive: false,
    }));
  }

  points.forEach(({waypoint, latLng}, index) => {
    const isStart = index === 0;
    const portal = waypoint.portalGuid && latestEntities
      ? latestEntities.portals.find((candidate) => candidate.guid === waypoint.portalGuid)
      : undefined;
    const marker = L.circleMarker(latLng, {
      radius: portal ? Math.max(5, getPortalRadius(portal.level, portal.isPlaceholder) * 1.75) : 5,
      weight: isStart ? 3 : 3,
      opacity: 1,
      color: isStart ? '#A6A600' : MISSION_ROUTE_COLOR,
      fill: false,
      dashArray: waypoint.hidden ? '2,4' : undefined,
      interactive: true,
      pane: getLayerPane('missions'),
    });
    marker.on('click', (event) => {
      L.DomEvent.stop(event);
      if (Date.now() < suppressPortalClickUntil) return;
      selectMissionWaypoint(waypoint);
    });
    marker.on('contextmenu', (event) => openMissionWaypointContext(waypoint, event));
    addRenderedLayer(layers.missions, marker);

    const label = L.marker(latLng, {
      icon: L.divIcon({
        className: `iitc-iris-mission-waypoint-label ${isStart ? 'is-start' : ''}`,
        html: String(index + 1),
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
      interactive: false,
      keyboard: false,
      pane: getLayerPane('missions'),
    });
    addRenderedLayer(layers.missions, label);
  });
}

function panToMissionStart(mission: IitcIrisMissionDetails | undefined): void {
  const map = window.__iitcIrisMap;
  const start = mission?.waypoints.find((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined);
  if (!map || !start || start.latE6 === undefined || start.lngE6 === undefined) return;
  const latLng = toLatLng(start.latE6, start.lngE6);
  map.panTo(latLng);
}

async function refreshMissions(source: IitcIrisMissionSource = 'view'): Promise<void> {
  cancelActiveMissionsFetch();
  cancelActiveMissionDetailsFetch();
  clearMissionOverlay();
  const startedAt = performance.now();
  const portalGuid = source === 'portal' ? selectedPortalGuid : undefined;
  const portalTitle = source === 'portal' ? selectedPortal?.title : undefined;
  const cachedPortalMissions = portalGuid ? getFreshPortalMissionsCache(portalGuid) : undefined;
  if (source === 'portal' && portalGuid && cachedPortalMissions) {
    const missions = enrichMissionSummariesWithCache(cachedPortalMissions);
    latestMissionsState = {
      status: missions.length > 0 ? 'ready' : 'empty',
      requestState: 'ready',
      source,
      caption: `Missions at ${portalTitle || portalGuid}`,
      portalGuid,
      portalTitle,
      missions,
      selectedMission: undefined,
      detailsStatus: 'idle',
      cached: true,
      detailsCached: false,
      elapsedMs: 0,
      error: undefined,
    };
    postMissionsState();
    if (missions.length === 1) void refreshMissionDetails(missions[0].guid);
    return;
  }

  const abortController = new AbortController();
  currentMissionsAbortController = abortController;
  latestMissionsState = {
    status: 'loading',
    requestState: 'loading',
    source,
    caption: source === 'portal' ? `Missions at ${portalTitle || portalGuid || 'selected portal'}` : 'Missions in view',
    portalGuid,
    portalTitle,
    missions: [],
    selectedMission: undefined,
    detailsStatus: 'idle',
    cached: false,
    detailsCached: false,
    error: undefined,
  };
  postMissionsState();

  const payload = source === 'portal'
    ? portalGuid ? {guid: portalGuid} : undefined
    : getCurrentMissionBoundsPayload();
  if (!payload) {
    latestMissionsState = {
      ...latestMissionsState,
      status: 'error',
      requestState: 'error',
      elapsedMs: performance.now() - startedAt,
      error: source === 'portal' ? 'select a portal first' : 'missing map bounds',
    };
    postMissionsState();
    return;
  }

  try {
    const response = await postIntelEndpoint(
      source === 'portal' ? 'getTopMissionsForPortal' : 'getTopMissionsInBounds',
      payload,
      abortController.signal,
    );
    const missionSummaries = sortMissionSummaries(parseIitcTopMissionsResponse(response).map(toIrisMissionSummary));
    if (source === 'portal' && portalGuid) setPortalMissionsCache(portalGuid, missionSummaries);
    const missions = enrichMissionSummariesWithCache(missionSummaries);
    latestMissionsState = {
      ...latestMissionsState,
      status: missions.length > 0 ? 'ready' : 'empty',
      requestState: 'ready',
      missions,
      cached: false,
      elapsedMs: performance.now() - startedAt,
    };
    postMissionsState();
    if (source === 'portal' && missions.length === 1) void refreshMissionDetails(missions[0].guid);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const status = isIitcAuthError(error) ? 'auth' : 'error';
    latestMissionsState = {
      ...latestMissionsState,
      status,
      requestState: status,
      elapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    postMissionsState();
  } finally {
    if (currentMissionsAbortController === abortController) currentMissionsAbortController = undefined;
  }
}

async function refreshMissionDetails(guid: unknown): Promise<void> {
  const missionGuid = typeof guid === 'string' ? guid : '';
  if (!missionGuid) return;
  cancelActiveMissionDetailsFetch();
  const cachedMission = getFreshMissionDetailsCache(missionGuid);
  if (cachedMission) {
    latestMissionsState = {
      ...latestMissionsState,
      detailsStatus: 'ready',
      selectedMission: cachedMission,
      detailsCached: true,
      detailsElapsedMs: 0,
      error: undefined,
    };
    renderMissionOverlay(cachedMission);
    panToMissionStart(cachedMission);
    postMissionsState();
    return;
  }

  const abortController = new AbortController();
  currentMissionDetailsAbortController = abortController;
  const startedAt = performance.now();
  latestMissionsState = {
    ...latestMissionsState,
    detailsStatus: 'loading',
    selectedMission: latestMissionsState.selectedMission?.guid === missionGuid ? latestMissionsState.selectedMission : undefined,
    detailsCached: false,
    error: undefined,
  };
  postMissionsState();

  try {
    const response = await postIntelEndpoint('getMissionDetails', {guid: missionGuid}, abortController.signal);
    const details = parseIitcMissionDetailsResponse(response);
    const selectedMission = details ? toIrisMissionDetails(details) : undefined;
    if (selectedMission) setMissionDetailsCache(missionGuid, selectedMission);
    latestMissionsState = {
      ...latestMissionsState,
      detailsStatus: selectedMission ? 'ready' : 'empty',
      selectedMission,
      detailsCached: false,
      detailsElapsedMs: performance.now() - startedAt,
    };
    renderMissionOverlay(selectedMission);
    panToMissionStart(selectedMission);
    postMissionsState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const status = isIitcAuthError(error) ? 'auth' : 'error';
    latestMissionsState = {
      ...latestMissionsState,
      detailsStatus: status,
      detailsElapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    renderMissionOverlay(undefined);
    postMissionsState();
  } finally {
    if (currentMissionDetailsAbortController === abortController) currentMissionDetailsAbortController = undefined;
  }
}

function zoomToSelectedMission(): void {
  const map = window.__iitcIrisMap;
  const bounds = latestMissionsState.selectedMission?.bounds;
  if (!map || !bounds) return;
  map.fitBounds(L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]), {maxZoom: MISSION_OVERVIEW_MAX_ZOOM});
}

function isPlayerTrackerVisible(): boolean {
  const map = window.__iitcIrisMap;
  return (layerSettings.playerTracker ||
    layerSettings.playerTrackerResistance ||
    layerSettings.playerTrackerEnlightened ||
    layerSettings.playerTrackerMachina) && !!map && map.getZoom() >= IITC_PLAYER_TRACKER_MIN_ZOOM;
}

function updatePlayerTrackerDiagnostics(markers = playerTrackerDiagnostics.markers, traces = playerTrackerDiagnostics.traces): void {
  playerTrackerDiagnostics = getIitcPlayerTrackerDiagnostics(playerTrackerStored, {
    enabled: layerSettings.playerTracker ||
      layerSettings.playerTrackerResistance ||
      layerSettings.playerTrackerEnlightened ||
      layerSettings.playerTrackerMachina,
    visible: isPlayerTrackerVisible(),
    markers,
    traces,
    latestCommTime: playerTrackerLatestCommTime,
    minZoom: IITC_PLAYER_TRACKER_MIN_ZOOM,
    maxAgeMs: IITC_PLAYER_TRACKER_MAX_TIME,
  });
}

function cancelActivePlayerTrackerFetch(): void {
  currentPlayerTrackerCommAbortController?.abort();
  currentPlayerTrackerCommAbortController = undefined;
}

function clearPlayerTrackerRefreshTimer(): void {
  if (playerTrackerRefreshTimer !== undefined) {
    window.clearTimeout(playerTrackerRefreshTimer);
    playerTrackerRefreshTimer = undefined;
  }
}

function schedulePlayerTrackerRefresh(delayMs = 250): void {
  clearPlayerTrackerRefreshTimer();
  if (authRecoveryActive && dataSource.mode === 'live') return;
  if (!isPlayerTrackerVisible()) {
    cancelActivePlayerTrackerFetch();
    renderPlayerTracker();
    return;
  }
  playerTrackerRefreshTimer = window.setTimeout(() => {
    playerTrackerRefreshTimer = undefined;
    void refreshPlayerTrackerComm();
  }, delayMs);
}

function processPlayerTrackerCommMessages(messages: IitcCommMessage[]): void {
  const newMessages = messages.filter((message) => {
    if (playerTrackerProcessedCommGuids.has(message.guid)) return false;
    playerTrackerProcessedCommGuids.add(message.guid);
    return true;
  });
  if (newMessages.length === 0) {
    playerTrackerStored = pruneIitcPlayerTrackerStored(playerTrackerStored);
    return;
  }
  const result = processIitcPlayerTrackerData(newMessages, playerTrackerStored);
  playerTrackerStored = result.stored;
  playerTrackerLatestCommTime = result.maxMessageTime ?? playerTrackerLatestCommTime;
}

function uniqueStrings(values: string[] | undefined): string[] {
  return values ? [...new Set(values)] : [];
}

function handleMessage(event: MessageEvent<IitcIrisMessage>): void {
  if (event.source !== window) return;
  if (event.data?.type === IITC_IRIS_MESSAGES.setView) {
    const map = window.__iitcIrisMap;
    if (!map || typeof event.data.lat !== 'number' || typeof event.data.lng !== 'number') return;
    const zoom = typeof event.data.zoom === 'number' ? event.data.zoom : map.getZoom();
    map.setView([event.data.lat, event.data.lng], zoom);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.setUserLocation) {
    renderUserLocation(event.data.userLat, event.data.userLng, event.data.userAccuracy);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.zoomToAndShowPortal) {
    zoomToAndShowPortal(event.data.portalGuid, event.data.portalLat, event.data.portalLng, event.data.zoom);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.clearPortalSelection) {
    clearPortalSelection();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.cancelPanelRequests) {
    cancelActivePanelRequests();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.requestComm) {
    void refreshComm(normalizeCommTab(event.data.commTab), event.data.commOlder === true);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.sendComm) {
    void sendComm(normalizeCommTab(event.data.commTab), event.data.commMessage);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.requestScores) {
    void refreshScores();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.requestPasscode) {
    void redeemPasscode(event.data.passcodeText);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.requestInventory) {
    void refreshInventory();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.requestMissions) {
    void refreshMissions(event.data.missionSource);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.requestMissionDetails) {
    void refreshMissionDetails(event.data.missionGuid);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.missionZoom) {
    zoomToSelectedMission();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.searchRequest) {
    void runSearch(event.data.searchTerm, event.data.searchConfirmed === true);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.searchSelect) {
    selectSearchResult(event.data.searchResult, event.data.searchZoom === true);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.searchPreview) {
    previewSearchResult(event.data.searchResult);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.searchClear) {
    clearSearch();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.drawTools) {
    applyIitcDrawToolsAction(event.data);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.renderEntities && event.data.entities) {
    renderEntities(event.data.entities);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.layerSettings && event.data.layerSettings) {
    layerSettings = event.data.layerSettings;
    if (latestEntities) renderEntities(latestEntities);
    renderLatestTileDebug();
    renderIitcDrawTools();
    renderPlayerTracker();
    schedulePlayerTrackerRefresh();
    repostLatestEntityStatus();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.layerSettings && event.data.baseLayerId) {
    setBaseLayer(event.data.baseLayerId);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.dataSourceSettings && event.data.dataSource) {
    dataSource = event.data.dataSource;
    latestFetchGeneration += 1;
    latestRequestKey = '';
    cancelActiveEntityFetch();
    setAuthRecoveryActive(false);
    scheduleEntityRefresh();
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.lifecycleSettings && event.data.lifecycleSettings) {
    lifecycleSettings = event.data.lifecycleSettings;
    repostLatestEntityStatus();
  }
}

function isLatLngInBounds(latE6: number, lngE6: number, bounds: IitcMapDataPlan['viewportBounds']): boolean {
  const lat = latE6 / 1e6;
  const lng = lngE6 / 1e6;
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

function countViewportEntities(entities: IitcIrisRenderEntities | undefined, bounds?: IitcMapDataPlan['viewportBounds']): {
  viewportPortals: number;
  viewportRealPortals: number;
  viewportPlaceholderPortals: number;
  viewportLinks: number;
  viewportFields: number;
  viewportOrnamentPortals: number;
  viewportOrnamentMarkers: number;
  viewportArtifactPortals: number;
  viewportArtifactMarkers: number;
} {
  if (!entities || !bounds) {
    return {
      viewportPortals: 0,
      viewportRealPortals: 0,
      viewportPlaceholderPortals: 0,
      viewportLinks: 0,
      viewportFields: 0,
      viewportOrnamentPortals: 0,
      viewportOrnamentMarkers: 0,
      viewportArtifactPortals: 0,
      viewportArtifactMarkers: 0,
    };
  }

  const viewportPortals = entities.portals.filter((portal) => isLatLngInBounds(portal.latE6, portal.lngE6, bounds));
  const viewportLinks = entities.links.filter((link) =>
    isLatLngInBounds(link.oLatE6, link.oLngE6, bounds) ||
    isLatLngInBounds(link.dLatE6, link.dLngE6, bounds));
  const viewportFields = entities.fields.filter((field) =>
    field.points.some((point) => isLatLngInBounds(point.latE6, point.lngE6, bounds)));

  return {
    viewportPortals: viewportPortals.length,
    viewportRealPortals: viewportPortals.filter((portal) => !portal.isPlaceholder).length,
    viewportPlaceholderPortals: viewportPortals.filter((portal) => portal.isPlaceholder).length,
    viewportLinks: viewportLinks.length,
    viewportFields: viewportFields.length,
    viewportOrnamentPortals: viewportPortals.filter((portal) => portal.ornaments && portal.ornaments.length > 0).length,
    viewportOrnamentMarkers: viewportPortals.reduce((count, portal) => count + (portal.ornaments?.length ?? 0), 0),
    viewportArtifactPortals: viewportPortals.filter((portal) => portal.artifacts && portal.artifacts.length > 0).length,
    viewportArtifactMarkers: viewportPortals.reduce((count, portal) => count + (portal.artifacts?.length ?? 0), 0),
  };
}

function postEntityStatus(
  status: string,
  entities?: IitcIrisRenderEntities,
  tileDiagnostics: TileDiagnostics = {
    requestedTiles: 0,
    returnedTiles: 0,
    nonEmptyTiles: 0,
    elapsedMs: undefined,
    firstRenderElapsedMs: undefined,
    retryRequests: 0,
    retriedTileKeys: [],
    recoveredTileKeys: [],
    emptyTileKeys: [],
    nonEmptyTileKeys: [],
    unaccountedTileKeys: [],
    serverRetryTileKeys: [],
    timeoutTileKeys: [],
    errorTileKeys: [],
    responseRetryTileKeys: [],
    queueDelayReasons: [],
    partialTileKeys: [],
    cacheFreshTileKeys: [],
    cacheStaleTileKeys: [],
    staleGenerationCacheWarmTileKeys: [],
    queue: null,
    renderQueue: null,
    timing: null,
    entitySource: 'live',
  },
): void {
  const portals = entities?.portals ?? [];
  const artifactCounts = countRenderArtifacts(portals);
  const renderPolicy = getRenderPolicy();
  const viewportCounts = countViewportEntities(entities, tileDiagnostics.viewportBounds);
  const portalAnalysis = entities && tileDiagnostics.viewportBounds
    ? getIitcPortalAnalysis(entities, tileDiagnostics.viewportBounds, {
      hasPortals: latestPlan?.tileParams.hasPortals,
      getKeyCount: getPortalKeyCount,
    })
    : null;
  const authRequired = isIitcAuthMessage(status);
  setAuthRecoveryActive(authRequired);
  latestEntityStatus = status;
  latestTileDiagnostics = tileDiagnostics;
  window.postMessage({
    type: IITC_IRIS_MESSAGES.entityStatus,
    status,
    entitySource: tileDiagnostics.entitySource ?? 'live',
    authRequired,
    portals: portals.length,
    realPortals: portals.filter((portal) => !portal.isPlaceholder).length,
    placeholderPortals: portals.filter((portal) => portal.isPlaceholder).length,
    ornamentPortals: portals.filter((portal) => portal.ornaments && portal.ornaments.length > 0).length,
    drawnOrnamentMarkers: latestOrnamentDiagnostics.drawnMarkers,
    hiddenOrnamentMarkers: latestOrnamentDiagnostics.hiddenMarkers,
    ornamentTypes: latestOrnamentDiagnostics.types,
    artifactPortals: artifactCounts.portals,
    drawnArtifactMarkers: renderPolicy.artifacts ? artifactCounts.drawnMarkers : 0,
    artifactTypes: artifactCounts.types,
    artifactFetchStatus: latestArtifactDiagnostics.status,
    artifactFetchPortalCount: latestArtifactDiagnostics.portalCount,
    artifactFetchTypes: latestArtifactDiagnostics.types,
    artifactFetchElapsedMs: latestArtifactDiagnostics.elapsedMs,
    artifactFetchError: latestArtifactDiagnostics.error,
    levelLabels: portals.filter((portal) => !portal.isPlaceholder && portal.level !== undefined).length,
    damagedPortals: portals.filter((portal) => !portal.isPlaceholder && portal.health !== undefined && portal.health < 100).length,
    links: entities?.links.length ?? 0,
    fields: entities?.fields.length ?? 0,
    ...viewportCounts,
    requestedTiles: tileDiagnostics.requestedTiles,
    returnedTiles: tileDiagnostics.returnedTiles,
    nonEmptyTiles: tileDiagnostics.nonEmptyTiles,
    elapsedMs: tileDiagnostics.elapsedMs,
    firstRenderElapsedMs: tileDiagnostics.firstRenderElapsedMs,
    retryRequests: tileDiagnostics.retryRequests ?? 0,
    retriedTileKeys: uniqueStrings(tileDiagnostics.retriedTileKeys),
    recoveredTileKeys: uniqueStrings(tileDiagnostics.recoveredTileKeys),
    emptyTileKeys: tileDiagnostics.emptyTileKeys,
    nonEmptyTileKeys: tileDiagnostics.nonEmptyTileKeys,
    unaccountedTileKeys: tileDiagnostics.unaccountedTileKeys,
    serverRetryTileKeys: uniqueStrings(tileDiagnostics.serverRetryTileKeys),
    timeoutTileKeys: uniqueStrings(tileDiagnostics.timeoutTileKeys),
    errorTileKeys: uniqueStrings(tileDiagnostics.errorTileKeys),
    responseRetryTileKeys: uniqueStrings(tileDiagnostics.responseRetryTileKeys),
    queueDelayReasons: uniqueStrings(tileDiagnostics.queueDelayReasons),
    partialTileKeys: uniqueStrings(tileDiagnostics.partialTileKeys),
    cacheFreshTileKeys: uniqueStrings(tileDiagnostics.cacheFreshTileKeys),
    cacheStaleTileKeys: uniqueStrings(tileDiagnostics.cacheStaleTileKeys),
    staleGenerationCacheWarmTileKeys: uniqueStrings(tileDiagnostics.staleGenerationCacheWarmTileKeys),
    queue: tileDiagnostics.queue,
    renderQueue: tileDiagnostics.renderQueue,
    timing: tileDiagnostics.timing,
    requestDiagnostics: getIitcRequestDiagnostics(),
    playerTracker: playerTrackerDiagnostics,
    portalAnalysis,
    baseLayerId,
    dataSource,
    renderPolicy: getRenderPolicy(),
    selectedPortal,
    portalDetails: latestPortalDetails,
    comm: latestCommState,
  } satisfies IitcIrisMessage, '*');
}

function toQueueDiagnostics(state: IitcTileQueueState, partialTileKeys: string[] = []): IitcIrisQueueDiagnostics {
  const partialTileKeySet = new Set(partialTileKeys);
  return {
    queuedTiles: state.queuedTileKeys.length,
    requestedTiles: state.requestedTileKeys.length,
    successTiles: state.successTileKeys.length,
    failedTiles: state.failedTileKeys.filter((tileKey) => !partialTileKeySet.has(tileKey)).length,
    partialTiles: partialTileKeys.length,
    staleTiles: state.staleTileKeys.length,
    activeRequests: state.activeRequestCount,
    tileErrorCount: state.tileErrorCount,
  };
}

function createEmptyRenderQueueDiagnostics(): IitcIrisRenderQueueDiagnostics {
  return {
    queuedTiles: 0,
    renderedTiles: 0,
    renderedOkTiles: 0,
    renderedCacheFreshTiles: 0,
    renderedCacheStaleTiles: 0,
    lastRenderedTileStatus: null,
    renderedTileKeys: [],
  };
}

function appendRenderQueueDiagnostics(
  diagnostics: IitcIrisRenderQueueDiagnostics,
  tileStatuses: Record<string, IitcRenderQueueTileStatus>,
): IitcIrisRenderQueueDiagnostics {
  const renderedTileKeys = Object.keys(tileStatuses);
  let renderedOkTiles = diagnostics.renderedOkTiles;
  let renderedCacheFreshTiles = diagnostics.renderedCacheFreshTiles;
  let renderedCacheStaleTiles = diagnostics.renderedCacheStaleTiles;
  let lastRenderedTileStatus = diagnostics.lastRenderedTileStatus;

  for (const tileKey of renderedTileKeys) {
    const status = tileStatuses[tileKey];
    if (status === 'ok') renderedOkTiles += 1;
    if (status === 'cache-fresh') renderedCacheFreshTiles += 1;
    if (status === 'cache-stale') renderedCacheStaleTiles += 1;
    lastRenderedTileStatus = status;
  }

  return {
    queuedTiles: 0,
    renderedTiles: diagnostics.renderedTiles + renderedTileKeys.length,
    renderedOkTiles,
    renderedCacheFreshTiles,
    renderedCacheStaleTiles,
    lastRenderedTileStatus,
    renderedTileKeys: uniqueStrings([...diagnostics.renderedTileKeys, ...renderedTileKeys]),
  };
}

function classifyTileDiagnostics(response: IitcGetEntitiesResponse, plan: IitcMapDataPlan): Pick<TileDiagnostics, 'returnedTiles' | 'nonEmptyTiles' | 'emptyTileKeys' | 'nonEmptyTileKeys' | 'unaccountedTileKeys'> {
  const classification = classifyIitcGetEntitiesResponse(response, plan.tileKeys);
  return {
    returnedTiles: classification.returnedTiles,
    nonEmptyTiles: classification.nonEmptyTiles,
    emptyTileKeys: classification.emptyTileKeys,
    nonEmptyTileKeys: classification.nonEmptyTileKeys,
    unaccountedTileKeys: classification.unaccountedTileKeys,
  };
}

function getCsrfToken(): string {
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrftoken='));
  if (!csrfCookie) return '';
  return csrfCookie.slice(csrfCookie.indexOf('=') + 1);
}

function extractVersion(): string {
  const scripts = document.querySelectorAll('script[src*="gen_dashboard_"]');
  for (const script of Array.from(scripts)) {
    const src = (script as HTMLScriptElement).src;
    const match = src.match(/gen_dashboard_([a-f0-9]+)\.js/);
    if (match) return match[1];
  }

  const params = (window as Window & {niantic_params?: {CURRENT_VERSION?: unknown; frontendVersion?: unknown}}).niantic_params;
  if (typeof params?.CURRENT_VERSION === 'string') return params.CURRENT_VERSION;
  if (typeof params?.frontendVersion === 'string') return params.frontendVersion;
  return '';
}

function looksLikeHtml(text: string): boolean {
  return /^\s*(?:<!doctype\s+html|<html|<head|<body)\b/i.test(text);
}

function isIitcAuthMessage(message: string): boolean {
  return /login html|missing csrftoken|missing Intel version|waiting for Intel version/i.test(message);
}

function isIitcAuthError(error: unknown): boolean {
  return error instanceof Error && isIitcAuthMessage(error.message);
}

function createIitcAuthError(endpoint: string, response: Response): Error {
  return new Error(`${endpoint} returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
}

function createMissingIntelVersionError(endpoint: string): Error {
  return new Error(`${endpoint} missing Intel version`);
}

function setAuthRecoveryActive(active: boolean): void {
  authRecoveryActive = active;
  if (active) {
    window.clearTimeout(refreshTimer);
    clearPlayerTrackerRefreshTimer();
  }
}

async function fetchIitcEndpointText(
  endpoint: string,
  init: RequestInit,
  group?: string,
): Promise<{response: Response; text: string}> {
  const finish = beginIitcRequest(endpoint, group);
  try {
    const response = await fetch(`/r/${endpoint}`, init);
    return {response, text: await response.text()};
  } finally {
    finish();
  }
}

async function fetchPortalDetails(guid: string, version: string, signal?: AbortSignal): Promise<IitcPortalDetailsResponse> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('getPortalDetails missing csrftoken');

  const {response, text} = await fetchIitcEndpointText('getPortalDetails', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({guid, v: version}),
  }, 'portal-details');

  if (looksLikeHtml(text)) {
    throw createIitcAuthError('getPortalDetails', response);
  }

  const parsed = JSON.parse(text) as IitcPortalDetailsResponse;
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

function getCurrentCommBounds(): NonNullable<IitcIrisCommState['bounds']> | undefined {
  const map = window.__iitcIrisMap;
  if (!map) return undefined;
  const bounds = map.getBounds();
  return {
    minLatE6: Math.round(bounds.getSouth() * 1_000_000),
    minLngE6: Math.round(bounds.getWest() * 1_000_000),
    maxLatE6: Math.round(bounds.getNorth() * 1_000_000),
    maxLngE6: Math.round(bounds.getEast() * 1_000_000),
  };
}

function getMapCenterE6(): {latE6: number; lngE6: number} | undefined {
  const map = window.__iitcIrisMap;
  if (!map) return undefined;
  const center = map.getCenter();
  return {
    latE6: Math.round(center.lat * 1_000_000),
    lngE6: Math.round(center.lng * 1_000_000),
  };
}

function countCommResponseMessages(response: unknown): number {
  if (!response || typeof response !== 'object') return 0;
  const result = (response as {result?: unknown}).result;
  return Array.isArray(result) ? result.length : 0;
}

function normalizeCommTab(tab: unknown): IitcCommChannel {
  return tab === 'faction' || tab === 'alerts' ? tab : 'all';
}

function toCommMessagePreview(message: IitcCommMessage): NonNullable<IitcIrisCommState['recent']>[number] {
  const players = [
    message.player.name,
    ...message.mentions,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  return {
    id: message.guid,
    time: message.time,
    text: message.text,
    team: message.team,
    type: message.type,
    public: message.public,
    secure: message.secure,
    alert: message.alert,
    auto: message.auto,
    narrowcast: message.narrowcast,
    player: message.player.name,
    playerTeam: message.player.team,
    parts: renderIitcCommMarkup(message),
    portals: message.markup
      .filter(([type]) => type === 'PORTAL')
      .map(([, value]) => ({
        name: value.name,
        address: value.address,
        latE6: value.latE6,
        lngE6: value.lngE6,
      })),
    players: [...new Set(players)],
  };
}

async function fetchComm(
  version: string,
  tab: IitcCommChannel,
  bounds: NonNullable<IitcIrisCommState['bounds']> | undefined,
  getOlderMsgs: boolean,
  signal?: AbortSignal,
): Promise<unknown> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('getPlexts missing csrftoken');
  if (!bounds) throw new Error('getPlexts missing map bounds');
  const postData = genIitcCommPostData({
    channel: tab,
    bounds,
    storageHash: commChannelsData[tab],
    getOlderMsgs,
    version,
  });

  const {response, text} = await fetchIitcEndpointText('getPlexts', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(postData),
  }, tab === 'all' ? 'comm-all' : `comm-${tab}`);

  if (looksLikeHtml(text)) {
    throw createIitcAuthError('getPlexts', response);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`);
    throw error;
  }
  if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`);
  const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
  if (typeof error === 'string' && error) throw new Error(error);
  return parsed;
}

async function postSendPlext(payload: NonNullable<ReturnType<typeof genIitcCommSendPlextPostData>>, signal?: AbortSignal): Promise<unknown> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('sendPlext missing csrftoken');

  const {response, text} = await fetchIitcEndpointText('sendPlext', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(payload),
  }, `comm-send-${payload.tab}`);

  if (looksLikeHtml(text)) {
    throw createIitcAuthError('sendPlext', response);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`);
    throw error;
  }
  if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`);
  const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
  if (typeof error === 'string' && error) throw new Error(error);
  return parsed;
}

async function postIntelEndpoint(endpoint: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error(`${endpoint} missing csrftoken`);
  const version = extractVersion();
  if (!version) throw new Error(`${endpoint} missing Intel version`);

  const {response, text} = await fetchIitcEndpointText(endpoint, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({...payload, v: version}),
  }, endpoint);

  if (looksLikeHtml(text)) {
    throw createIitcAuthError(endpoint, response);
  }

  const parsed = JSON.parse(text) as unknown;
  const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
  if (typeof error === 'string' && error) throw new Error(error);
  return parsed;
}

function setSubscriptionState(nextState: IitcIrisSubscriptionState): void {
  latestSubscriptionState = nextState;
  postAgentState();
  postInventoryState();
}

async function refreshSubscriptionStatus(): Promise<IitcIrisSubscriptionState> {
  if (currentSubscriptionPromise) return currentSubscriptionPromise;

  const abortController = new AbortController();
  currentSubscriptionAbortController = abortController;
  const startedAt = performance.now();
  setSubscriptionState({...latestSubscriptionState, status: 'loading', error: undefined});

  currentSubscriptionPromise = (async (): Promise<IitcIrisSubscriptionState> => {
    try {
      const response = await postIntelEndpoint('getHasActiveSubscription', {}, abortController.signal);
      const hasActive = parseSubscriptionResponse(response);
      const nextState: IitcIrisSubscriptionState = {
        status: hasActive ? 'active' : 'inactive',
        hasActive,
        elapsedMs: performance.now() - startedAt,
        checkedAt: Date.now(),
      };
      setSubscriptionState(nextState);
      return nextState;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return latestSubscriptionState;
      const status = isIitcAuthError(error) ? 'auth' : 'error';
      const nextState: IitcIrisSubscriptionState = {
        status,
        hasActive: false,
        elapsedMs: performance.now() - startedAt,
        checkedAt: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };
      setSubscriptionState(nextState);
      return nextState;
    } finally {
      if (currentSubscriptionAbortController === abortController) currentSubscriptionAbortController = undefined;
      currentSubscriptionPromise = undefined;
    }
  })();

  return currentSubscriptionPromise;
}

function parseSubscriptionResponse(response: unknown): boolean {
  const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
  return result === true;
}

function numberFromUnknown(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

function parseGameScoreResponse(response: unknown): NonNullable<IitcIrisScoresState['game']> | undefined {
  const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
  if (!Array.isArray(result)) return undefined;
  const enlightened = numberFromUnknown(result[0]);
  const resistance = numberFromUnknown(result[1]);
  if (enlightened === undefined || resistance === undefined) return undefined;
  const total = Math.max(1, enlightened + resistance);
  return {
    enlightened,
    resistance,
    enlightenedPercent: (enlightened / total) * 100,
    resistancePercent: (resistance / total) * 100,
  };
}

function parseRegionScoreResponse(response: unknown, center: NonNullable<IitcIrisScoresState['region']>['center']): NonNullable<IitcIrisScoresState['region']> {
  const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
  if (!result || typeof result !== 'object') return {status: 'empty', center};
  const region = result as {
    regionName?: unknown;
    gameScore?: unknown;
    scoreHistory?: unknown;
    topAgents?: unknown;
  };
  const gameScore = Array.isArray(region.gameScore) ? region.gameScore : [];
  const scoreHistory = Array.isArray(region.scoreHistory) ? region.scoreHistory : [];
  const topAgents = Array.isArray(region.topAgents) ? region.topAgents : [];
  const topAgentList = topAgents
    .map((agent) => {
      const candidate = agent && typeof agent === 'object' ? agent as {nick?: unknown; team?: unknown} : {};
      const team = candidate.team === 'RESISTANCE'
        ? 'R'
        : candidate.team === 'ENLIGHTENED'
          ? 'E'
          : candidate.team === 'MACHINA'
            ? 'M'
            : 'N';
      return typeof candidate.nick === 'string' ? {nick: candidate.nick, team} : undefined;
    })
    .filter((agent): agent is {nick: string; team: 'E' | 'R' | 'N' | 'M'} => agent !== undefined);
  const checkpointIndexes = scoreHistory
    .map((entry) => Array.isArray(entry) ? numberFromUnknown(entry[0]) : undefined)
    .filter((value): value is number => value !== undefined);

  return {
    status: 'ready',
    name: typeof region.regionName === 'string' ? region.regionName : undefined,
    enlightenedAvg: numberFromUnknown(gameScore[0]),
    resistanceAvg: numberFromUnknown(gameScore[1]),
    checkpoints: scoreHistory.length,
    lastCheckpoint: checkpointIndexes.length > 0 ? Math.max(...checkpointIndexes) : undefined,
    topAgents: topAgents.length,
    topAgentList,
    center,
  };
}

function sanitizePasscode(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[^\x20-\x7E]+/g, '').trim() : '';
}

function parsePasscodeRewards(response: unknown, passcode: string, elapsedMs: number): IitcIrisPasscodeState {
  const data = response && typeof response === 'object' ? response as {rewards?: unknown} : {};
  const rewards = data.rewards && typeof data.rewards === 'object' ? data.rewards as {
    ap?: unknown;
    xm?: unknown;
    other?: unknown;
    inventory?: unknown;
  } : undefined;
  if (!rewards) throw new Error('unexpected passcode response');

  const items: IitcIrisPasscodeRewardItem[] = [];
  const inventory = Array.isArray(rewards.inventory) ? rewards.inventory : [];
  for (const entry of inventory) {
    const type = entry && typeof entry === 'object' ? entry as {name?: unknown; awards?: unknown} : {};
    const label = typeof type.name === 'string' ? type.name : 'Item';
    const awards = Array.isArray(type.awards) ? type.awards : [];
    for (const award of awards) {
      const item = award && typeof award === 'object' ? award as {count?: unknown; level?: unknown} : {};
      items.push({
        label,
        count: numberFromUnknown(item.count) ?? 1,
        level: numberFromUnknown(item.level),
      });
    }
  }

  const other = Array.isArray(rewards.other)
    ? rewards.other.filter((item): item is string => typeof item === 'string')
    : undefined;
  const ap = numberFromUnknown(rewards.ap);
  const xm = numberFromUnknown(rewards.xm);

  return {
    status: other?.length || items.length > 0 || (ap ?? 0) > 0 || (xm ?? 0) > 0 ? 'ready' : 'empty',
    requestState: 'ready',
    passcode,
    ap,
    xm,
    other,
    items,
    elapsedMs,
  };
}

function createInventoryStateFromSummary(
  summary: IitcInventorySummary,
  status: IitcIrisInventoryState['status'],
  requestState: IitcIrisInventoryState['requestState'],
  elapsedMs?: number,
): IitcIrisInventoryState {
  const selectedKeyCount = getIitcInventoryPortalKeyCount(summary, selectedPortalGuid);
  const capsuleKeyTotal = selectedKeyCount
    ? Object.values(selectedKeyCount.capsuleCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  return {
    status,
    requestState,
    subscription: latestSubscriptionState,
    items: summary.totalItems,
    rawItems: summary.rawItems,
    keys: summary.keyCounts.reduce((sum, keyCount) => sum + keyCount.count, 0),
    portalsWithKeys: summary.keyCounts.length,
    capsules: summary.capsuleCounts.length,
    selectedPortalGuid,
    selectedPortalTitle: selectedPortal?.title,
    portalKeysForSelectedPortal: selectedKeyCount ? {
      total: selectedKeyCount.count,
      capsule: capsuleKeyTotal,
      loose: selectedKeyCount.count - capsuleKeyTotal,
      capsules: selectedKeyCount.capsuleCounts,
    } : null,
    topItems: summary.itemCounts
      .slice()
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 10)
      .map((item) => ({
        label: item.label,
        type: item.type,
        count: item.count,
        level: item.level,
        rarity: item.rarity,
      })),
    topKeys: summary.keyCounts
      .slice()
      .sort((a, b) => b.count - a.count || (a.portalTitle ?? '').localeCompare(b.portalTitle ?? ''))
      .slice(0, 8)
      .map((keyCount) => ({
        portalGuid: keyCount.portalGuid,
        portalTitle: keyCount.portalTitle,
        count: keyCount.count,
        capsule: Object.values(keyCount.capsuleCounts).reduce((sum, count) => sum + count, 0),
      })),
    elapsedMs,
  };
}

function refreshInventorySelectedPortalState(): void {
  if (!latestInventorySummary) return;
  latestInventoryState = createInventoryStateFromSummary(
    latestInventorySummary,
    latestInventoryState.status,
    latestInventoryState.requestState,
    latestInventoryState.elapsedMs,
  );
}

async function refreshScores(): Promise<void> {
  cancelActiveScoresFetch();
  const center = getMapCenterE6();
  if (!center) {
    latestScoresState = {status: 'error', requestState: 'error', region: {status: 'error'}, error: 'missing map center'};
    postScoresState();
    return;
  }

  const abortController = new AbortController();
  currentScoresAbortController = abortController;
  const startedAt = performance.now();
  latestScoresState = {
    ...latestScoresState,
    status: 'loading',
    requestState: 'loading',
    error: undefined,
    region: {
      ...(latestScoresState.region ?? {status: 'idle'}),
      status: 'loading',
      center,
      error: undefined,
    },
  };
  postScoresState();

  try {
    const [gameResponse, regionResponse] = await Promise.all([
      postIntelEndpoint('getGameScore', {}, abortController.signal),
      postIntelEndpoint('getRegionScoreDetails', center, abortController.signal),
    ]);
    const game = parseGameScoreResponse(gameResponse);
    const region = parseRegionScoreResponse(regionResponse, center);
    latestScoresState = {
      status: game || region.status === 'ready' ? 'ready' : 'empty',
      requestState: 'ready',
      game,
      region,
      elapsedMs: performance.now() - startedAt,
    };
    postScoresState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const status = isIitcAuthError(error) ? 'auth' : 'error';
    latestScoresState = {
      ...latestScoresState,
      status,
      requestState: status,
      elapsedMs: performance.now() - startedAt,
      region: {
        ...(latestScoresState.region ?? {status: 'idle'}),
        status,
        center,
        error: error instanceof Error ? error.message : String(error),
      },
      error: error instanceof Error ? error.message : String(error),
    };
    postScoresState();
  } finally {
    if (currentScoresAbortController === abortController) currentScoresAbortController = undefined;
  }
}

async function redeemPasscode(passcodeInput: unknown): Promise<void> {
  const passcode = sanitizePasscode(passcodeInput);
  cancelActivePasscodeFetch();
  if (!passcode) {
    latestPasscodeState = {status: 'error', requestState: 'error', error: 'missing passcode'};
    postPasscodeState();
    return;
  }

  const abortController = new AbortController();
  currentPasscodeAbortController = abortController;
  const startedAt = performance.now();
  latestPasscodeState = {
    ...latestPasscodeState,
    status: 'loading',
    requestState: 'loading',
    passcode,
    error: undefined,
  };
  postPasscodeState();

  try {
    const response = await postIntelEndpoint('redeemReward', {passcode}, abortController.signal);
    latestPasscodeState = parsePasscodeRewards(response, passcode, performance.now() - startedAt);
    postPasscodeState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const status = isIitcAuthError(error) ? 'auth' : 'error';
    latestPasscodeState = {
      ...latestPasscodeState,
      status,
      requestState: status,
      passcode,
      elapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    postPasscodeState();
  } finally {
    if (currentPasscodeAbortController === abortController) currentPasscodeAbortController = undefined;
  }
}

async function refreshInventory(): Promise<void> {
  cancelActiveInventoryFetch();
  const abortController = new AbortController();
  currentInventoryAbortController = abortController;
  const startedAt = performance.now();
  latestInventoryState = {
    ...latestInventoryState,
    status: 'loading',
    requestState: 'loading',
    error: undefined,
  };
  postInventoryState();

  try {
    void refreshSubscriptionStatus();
    const response = await postIntelEndpoint('getInventory', {lastQueryTimestamp: 0}, abortController.signal);
    const rawItems = parseIitcInventoryResponse(response);
    latestInventorySummary = summarizeIitcInventory(rawItems);
    latestInventoryState = createInventoryStateFromSummary(
      latestInventorySummary,
      rawItems.length > 0 ? 'ready' : 'empty',
      'ready',
      performance.now() - startedAt,
    );
    postInventoryState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const status = isIitcAuthError(error) ? 'auth' : 'error';
    latestInventoryState = {
      ...latestInventoryState,
      status,
      requestState: status,
      elapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    postInventoryState();
  } finally {
    if (currentInventoryAbortController === abortController) currentInventoryAbortController = undefined;
  }
}

async function sendComm(tab: IitcCommChannel, message: unknown): Promise<void> {
  const text = typeof message === 'string' ? message : '';
  const center = getMapCenterE6();
  const payload = center ? genIitcCommSendPlextPostData({
    channel: tab,
    message: text,
    ...center,
  }) : null;
  if (!payload) {
    latestCommState = {
      ...latestCommState,
      tab,
      sendStatus: 'error',
      sendError: tab === 'alerts' ? "can't send to alerts" : 'empty message or missing map center',
    };
    postCommState();
    return;
  }

  const abortController = new AbortController();
  latestCommState = {
    ...latestCommState,
    tab,
    sendStatus: 'sending',
    sendError: undefined,
  };
  postCommState();

  try {
    await postSendPlext(payload, abortController.signal);
    latestCommState = {
      ...latestCommState,
      tab,
      sendStatus: 'sent',
      sendError: undefined,
    };
    postCommState();
    await refreshComm(tab);
  } catch (error) {
    latestCommState = {
      ...latestCommState,
      tab,
      sendStatus: isIitcAuthError(error) ? 'auth' : 'error',
      sendError: error instanceof Error ? error.message : String(error),
    };
    postCommState();
  }
}

async function refreshComm(tab: IitcCommChannel = normalizeCommTab(latestCommState.tab), getOlderMsgs = false): Promise<void> {
  cancelActiveCommFetch();
  const version = extractVersion();
  const bounds = getCurrentCommBounds();
  if (!version) {
    latestCommState = {status: 'auth', tab, messages: getIitcCommChannelMessages(commChannelsData[tab]).length, requestOlder: getOlderMsgs, bounds, error: 'missing Intel version'};
    postCommState();
    return;
  }

  const abortController = new AbortController();
  currentCommAbortController = abortController;
  const startedAt = performance.now();
  const cachedCommMessages = getIitcCommChannelMessages(commChannelsData[tab]);
  latestCommState = {
    ...latestCommState,
    status: 'loading',
    tab,
    messages: cachedCommMessages.length,
    requestOlder: getOlderMsgs,
    bounds,
    recent: cachedCommMessages.map(toCommMessagePreview),
    oldestTimestamp: commChannelsData[tab].oldestTimestamp,
    newestTimestamp: commChannelsData[tab].newestTimestamp,
  };
  postCommState();

  try {
    const response = await fetchComm(version, tab, bounds, getOlderMsgs, abortController.signal);
    const elapsedMs = performance.now() - startedAt;
    const messages = countCommResponseMessages(response);
    const isAscendingOrder = !getOlderMsgs && commChannelsData[tab].newestTimestamp > -1;
    const writeResult = writeIitcCommDataToHash(response, commChannelsData[tab], getOlderMsgs, isAscendingOrder);
    commChannelsData[tab] = writeResult.channelData;
    const commMessages = getIitcCommChannelMessages(commChannelsData[tab]);
    if (tab === 'all') {
      processPlayerTrackerCommMessages(commMessages);
      renderPlayerTracker();
    }
    latestCommState = {
      status: commMessages.length > 0 ? 'ready' : 'empty',
      tab,
      messages: commMessages.length,
      responseMessages: messages,
      addedMessages: writeResult.addedMessages,
      requestOlder: getOlderMsgs,
      oldMessagesWereAdded: writeResult.oldMessagesWereAdded,
      recent: commMessages.map(toCommMessagePreview),
      elapsedMs,
      bounds,
      oldestTimestamp: commChannelsData[tab].oldestTimestamp,
      newestTimestamp: commChannelsData[tab].newestTimestamp,
    };
    postCommState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    latestCommState = {
      status: isIitcAuthError(error) ? 'auth' : 'error',
      tab,
      messages: getIitcCommChannelMessages(commChannelsData[tab]).length,
      requestOlder: getOlderMsgs,
      elapsedMs: performance.now() - startedAt,
      bounds,
      error: error instanceof Error ? error.message : String(error),
    };
    postCommState();
  } finally {
    if (currentCommAbortController === abortController) currentCommAbortController = undefined;
  }
}

async function refreshPlayerTrackerComm(): Promise<void> {
  if (!isPlayerTrackerVisible()) {
    renderPlayerTracker();
    return;
  }
  cancelActivePlayerTrackerFetch();
  const version = extractVersion();
  const bounds = getCurrentCommBounds();
  if (!version || !bounds) {
    renderPlayerTracker();
    return;
  }

  const abortController = new AbortController();
  currentPlayerTrackerCommAbortController = abortController;

  try {
    const response = await fetchComm(version, 'all', bounds, false, abortController.signal);
    const writeResult = writeIitcCommDataToHash(response, commChannelsData.all, false, commChannelsData.all.newestTimestamp > -1);
    commChannelsData.all = writeResult.channelData;
    const messages = getIitcCommChannelMessages(commChannelsData.all);
    processPlayerTrackerCommMessages(messages);
    renderPlayerTracker();
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      renderPlayerTracker();
    }
  } finally {
    if (currentPlayerTrackerCommAbortController === abortController) currentPlayerTrackerCommAbortController = undefined;
    if (isPlayerTrackerVisible()) schedulePlayerTrackerRefresh(PLAYER_TRACKER_COMM_REFRESH_MS);
  }
}

function toPortalDetailsState(
  details: NonNullable<ReturnType<typeof parseIitcPortalDetailsResponse>>,
  elapsedMs: number,
): IitcIrisPortalDetailsState {
  return {
    status: 'ready',
    guid: details.guid,
    elapsedMs,
    owner: details.owner,
    mods: details.mods,
    resonators: details.resonators,
    history: {
      visited: details.visited,
      captured: details.captured,
      scoutControlled: details.scoutControlled,
    },
    mitigation: details.mitigation,
    hasMissionsStartingHere: details.hasMissionsStartingHere,
  };
}

async function refreshSelectedPortalDetails(guid: string): Promise<void> {
  cancelActivePortalDetailsFetch();
  const cachedDetails = portalDetailsCache.get(guid);
  if (cachedDetails) {
    latestPortalDetails = {...cachedDetails, cached: true};
    repostLatestEntityStatus();
  }
  const version = extractVersion();
  if (!version) {
    latestPortalDetails = {status: 'auth', guid, error: 'missing Intel version'};
    repostLatestEntityStatus();
    return;
  }

  const abortController = new AbortController();
  currentPortalDetailsAbortController = abortController;
  const startedAt = performance.now();
  if (!cachedDetails) {
    latestPortalDetails = {status: 'loading', guid};
    repostLatestEntityStatus();
  }

  try {
    const response = await fetchPortalDetails(guid, version, abortController.signal);
    if (selectedPortalGuid !== guid) return;
    const linkCount = selectedPortal?.links.count ?? 0;
    const details = parseIitcPortalDetailsResponse(response, guid, linkCount);
    if (!details) {
      latestPortalDetails = {status: 'error', guid, elapsedMs: performance.now() - startedAt, error: 'empty portal details'};
    } else {
      latestPortalDetails = toPortalDetailsState(details, performance.now() - startedAt);
      portalDetailsCache.set(guid, latestPortalDetails);
      if (portalDetailsCache.size > 12) portalDetailsCache.delete(portalDetailsCache.keys().next().value as string);
      if (latestPortalDetails.history) portalHistoryByGuid.set(guid, latestPortalDetails.history);
      const currentEntities = latestEntities;
      const portal = currentEntities?.portals.find((candidate) => candidate.guid === guid);
      if (currentEntities && portal) {
        portal.title = details.title || portal.title;
        portal.image = details.image || portal.image;
        portal.team = details.team;
        portal.latE6 = details.latE6;
        portal.lngE6 = details.lngE6;
        portal.level = details.level;
        portal.health = details.health;
        portal.resCount = details.resCount;
        portal.mission = details.hasMissionsStartingHere;
        portal.history = latestPortalDetails.history;
        portal.isPlaceholder = false;
        selectedPortal = toSelectedPortal(portal);
        renderEntities(currentEntities);
      }
    }
    repostLatestEntityStatus();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    latestPortalDetails = {
      status: isIitcAuthError(error) ? 'auth' : 'error',
      guid,
      elapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    repostLatestEntityStatus();
  } finally {
    if (currentPortalDetailsAbortController === abortController) currentPortalDetailsAbortController = undefined;
  }
}

function createPlanFromMap(): IitcMapDataPlan | null {
  const map = window.__iitcIrisMap;
  if (!map) return null;

  const center = map.getCenter();
  const bounds = map.getBounds();
  return createIitcMapDataPlan({
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  }, {lat: center.lat, lng: center.lng}, map.getZoom(), {
    boundsPaddingRatio: REQUEST_BOUNDS_PADDING_RATIO,
  });
}

function toRenderEntities(response: IitcGetEntitiesResponse, generation: number, artifactEntities: IitcRawGameEntity[] = []): IitcIrisRenderEntities {
  const decoded = decodeIitcGetEntitiesResponse(response);
  if (artifactEntities.length > 0) {
    const artifactDecoded = decodeIitcGameEntities(artifactEntities);
    Object.assign(decoded.portals, artifactDecoded.portals);
  }

  return {
    generation,
    portals: Object.values(decoded.portals).map((portal) => {
      const history = portal.history ?? portalHistoryByGuid.get(portal.guid);
      if (portal.history) portalHistoryByGuid.set(portal.guid, portal.history);
      return {
        guid: portal.guid,
        title: portal.title,
        image: portal.image,
        team: portal.team,
        latE6: portal.latE6,
        lngE6: portal.lngE6,
        level: portal.level,
        health: portal.health,
        resCount: portal.resCount,
        mission: portal.mission,
        mission50plus: portal.mission50plus,
        ornaments: portal.ornaments,
        artifacts: toRenderArtifacts(getIitcPortalArtifacts(portal.artifactBrief)),
        history,
        isPlaceholder: portal.isPlaceholder,
      };
    }),
    links: Object.values(decoded.links).map((link) => ({
      guid: link.guid,
      team: link.team,
      oGuid: link.oGuid,
      oLatE6: link.oLatE6,
      oLngE6: link.oLngE6,
      dGuid: link.dGuid,
      dLatE6: link.dLatE6,
      dLngE6: link.dLngE6,
    })),
    fields: Object.values(decoded.fields).map((field) => ({
      guid: field.guid,
      team: field.team,
      points: field.points.map((point) => ({guid: point.guid, latE6: point.latE6, lngE6: point.lngE6})),
    })),
  };
}

async function fetchEntityBatch(tileKeys: string[], version: string, signal?: AbortSignal): Promise<IitcGetEntitiesResponse> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('getEntities missing csrftoken');

  const {response, text} = await fetchIitcEndpointText('getEntities', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({tileKeys, v: version}),
  }, 'entities');

  if (looksLikeHtml(text)) {
    throw createIitcAuthError('getEntities', response);
  }
  if (!response.ok) throw new Error(`getEntities failed HTTP ${response.status}`);
  if (!text.trim()) throw new Error('getEntities returned empty response');

  try {
    return JSON.parse(text) as IitcGetEntitiesResponse;
  } catch (error) {
    throw new Error(`getEntities returned non-JSON HTTP ${response.status}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchFixtureResponse(source: Extract<IitcIrisDataSourceSettings, {mode: 'fixture'}>): Promise<IitcGetEntitiesResponse> {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`fixture ${source.label} failed HTTP ${response.status}`);
  return await response.json() as IitcGetEntitiesResponse;
}

function getArtifactTypes(entities: IitcRawGameEntity[]): string[] {
  const types = new Set<string>();
  for (const portal of Object.values(decodeIitcGameEntities(entities).portals)) {
    for (const artifact of getIitcPortalArtifacts(portal.artifactBrief)) types.add(artifact.type);
  }
  return [...types].sort();
}

function countRenderArtifacts(portals: IitcIrisRenderPortal[]): {
  portals: number;
  markers: number;
  drawnMarkers: number;
  types: Record<string, number>;
} {
  const types: Record<string, number> = {};
  let artifactPortals = 0;
  let artifactMarkers = 0;
  let drawnArtifactMarkers = 0;

  for (const portal of portals) {
    if (!portal.artifacts || portal.artifacts.length === 0) continue;
    artifactPortals += 1;
    for (const artifact of portal.artifacts) {
      artifactMarkers += 1;
      if (!portal.isPlaceholder) drawnArtifactMarkers += 1;
      const key = `${artifact.role}:${artifact.type}`;
      types[key] = (types[key] ?? 0) + 1;
    }
  }

  return {portals: artifactPortals, markers: artifactMarkers, drawnMarkers: drawnArtifactMarkers, types};
}

function resetArtifactDiagnostics(status = 'disabled'): void {
  latestArtifactDiagnostics = {
    status,
    portalCount: 0,
    types: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getArtifactPortalResultEntries(result: unknown): [string, unknown][] {
  if (!isRecord(result)) return [];
  const nestedPortals = result.portals;
  if (isRecord(nestedPortals)) return Object.entries(nestedPortals);
  return Object.entries(result);
}

function toArtifactRawGameEntity(guid: string, value: unknown): IitcRawGameEntity | null {
  if (isRawGameEntity(value)) return value;
  if (!isPortalSummary(value)) return null;
  const timestamp = typeof value[13] === 'number' && Number.isFinite(value[13]) ? value[13] : Date.now();
  return [guid, timestamp, value];
}

async function fetchArtifactPortals(version: string, signal?: AbortSignal): Promise<IitcRawGameEntity[]> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('getArtifactPortals missing csrftoken');

  const {response, text} = await fetchIitcEndpointText('getArtifactPortals', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({v: version}),
  }, 'artifacts');

  if (looksLikeHtml(text)) {
    throw new Error(`getArtifactPortals returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
  }
  if (!response.ok) throw new Error(`getArtifactPortals failed HTTP ${response.status}`);
  if (!text.trim()) throw new Error('getArtifactPortals returned empty response');

  const parsed = JSON.parse(text) as ArtifactPortalsResponse;
  if (parsed.error || !parsed.result) return [];
  return getArtifactPortalResultEntries(parsed.result)
    .map(([guid, value]) => toArtifactRawGameEntity(guid, value))
    .filter((entity): entity is IitcRawGameEntity => entity !== null);
}

function isAuthLikeError(error: unknown): boolean {
  return isIitcAuthError(error);
}

async function fetchEntityBatchResult(tileKeys: string[], version: string, signal: AbortSignal): Promise<TileBatchResult> {
  try {
    return {tileKeys, response: await fetchEntityBatch(tileKeys, version, signal)};
  } catch (error) {
    return {tileKeys, error};
  }
}

function storeSuccessfulTilePayloads(response: IitcGetEntitiesResponse | undefined, tileKeys: string[]): string[] {
  const storedTileKeys: string[] = [];
  if (!response) return storedTileKeys;
  for (const tileKey of tileKeys) {
    const tile = response.result?.map?.[tileKey];
    if (tile && !tile.error) {
      mapDataCache.store(tileKey, tile);
      storedTileKeys.push(tileKey);
    }
  }
  return storedTileKeys;
}

function storeWantedSuccessfulTilePayloads(response: IitcGetEntitiesResponse | undefined, tileKeys: string[]): string[] {
  return storeSuccessfulTilePayloads(
    response,
    tileKeys.filter((tileKey) => latestWantedTileKeys.has(tileKey)),
  );
}

function recordStaleGenerationCacheWarmTileKeys(tileKeys: string[]): void {
  if (tileKeys.length === 0 || !latestTileDiagnostics) return;
  latestTileDiagnostics = {
    ...latestTileDiagnostics,
    staleGenerationCacheWarmTileKeys: uniqueStrings([
      ...(latestTileDiagnostics.staleGenerationCacheWarmTileKeys ?? []),
      ...tileKeys,
    ]),
  };
  if (latestEntities) postEntityStatus(latestEntityStatus, latestEntities, latestTileDiagnostics);
}

async function fetchArtifactEntitiesForRender(version: string, signal: AbortSignal): Promise<IitcRawGameEntity[]> {
  const startTime = performance.now();
  latestArtifactDiagnostics = {
    status: 'loading',
    portalCount: 0,
    types: [],
  };

  try {
    const entities = await fetchArtifactPortals(version, signal);
    latestArtifactEntities = entities;
    latestArtifactDiagnostics = {
      status: entities.length > 0 ? 'ready' : 'empty',
      portalCount: entities.length,
      types: getArtifactTypes(entities),
      elapsedMs: performance.now() - startTime,
    };
    return entities;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (isAuthLikeError(error)) throw error;
    latestArtifactEntities = [];
    latestArtifactDiagnostics = {
      status: 'error',
      portalCount: 0,
      types: [],
      elapsedMs: performance.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
    return [];
  }
}

function scheduleEntityRefresh(delayMs = FAST_MOVE_REFRESH_DELAY_MS): void {
  window.clearTimeout(refreshTimer);
  if (authRecoveryActive && dataSource.mode === 'live') return;
  refreshTimer = window.setTimeout(() => {
    void refreshEntities();
  }, delayMs);
}

async function refreshEntities(): Promise<void> {
  const refreshStartTime = performance.now();
  let generation = latestFetchGeneration;
  let activeQueueState: IitcTileQueueState | undefined;
  let abortController: AbortController | undefined;
  try {
    const plan = createPlanFromMap();
    if (!plan || plan.tileKeys.length === 0) return;

    const requestKey = plan.tileKeys.join('|');
    const sourceKey = dataSource.mode === 'fixture' ? `fixture:${dataSource.id}` : 'live';
    const refreshKey = `${sourceKey}|${requestKey}`;
    if (refreshKey === latestRequestKey) return;

    latestRequestKey = refreshKey;

    generation = latestFetchGeneration + 1;
    latestFetchGeneration = generation;

    if (dataSource.mode === 'fixture') {
      latestArtifactEntities = [];
      resetArtifactDiagnostics('fixture-disabled');
      postEntityStatus(`loading fixture ${dataSource.label}`, undefined, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles: 0,
        nonEmptyTiles: 0,
        viewportBounds: plan.viewportBounds,
        retryRequests: 0,
        retriedTileKeys: [],
        recoveredTileKeys: [],
        emptyTileKeys: [],
        nonEmptyTileKeys: [],
        unaccountedTileKeys: [],
        ...createIitcResponseBucketDiagnostics(),
        renderQueue: null,
        entitySource: 'fixture',
      });
      const fixtureResponse = await fetchFixtureResponse(dataSource);
      if (generation !== latestFetchGeneration) return;
      const entities = toRenderEntities(fixtureResponse, generation);
      const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(fixtureResponse, plan);
      latestPlan = plan;
      latestResponse = fixtureResponse;
      renderEntities(entities);
      renderTileDebug(plan, fixtureResponse);
      postEntityStatus(`fixture ${dataSource.label}`, entities, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles,
        nonEmptyTiles,
        elapsedMs: performance.now() - refreshStartTime,
        viewportBounds: plan.viewportBounds,
        retryRequests: 0,
        retriedTileKeys: [],
        recoveredTileKeys: [],
        emptyTileKeys,
        nonEmptyTileKeys,
        unaccountedTileKeys,
        ...createIitcResponseBucketDiagnostics(),
        queue: null,
        renderQueue: null,
        entitySource: 'fixture',
      });
      return;
    }

    const version = extractVersion();
    if (!version) throw createMissingIntelVersionError('getEntities');
    abortController = new AbortController();
    const liveAbortController = abortController;
    currentFetchAbortController = abortController;
    latestPlan = plan;
    latestWantedTileKeys = new Set(plan.tileKeys);
    const timingDiagnostics: IitcIrisMapTimingDiagnostics = {
      movementDelayMs: lifecycleSettings.iitcMovementDelay ? IITC_MOVE_REFRESH_DELAY_MS : FAST_MOVE_REFRESH_DELAY_MS,
    };
    let artifactEntitiesPromise: Promise<IitcRawGameEntity[]> | undefined;
    const getArtifactEntitiesPromise = (): Promise<IitcRawGameEntity[]> => {
      artifactEntitiesPromise ??= fetchArtifactEntitiesForRender(version, liveAbortController.signal);
      return artifactEntitiesPromise;
    };
    const responses: IitcGetEntitiesResponse[] = [];
    let renderQueue = createIitcRenderQueueState();
    let renderQueueDiagnostics = createEmptyRenderQueueDiagnostics();
    let bucketDiagnostics = createIitcResponseBucketDiagnostics();
    const freshCachedTileKeys: string[] = [];
    const staleCachedTileKeys: string[] = [];
    const queueTileKeys: string[] = [];
    for (const tileKey of plan.tileKeys) {
      const freshness = mapDataCache.isFresh(tileKey);
      const cachedTile = freshness === true ? mapDataCache.get(tileKey) : undefined;
      if (cachedTile) {
        freshCachedTileKeys.push(tileKey);
        renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, cachedTile, 'cache-fresh');
      } else {
        queueTileKeys.push(tileKey);
      }
    }
    let queueState = createIitcTileQueueState(queueTileKeys);
    activeQueueState = queueState;
    let firstRenderElapsedMs: number | undefined;
    let lastProgressRenderTime = 0;
    const renderLiveProgress = (response: IitcGetEntitiesResponse, entities: IitcIrisRenderEntities, force = false): IitcIrisRenderEntities | undefined => {
      if (mapMoveInProgress) return latestEntities;
      const now = performance.now();
      if (!force && firstRenderElapsedMs !== undefined && now - lastProgressRenderTime < 500) return latestEntities;
      renderEntities(entities);
      renderTileDebug(plan, response);
      lastProgressRenderTime = now;
      if (firstRenderElapsedMs === undefined) {
        firstRenderElapsedMs = now - refreshStartTime;
        void getArtifactEntitiesPromise().catch(() => []);
      }
      return entities;
    };
    const drainRenderQueue = (): IitcGetEntitiesResponse => {
      renderQueueDiagnostics = {
        ...renderQueueDiagnostics,
        queuedTiles: renderQueue.entries.length,
      };
      const drainResult = drainIitcRenderQueueToResponse(renderQueue, mergeIitcGetEntitiesResponses(responses));
      renderQueue = drainResult.state;
      renderQueueDiagnostics = appendRenderQueueDiagnostics(renderQueueDiagnostics, drainResult.tileStatuses);
      responses.length = 0;
      responses.push(drainResult.response);
      return drainResult.response;
    };
    let progressResponse: IitcGetEntitiesResponse | undefined;
    let progressEntities: IitcIrisRenderEntities | undefined;
    if (freshCachedTileKeys.length > 0) {
      const cachedResponse = drainRenderQueue();
      const entities = toRenderEntities(cachedResponse, generation);
      latestPlan = plan;
      progressResponse = cachedResponse;
      progressEntities = entities;
      progressEntities = renderLiveProgress(cachedResponse, entities, true);
      timingDiagnostics.cacheMs = performance.now() - refreshStartTime;
    }
    const cachedDiagnostics = progressResponse
      ? classifyTileDiagnostics(progressResponse, plan)
      : {
        returnedTiles: freshCachedTileKeys.length,
        nonEmptyTiles: freshCachedTileKeys.length,
        emptyTileKeys: [],
        nonEmptyTileKeys: freshCachedTileKeys,
        unaccountedTileKeys: [],
      };
    postEntityStatus(`fetching ${plan.tileKeys.length} tiles`, progressEntities, {
      requestedTiles: plan.tileKeys.length,
      returnedTiles: cachedDiagnostics.returnedTiles,
      nonEmptyTiles: cachedDiagnostics.nonEmptyTiles,
      firstRenderElapsedMs,
      viewportBounds: plan.viewportBounds,
      retryRequests: 0,
      retriedTileKeys: [],
      recoveredTileKeys: [],
      emptyTileKeys: cachedDiagnostics.emptyTileKeys,
      nonEmptyTileKeys: cachedDiagnostics.nonEmptyTileKeys,
      unaccountedTileKeys: [],
      ...bucketDiagnostics,
      cacheFreshTileKeys: freshCachedTileKeys,
      cacheStaleTileKeys: staleCachedTileKeys,
      queue: toQueueDiagnostics(queueState),
      renderQueue: renderQueueDiagnostics,
      timing: timingDiagnostics,
    });

    let initialRequestCount = 0;
    let mergedResponse = mergeIitcGetEntitiesResponses(responses);
    const retriedTileKeys = new Set<string>();
    let retryRequests = 0;
    const processCompletedBatch = (result: TileBatchResult, startedAsRetry: boolean): void => {
      if (result.error && isAuthLikeError(result.error)) throw result.error;
      const previousStaleTileKeys = new Set(queueState.staleTileKeys);
      const wantedAtResponse = new Set(queueState.queuedTileKeys);

      if (result.response) {
        for (const tileKey of result.tileKeys) {
          const tile = result.response.result?.map?.[tileKey];
          if (tile && !tile.error) {
            mapDataCache.store(tileKey, tile);
            if (wantedAtResponse.has(tileKey)) {
              renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, tile, 'ok');
            }
          }
        }
      }

      queueState = applyIitcTileRequestResponseToQueue(queueState, result.response ?? null, result.tileKeys, result.response !== undefined, {
        staleTileKeys: queueState.queuedTileKeys.filter((tileKey) => mapDataCache.get(tileKey) !== undefined),
      }).state;
      for (const tileKey of queueState.staleTileKeys) {
        if (previousStaleTileKeys.has(tileKey)) continue;
        const staleTile = mapDataCache.get(tileKey);
        if (staleTile) {
          staleCachedTileKeys.push(tileKey);
          renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, staleTile, 'cache-stale');
        }
      }
      activeQueueState = queueState;
      bucketDiagnostics = appendIitcResponseBucketDiagnostics(bucketDiagnostics, result.response ?? null, result.tileKeys, result.response !== undefined);
      if (startedAsRetry) {
        retryRequests += 1;
        for (const tileKey of result.tileKeys) retriedTileKeys.add(tileKey);
      }
      if (result.response) responses.push(result.response);
      mergedResponse = drainRenderQueue();
      const entities = toRenderEntities(mergedResponse, generation);
      const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
      initialRequestCount += 1;
      const recoveredTileKeys = getIitcRecoveredTileKeys([...retriedTileKeys], nonEmptyTileKeys);
      const statusEntities = renderLiveProgress(mergedResponse, entities, initialRequestCount === 1);
      postEntityStatus(startedAsRetry ? `retry ${retryRequests}` : `batch ${initialRequestCount}`, statusEntities, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles,
        nonEmptyTiles,
        firstRenderElapsedMs,
        viewportBounds: plan.viewportBounds,
        retryRequests,
        retriedTileKeys: [...retriedTileKeys],
        recoveredTileKeys,
        emptyTileKeys,
        nonEmptyTileKeys,
        unaccountedTileKeys,
        ...bucketDiagnostics,
        cacheFreshTileKeys: freshCachedTileKeys,
        cacheStaleTileKeys: staleCachedTileKeys,
        queue: toQueueDiagnostics(queueState),
        renderQueue: renderQueueDiagnostics,
        timing: timingDiagnostics,
      });
    };
    const runIitcRefillQueue = async (): Promise<boolean> => {
      const inFlight = new Map<number, Promise<{id: number; result: TileBatchResult; startedAsRetry: boolean}>>();
      let requestId = 0;
      const fillOpenRequestSlots = (): void => {
        const batches = createIitcTileQueueRequestBatches(queueState);
        for (const batch of batches) {
          const startedAsRetry = batch.some((tileKey) => (queueState.tileErrorCount[tileKey] ?? 0) > 0);
          queueState = markIitcTileRequestStarted(queueState, batch);
          activeQueueState = queueState;
          const id = requestId;
          requestId += 1;
          inFlight.set(id, fetchEntityBatchResult(batch, version, liveAbortController.signal)
            .then((result) => ({id, result, startedAsRetry})));
        }
      };

      fillOpenRequestSlots();
      while (inFlight.size > 0) {
        const settled = await Promise.race(inFlight.values());
        inFlight.delete(settled.id);
        if (generation !== latestFetchGeneration) {
          const warmedTileKeys = ENABLE_STALE_GENERATION_CACHE_WARMING
            ? storeSuccessfulTilePayloads(settled.result.response, settled.result.tileKeys)
            : storeWantedSuccessfulTilePayloads(settled.result.response, settled.result.tileKeys);
          recordStaleGenerationCacheWarmTileKeys(warmedTileKeys);
          queueState = markIitcTileQueueStale(queueState);
          activeQueueState = queueState;
          return false;
        }
        processCompletedBatch(settled.result, settled.startedAsRetry);
        fillOpenRequestSlots();
      }
      return true;
    };
    const initialStartTime = performance.now();
    if (!(await runIitcRefillQueue())) return;
    timingDiagnostics.initialMs = performance.now() - initialStartTime;

    if (generation !== latestFetchGeneration) {
      queueState = markIitcTileQueueStale(queueState);
      activeQueueState = queueState;
      return;
    }
    const artifactWaitStartTime = performance.now();
    const artifactEntities = await getArtifactEntitiesPromise();
    timingDiagnostics.artifactWaitMs = performance.now() - artifactWaitStartTime;
    if (generation !== latestFetchGeneration) {
      queueState = markIitcTileQueueStale(queueState);
      activeQueueState = queueState;
      return;
    }
    const entities = toRenderEntities(mergedResponse, generation, artifactEntities);
    const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
    const recoveredTileKeys = getIitcRecoveredTileKeys([...retriedTileKeys], nonEmptyTileKeys);
    queueState = markIitcTileQueueComplete(queueState);
    const partialTileKeys = plan.tileParams.hasPortals ? [] : [...queueState.failedTileKeys];
    activeQueueState = queueState;
    latestPlan = plan;
    latestResponse = mergedResponse;
    renderEntities(entities);
    renderTileDebug(plan, mergedResponse);
    timingDiagnostics.totalMs = performance.now() - refreshStartTime;
    postEntityStatus('entities ready', entities, {
      requestedTiles: plan.tileKeys.length,
      returnedTiles,
      nonEmptyTiles,
      elapsedMs: performance.now() - refreshStartTime,
      firstRenderElapsedMs,
      viewportBounds: plan.viewportBounds,
      retryRequests,
      retriedTileKeys: [...retriedTileKeys],
      recoveredTileKeys,
      emptyTileKeys,
      nonEmptyTileKeys,
      unaccountedTileKeys,
      ...bucketDiagnostics,
      cacheFreshTileKeys: freshCachedTileKeys,
      cacheStaleTileKeys: staleCachedTileKeys,
      partialTileKeys,
      queue: toQueueDiagnostics(queueState, partialTileKeys),
      renderQueue: renderQueueDiagnostics,
      timing: timingDiagnostics,
    });
    if (generation === latestFetchGeneration) latestWantedTileKeys = new Set();
    if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
  } catch (error) {
    if (generation !== latestFetchGeneration || (error instanceof DOMException && error.name === 'AbortError')) {
      if (activeQueueState) activeQueueState = markIitcTileQueueStale(activeQueueState);
      if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
      return;
    }
    if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
    latestRequestKey = '';
    clearAllRenderedLayers();
    postEntityStatus(error instanceof Error ? error.message : String(error));
  }
}

function installContextLongPress(map: LeafletMap): void {
  installIitcIrisContextGestures(map, {
    longPressMs: LONG_PRESS_MS,
    moveTolerancePx: LONG_PRESS_MOVE_TOLERANCE_PX,
    onLongPressStarted: () => {
      suppressPortalClickUntil = Date.now() + LONG_PRESS_CLICK_SUPPRESS_MS;
    },
    onContextPoint: openMapContextAtPoint,
    getLastContextPostAt: () => lastContextPostAt,
  });
}

function boot(): void {
  const container = document.getElementById('iitc-iris-map');
  if (!container) {
    window.setTimeout(boot, 50);
    return;
  }
  if (window.__iitcIrisPageRuntimeInitialized && window.__iitcIrisMapContainer === container && window.__iitcIrisMap) return;

  window.__iitcIrisPageRuntimeInitialized = true;
  if (window.__iitcIrisMap && window.__iitcIrisMapContainer !== container) {
    window.__iitcIrisMap.remove();
    window.__iitcIrisLayers = undefined;
  }

  const storedView = loadUrlMapView() ?? loadStoredMapView();
  const map = L.map(container, {
    zoomControl: false,
    preferCanvas: true,
    tapHold: true,
  }).setView([storedView.lat, storedView.lng], storedView.zoom);

  window.__iitcIrisMap = map;
  window.__iitcIrisMapContainer = container;
  createIitcIrisPanes(map);

  setBaseLayer(loadStoredBaseLayerId());
  L.control.zoom({position: 'topright'}).addTo(map);

  map.on('movestart', postMapMoveStarted);
  map.on('moveend', postMapMoved);
  map.on('contextmenu', (event) => {
    L.DomEvent.stop(event);
    openMapContextAtPoint(event.containerPoint);
  });
  map.on('zoomend', () => {
    renderIitcDrawTools();
    renderPlayerTracker();
    schedulePlayerTrackerRefresh();
  });
  installContextLongPress(map);
	  window.setTimeout(() => {
	    map.invalidateSize();
	    postMapMoved();
	    postAgentState();
	    renderIitcDrawTools();
	    postIitcDrawToolsStatus();
	    void refreshSubscriptionStatus();
	    window.postMessage({type: IITC_IRIS_MESSAGES.pageReady}, '*');
	  }, 0);
}

function createIitcIrisPanes(map: LeafletMap): void {
  const panes: [IitcIrisLayerPaneKey, number, string?][] = [
    ['tiles', 405],
    ['fields', 410],
    ['links', 420],
    ['portals', 430, 'auto'],
    ['ornaments', 440],
    ['artifacts', 445],
    ['selectedPortal', 448],
    ['selectedMapObject', 448],
    ['drawnItems', 449],
    ['playerTracker', 449],
    ['missions', 449],
    ['search', 451],
    ['userLocation', 452],
    ['labels', 450],
  ];

  for (const [key, zIndex, pointerEvents = 'none'] of panes) {
    const paneName = getLayerPane(key);
    const pane = map.getPane(paneName) ?? map.createPane(paneName);
    pane.style.zIndex = String(zIndex);
    pane.style.pointerEvents = pointerEvents;
  }
}

window.addEventListener('IITC_IRIS_CONTAINER_READY', boot);
window.addEventListener('message', handleMessage);
boot();
