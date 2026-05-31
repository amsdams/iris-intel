import L, {type Layer as LeafletLayer, type Map as LeafletMap, type TileLayer} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisDataSourceSettings, type IitcIrisEntitySource, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisMessage, type IitcIrisPasscodeRewardItem, type IitcIrisPasscodeState, type IitcIrisPortalDetailsState, type IitcIrisQueueDiagnostics, type IitcIrisRenderArtifact, type IitcIrisRenderEntities, type IitcIrisRenderField, type IitcIrisRenderLink, type IitcIrisRenderPortal, type IitcIrisRenderPolicy, type IitcIrisScoresState, type IitcIrisSelectedPortal} from './messages';
import {
  appendIitcResponseBucketDiagnostics,
  applyIitcTileRequestResponseToQueue,
  classifyIitcGetEntitiesResponse,
  createIitcResponseBucketDiagnostics,
  createIitcTileQueueState,
  createIitcTileQueueRequestBatches,
  createIitcEmptyTileRetryBatches,
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
  getIitcOrnamentDefinition,
  getIitcRecoveredTileKeys,
  getIitcReusableCacheClassification,
  getIitcPortalArtifacts,
  isIitcExcludedOrnament,
  IITC_EMPTY_TILE_RETRY_PASSES,
  IITC_MAX_TILE_RETRIES,
  IITC_NUM_TILES_PER_REQUEST,
  IitcDataCache,
  markIitcTileQueueComplete,
  markIitcTileQueueStale,
  markIitcTileRequestStarted,
  mergeIitcGetEntitiesResponses,
  parseIitcOrnamentVisibilitySettings,
  parseIitcInventoryResponse,
  parseIitcPortalDetailsResponse,
  renderIitcCommMarkup,
  summarizeIitcInventory,
  writeIitcCommDataToHash,
  type IitcCommChannel,
  type IitcCommChannelData,
  type IitcCommMessage,
  type IitcGetEntitiesResponse,
  type IitcInventorySummary,
  type IitcMapDataPlan,
  type IitcMapTilePayload,
  type IitcPortalDetailsResponse,
  type IitcPortalArtifact,
  type IitcOrnamentVisibilitySettings,
  type IitcRawGameEntity,
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
};
let latestFetchGeneration = 0;
let latestRequestKey = '';
let latestEntities: IitcIrisRenderEntities | undefined;
let latestPlan: IitcMapDataPlan | undefined;
let latestResponse: IitcGetEntitiesResponse | undefined;
const mapDataCache = new IitcDataCache<IitcMapTilePayload>();
let selectedPortalGuid: string | undefined;
let selectedPortal: IitcIrisSelectedPortal | null = null;
let latestPortalDetails: IitcIrisPortalDetailsState | null = null;
let latestArtifactEntities: IitcRawGameEntity[] = [];
let layerSettings: IitcIrisLayerSettings = DEFAULT_LAYER_SETTINGS;
let baseLayerId: IitcIrisBaseLayerId = DEFAULT_BASE_LAYER_ID;
let baseLayer: TileLayer | undefined;
let dataSource: IitcIrisDataSourceSettings = {mode: 'live'};
let refreshTimer: number | undefined;
let currentFetchAbortController: AbortController | undefined;
let currentPortalDetailsAbortController: AbortController | undefined;
let currentCommAbortController: AbortController | undefined;
let currentScoresAbortController: AbortController | undefined;
let currentPasscodeAbortController: AbortController | undefined;
let currentInventoryAbortController: AbortController | undefined;
let latestCommState: IitcIrisCommState = {status: 'idle', tab: loadStoredCommTab(), messages: 0};
let latestScoresState: IitcIrisScoresState = {status: 'idle', requestState: 'idle', region: {status: 'idle'}};
let latestPasscodeState: IitcIrisPasscodeState = {status: 'idle', requestState: 'idle'};
let latestInventorySummary: IitcInventorySummary | undefined;
let latestInventoryState: IitcIrisInventoryState = {
  status: 'idle',
  requestState: 'idle',
  items: 0,
  keys: 0,
  portalsWithKeys: 0,
  capsules: 0,
  portalKeysForSelectedPortal: null,
};
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
  queue?: IitcIrisQueueDiagnostics | null;
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

function postMapMoved(): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  latestFetchGeneration += 1;
  latestRequestKey = '';
  cancelActiveEntityFetch();
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
  scheduleEntityRefresh();
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
      ornaments: LeafletLayer[];
      artifacts: LeafletLayer[];
      labels: LeafletLayer[];
    };
  }
}

const TEAM_COLORS = {
  E: '#03dc03',
  R: '#0088ff',
  N: '#ff6600',
  M: '#ff1010',
} as const;
const HEALTH_COLORS = {
  cond85: '#ffff00',
  cond70: '#ffa500',
  cond60: '#ff8c00',
  cond45: '#ff0000',
  cond30: '#ff0000',
  cond15: '#ff0000',
  cond0: '#ff00ff',
} as const;
const LEVEL_COLORS = ['#000000', '#fece5a', '#ffa630', '#ff7315', '#e40000', '#fd2992', '#eb26cd', '#c124e0', '#9627f4'] as const;
const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4] as const;
const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11] as const;
const LEVEL_LABEL_COLLISION_SIZE = 15;
type IitcIrisLayerPaneKey = keyof IitcIrisLayerSettings | 'selectedPortal';

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
    ornaments: [],
    artifacts: [],
    labels: [],
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

function clearAllRenderedLayers(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.tiles);
  clearRenderedLayers(layers.fields);
  clearRenderedLayers(layers.links);
  clearRenderedLayers(layers.portals);
  clearRenderedLayers(layers.selectedPortal);
  clearRenderedLayers(layers.ornaments);
  clearRenderedLayers(layers.artifacts);
  clearRenderedLayers(layers.labels);
}

function clearEntityLayers(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.fields);
  clearRenderedLayers(layers.links);
  clearRenderedLayers(layers.portals);
  clearRenderedLayers(layers.selectedPortal);
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

function renderSelectedPortal(visiblePortals: IitcIrisRenderPortal[]): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.selectedPortal);
  if (!selectedPortalGuid) {
    selectedPortal = null;
    return;
  }

  const portal = latestEntities?.portals.find((candidate) => candidate.guid === selectedPortalGuid);
  if (!portal) {
    selectedPortalGuid = undefined;
    selectedPortal = null;
    return;
  }

  selectedPortal = toSelectedPortal(portal);
  if (!visiblePortals.some((candidate) => candidate.guid === portal.guid)) return;
  addRenderedLayer(layers.selectedPortal, createSelectedPortalMarker(portal));
}

function selectPortal(portal: IitcIrisRenderPortal): void {
  selectedPortalGuid = portal.guid;
  selectedPortal = toSelectedPortal(portal);
  refreshInventorySelectedPortalState();
  postInventoryState();
  void refreshSelectedPortalDetails(portal.guid);
  if (latestEntities) renderEntities(latestEntities);
  repostLatestEntityStatus();
}

function clearPortalSelection(): void {
  selectedPortalGuid = undefined;
  selectedPortal = null;
  latestPortalDetails = null;
  refreshInventorySelectedPortalState();
  postInventoryState();
  cancelActivePortalDetailsFetch();
  clearRenderedLayers(ensureLayers().selectedPortal);
  repostLatestEntityStatus();
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
  return layerSettings[levelKey];
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
  clearEntityLayers();

  for (const field of entities.fields) {
    if (!isFieldVisible(field) || field.points.length !== 3) continue;
    addRenderedLayer(layers.fields, L.polygon(field.points.map((point) => toLatLng(point.latE6, point.lngE6)), {
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
    addRenderedLayer(layers.links, L.polyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
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
    });
    marker.on('click', (event) => {
      L.DomEvent.stop(event);
      selectPortal(portal);
    });
    addRenderedLayer(layers.portals, marker);

    if (renderPolicy.labels && visibleLevelLabelGuids.has(portal.guid) && portal.level !== undefined) {
      addRenderedLayer(layers.labels, createLevelLabelMarker(latLng, portal.level, portal.team));
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

function repostLatestEntityStatus(): void {
  if (!latestEntities || !latestTileDiagnostics) return;
  postEntityStatus(latestEntityStatus, latestEntities, latestTileDiagnostics);
}

function postCommState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.commStatus,
    comm: latestCommState,
  } satisfies IitcIrisMessage, '*');
}

function postScoresState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.scoresStatus,
    scores: latestScoresState,
  } satisfies IitcIrisMessage, '*');
}

function postPasscodeState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.passcodeStatus,
    passcode: latestPasscodeState,
  } satisfies IitcIrisMessage, '*');
}

function postInventoryState(): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.inventoryStatus,
    inventory: latestInventoryState,
  } satisfies IitcIrisMessage, '*');
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
  if (event.data?.type === IITC_IRIS_MESSAGES.clearPortalSelection) {
    clearPortalSelection();
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
  if (event.data?.type === IITC_IRIS_MESSAGES.renderEntities && event.data.entities) {
    renderEntities(event.data.entities);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.layerSettings && event.data.layerSettings) {
    layerSettings = event.data.layerSettings;
    if (latestEntities) renderEntities(latestEntities);
    renderLatestTileDebug();
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
    scheduleEntityRefresh();
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
    queue: null,
    entitySource: 'live',
  },
): void {
  const portals = entities?.portals ?? [];
  const artifactCounts = countRenderArtifacts(portals);
  const renderPolicy = getRenderPolicy();
  const viewportCounts = countViewportEntities(entities, tileDiagnostics.viewportBounds);
  const authRequired = /login html|missing csrftoken/i.test(status);
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
    queue: tileDiagnostics.queue,
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

async function fetchPortalDetails(guid: string, version: string, signal?: AbortSignal): Promise<IitcPortalDetailsResponse> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('getPortalDetails missing csrftoken');

  const response = await fetch('/r/getPortalDetails', {
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
  });
  const text = await response.text();

  if (looksLikeHtml(text)) {
    throw new Error(`getPortalDetails returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
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

  const response = await fetch('/r/getPlexts', {
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
  });
  const text = await response.text();

  if (looksLikeHtml(text)) {
    throw new Error(`getPlexts returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
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

  const response = await fetch('/r/sendPlext', {
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
  });
  const text = await response.text();

  if (looksLikeHtml(text)) {
    throw new Error(`sendPlext returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
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

  const response = await fetch(`/r/${endpoint}`, {
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
  });
  const text = await response.text();

  if (looksLikeHtml(text)) {
    throw new Error(`${endpoint} returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
  }

  const parsed = JSON.parse(text) as unknown;
  const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
  if (typeof error === 'string' && error) throw new Error(error);
  return parsed;
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
    const status = error instanceof Error && /login html|missing csrftoken/i.test(error.message) ? 'auth' : 'error';
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
    const status = error instanceof Error && /login html|missing csrftoken/i.test(error.message) ? 'auth' : 'error';
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
    const status = error instanceof Error && /login html|missing csrftoken/i.test(error.message) ? 'auth' : 'error';
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
      sendStatus: error instanceof Error && /login html|missing csrftoken/i.test(error.message) ? 'auth' : 'error',
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
    latestCommState = {status: 'error', tab, messages: getIitcCommChannelMessages(commChannelsData[tab]).length, requestOlder: getOlderMsgs, bounds, error: 'waiting for Intel version'};
    postCommState();
    return;
  }

  const abortController = new AbortController();
  currentCommAbortController = abortController;
  const startedAt = performance.now();
  latestCommState = {
    status: 'loading',
    tab,
    messages: getIitcCommChannelMessages(commChannelsData[tab]).length,
    requestOlder: getOlderMsgs,
    bounds,
    oldestTimestamp: commChannelsData[tab].oldestTimestamp,
    newestTimestamp: commChannelsData[tab].newestTimestamp,
  };
  postCommState();

  try {
    const response = await fetchComm(version, tab, bounds, getOlderMsgs, abortController.signal);
    const elapsedMs = performance.now() - startedAt;
    const messages = countCommResponseMessages(response);
    const writeResult = writeIitcCommDataToHash(response, commChannelsData[tab], getOlderMsgs);
    commChannelsData[tab] = writeResult.channelData;
    const commMessages = getIitcCommChannelMessages(commChannelsData[tab]);
    const previewMessages = getOlderMsgs ? commMessages.slice(0, 12) : commMessages.slice(-12).reverse();
    latestCommState = {
      status: commMessages.length > 0 ? 'ready' : 'empty',
      tab,
      messages: commMessages.length,
      responseMessages: messages,
      addedMessages: writeResult.addedMessages,
      requestOlder: getOlderMsgs,
      oldMessagesWereAdded: writeResult.oldMessagesWereAdded,
      recent: previewMessages.map(toCommMessagePreview),
      elapsedMs,
      bounds,
      oldestTimestamp: commChannelsData[tab].oldestTimestamp,
      newestTimestamp: commChannelsData[tab].newestTimestamp,
    };
    postCommState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    latestCommState = {
      status: error instanceof Error && /login html|missing csrftoken/i.test(error.message) ? 'auth' : 'error',
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
  const version = extractVersion();
  if (!version) {
    latestPortalDetails = {status: 'error', guid, error: 'waiting for Intel version'};
    repostLatestEntityStatus();
    return;
  }

  const abortController = new AbortController();
  currentPortalDetailsAbortController = abortController;
  const startedAt = performance.now();
  latestPortalDetails = {status: 'loading', guid};
  repostLatestEntityStatus();

  try {
    const response = await fetchPortalDetails(guid, version, abortController.signal);
    if (selectedPortalGuid !== guid) return;
    const linkCount = selectedPortal?.links.count ?? 0;
    const details = parseIitcPortalDetailsResponse(response, guid, linkCount);
    if (!details) {
      latestPortalDetails = {status: 'error', guid, elapsedMs: performance.now() - startedAt, error: 'empty portal details'};
    } else {
      latestPortalDetails = toPortalDetailsState(details, performance.now() - startedAt);
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
        portal.isPlaceholder = false;
        selectedPortal = toSelectedPortal(portal);
        renderEntities(currentEntities);
      }
    }
    repostLatestEntityStatus();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    latestPortalDetails = {
      status: error instanceof Error && /login html|missing csrftoken/i.test(error.message) ? 'auth' : 'error',
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
    portals: Object.values(decoded.portals).map((portal) => ({
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
      isPlaceholder: portal.isPlaceholder,
    })),
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

  const response = await fetch('/r/getEntities', {
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
  });
  const text = await response.text();

  if (looksLikeHtml(text)) {
    throw new Error(`getEntities returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
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

  const response = await fetch('/r/getArtifactPortals', {
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
  });
  const text = await response.text();

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
  return error instanceof Error && /login html|missing csrftoken/i.test(error.message);
}

function appendRequestErrorDiagnostics(
  diagnostics: ReturnType<typeof createIitcResponseBucketDiagnostics>,
  tileKeys: string[],
): ReturnType<typeof createIitcResponseBucketDiagnostics> {
  return {
    ...diagnostics,
    errorTileKeys: [...diagnostics.errorTileKeys, ...tileKeys],
    responseRetryTileKeys: [...diagnostics.responseRetryTileKeys, ...tileKeys],
    queueDelayReasons: [...diagnostics.queueDelayReasons, 'error'],
  };
}

async function fetchEntityBatchResult(tileKeys: string[], version: string, signal: AbortSignal): Promise<TileBatchResult> {
  try {
    return {tileKeys, response: await fetchEntityBatch(tileKeys, version, signal)};
  } catch (error) {
    return {tileKeys, error};
  }
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

function createSequentialBatches(tileKeys: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < tileKeys.length; index += batchSize) {
    batches.push(tileKeys.slice(index, index + batchSize));
  }
  return batches;
}

function scheduleEntityRefresh(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    void refreshEntities();
  }, 250);
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

    const cachedClassification = dataSource.mode === 'live'
      ? getIitcReusableCacheClassification(
        latestPlan ? {mapZoom: latestPlan.mapZoom, dataBounds: latestPlan.dataBounds} : null,
        {mapZoom: plan.mapZoom, viewportBounds: plan.viewportBounds, tileKeys: plan.tileKeys},
        latestResponse,
      )
      : null;
    if (cachedClassification && latestResponse) {
      latestRequestKey = refreshKey;
      generation = latestFetchGeneration + 1;
      latestFetchGeneration = generation;
      let artifactEntities = latestArtifactEntities;
      if (latestArtifactDiagnostics.status === 'disabled') {
        const version = extractVersion();
        if (version) {
          abortController = new AbortController();
          currentFetchAbortController = abortController;
          artifactEntities = await fetchArtifactEntitiesForRender(version, abortController.signal);
          if (generation !== latestFetchGeneration) return;
          if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
        }
      }
      const entities = toRenderEntities(latestResponse, generation, artifactEntities);
      latestPlan = plan;
      renderEntities(entities);
      renderTileDebug(plan, latestResponse);
      postEntityStatus('entities ready', entities, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles: cachedClassification.returnedTiles,
        nonEmptyTiles: cachedClassification.nonEmptyTiles,
        elapsedMs: performance.now() - refreshStartTime,
        viewportBounds: plan.viewportBounds,
        retryRequests: 0,
        retriedTileKeys: [],
        recoveredTileKeys: [],
        emptyTileKeys: cachedClassification.emptyTileKeys,
        nonEmptyTileKeys: cachedClassification.nonEmptyTileKeys,
        unaccountedTileKeys: cachedClassification.unaccountedTileKeys,
          ...createIitcResponseBucketDiagnostics(),
        queue: null,
        entitySource: 'cache',
      });
      return;
    }

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
        entitySource: 'fixture',
      });
      return;
    }

    const version = extractVersion();
    if (!version) throw new Error('waiting for Intel version');
    cancelActiveEntityFetch();
    abortController = new AbortController();
    const liveAbortController = abortController;
    currentFetchAbortController = abortController;
    let artifactEntitiesPromise: Promise<IitcRawGameEntity[]> | undefined;
    const getArtifactEntitiesPromise = (): Promise<IitcRawGameEntity[]> => {
      artifactEntitiesPromise ??= fetchArtifactEntitiesForRender(version, liveAbortController.signal);
      return artifactEntitiesPromise;
    };
    const responses: IitcGetEntitiesResponse[] = [];
    let renderQueue = createIitcRenderQueueState();
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
    const renderLiveProgress = (response: IitcGetEntitiesResponse, entities: IitcIrisRenderEntities, force = false): void => {
      const now = performance.now();
      if (!force && firstRenderElapsedMs !== undefined && now - lastProgressRenderTime < 500) return;
      renderEntities(entities);
      renderTileDebug(plan, response);
      lastProgressRenderTime = now;
      if (firstRenderElapsedMs === undefined) {
        firstRenderElapsedMs = now - refreshStartTime;
        void getArtifactEntitiesPromise().catch(() => []);
      }
    };
    const drainRenderQueue = (): IitcGetEntitiesResponse => {
      const drainResult = drainIitcRenderQueueToResponse(renderQueue, mergeIitcGetEntitiesResponses(responses));
      renderQueue = drainResult.state;
      responses.length = 0;
      responses.push(drainResult.response);
      return drainResult.response;
    };
    if (freshCachedTileKeys.length > 0) {
      const cachedResponse = drainRenderQueue();
      const entities = toRenderEntities(cachedResponse, generation);
      renderLiveProgress(cachedResponse, entities, true);
    }
    postEntityStatus(`fetching ${plan.tileKeys.length} tiles`, undefined, {
      requestedTiles: plan.tileKeys.length,
      returnedTiles: freshCachedTileKeys.length,
      nonEmptyTiles: freshCachedTileKeys.length,
      firstRenderElapsedMs,
      viewportBounds: plan.viewportBounds,
      retryRequests: 0,
      retriedTileKeys: [],
      recoveredTileKeys: [],
      emptyTileKeys: [],
      nonEmptyTileKeys: [],
      unaccountedTileKeys: [],
      ...bucketDiagnostics,
      cacheFreshTileKeys: freshCachedTileKeys,
      cacheStaleTileKeys: staleCachedTileKeys,
      queue: toQueueDiagnostics(queueState),
    });

    const initialBatches = createSequentialBatches(queueTileKeys, IITC_NUM_TILES_PER_REQUEST);
    for (let waveStart = 0; waveStart < initialBatches.length; waveStart += 5) {
      const waveBatches = initialBatches.slice(waveStart, waveStart + 5);
      for (const batch of waveBatches) {
        queueState = markIitcTileRequestStarted(queueState, batch);
      }
      activeQueueState = queueState;

      const batchResults = await Promise.all(waveBatches.map((batch) => fetchEntityBatchResult(batch, version, liveAbortController.signal)));
      if (generation !== latestFetchGeneration) {
        queueState = markIitcTileQueueStale(queueState);
        activeQueueState = queueState;
        return;
      }
      const authError = batchResults.find((result) => result.error && isAuthLikeError(result.error))?.error;
      if (authError) throw authError;

      for (let index = 0; index < batchResults.length; index += 1) {
        const result = batchResults[index];
        if (result.response) {
          for (const tileKey of result.tileKeys) {
            const tile = result.response.result?.map?.[tileKey];
            if (tile && !tile.error) {
              mapDataCache.store(tileKey, tile);
              renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, tile, 'ok');
            }
          }
          queueState = applyIitcTileRequestResponseToQueue(queueState, result.response, result.tileKeys, true, {
            retryReturnedEmptyTiles: plan.tileParams.hasPortals,
          }).state;
          bucketDiagnostics = appendIitcResponseBucketDiagnostics(bucketDiagnostics, result.response, result.tileKeys);
          responses.push(result.response);
        } else {
          queueState = applyIitcTileRequestResponseToQueue(queueState, null, result.tileKeys, false, {
            retryReturnedEmptyTiles: plan.tileParams.hasPortals,
          }).state;
          bucketDiagnostics = appendRequestErrorDiagnostics(bucketDiagnostics, result.tileKeys);
        }
        activeQueueState = queueState;
        const mergedResponse = drainRenderQueue();
        const entities = toRenderEntities(mergedResponse, generation);
        const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
        const completedBatches = waveStart + index + 1;
        renderLiveProgress(mergedResponse, entities, completedBatches === 1);
        postEntityStatus(`batch ${completedBatches}/${initialBatches.length}`, entities, {
          requestedTiles: plan.tileKeys.length,
          returnedTiles,
          nonEmptyTiles,
          firstRenderElapsedMs,
          viewportBounds: plan.viewportBounds,
          emptyTileKeys,
          nonEmptyTileKeys,
          unaccountedTileKeys,
          ...bucketDiagnostics,
          cacheFreshTileKeys: freshCachedTileKeys,
          cacheStaleTileKeys: staleCachedTileKeys,
          queue: toQueueDiagnostics(queueState),
        });
      }
    }

    if (generation !== latestFetchGeneration) {
      queueState = markIitcTileQueueStale(queueState);
      activeQueueState = queueState;
      return;
    }
    let mergedResponse = mergeIitcGetEntitiesResponses(responses);
    const initialRetryTileKeys = [...queueState.queuedTileKeys];
    const retriedTileKeys = new Set<string>();
    let retryRequests = 0;
    const retryPasses = plan.tileParams.hasPortals ? IITC_EMPTY_TILE_RETRY_PASSES : IITC_MAX_TILE_RETRIES;
    for (let pass = 1; pass <= retryPasses; pass += 1) {
      const retryTileKeys = [...queueState.queuedTileKeys];
      if (retryTileKeys.length === 0) break;

      const retryBatches = plan.tileParams.hasPortals
        ? createIitcEmptyTileRetryBatches(retryTileKeys)
        : createSequentialBatches(retryTileKeys, IITC_NUM_TILES_PER_REQUEST);
      const queueRetryBatches = plan.tileParams.hasPortals
        ? retryBatches.flatMap((batch) => createIitcTileQueueRequestBatches(queueState, {
          maxRequests: 1,
          tilesPerRequest: batch.length,
          activeRequestCount: 0,
          pendingTileKeys: batch,
        }))
        : retryBatches;
      for (let index = 0; index < queueRetryBatches.length; index += 1) {
        queueState = markIitcTileRequestStarted(queueState, queueRetryBatches[index]);
        const response = await fetchEntityBatch(queueRetryBatches[index], version, abortController.signal);
        if (generation !== latestFetchGeneration) {
          queueState = markIitcTileQueueStale(queueState);
          activeQueueState = queueState;
          return;
        }
        const previousStaleTileKeys = new Set(queueState.staleTileKeys);
        for (const tileKey of queueRetryBatches[index]) {
          const tile = response.result?.map?.[tileKey];
          if (tile && !tile.error) {
            mapDataCache.store(tileKey, tile);
            renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, tile, 'ok');
          }
        }
        queueState = applyIitcTileRequestResponseToQueue(queueState, response, queueRetryBatches[index], true, {
          staleTileKeys: queueState.queuedTileKeys.filter((tileKey) => mapDataCache.get(tileKey) !== undefined),
          retryReturnedEmptyTiles: plan.tileParams.hasPortals,
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
        bucketDiagnostics = appendIitcResponseBucketDiagnostics(bucketDiagnostics, response, queueRetryBatches[index]);
        retryRequests += 1;
        for (const tileKey of queueRetryBatches[index]) retriedTileKeys.add(tileKey);
        responses.push(response);
        mergedResponse = drainRenderQueue();
        const entities = toRenderEntities(mergedResponse, generation);
        const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
        const recoveredTileKeys = getIitcRecoveredTileKeys(initialRetryTileKeys, nonEmptyTileKeys);
        renderLiveProgress(mergedResponse, entities);
        postEntityStatus(`retry ${pass} ${index + 1}/${queueRetryBatches.length}`, entities, {
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
        });
      }
    }

    const artifactEntities = await getArtifactEntitiesPromise();
    if (generation !== latestFetchGeneration) {
      queueState = markIitcTileQueueStale(queueState);
      activeQueueState = queueState;
      return;
    }
    const entities = toRenderEntities(mergedResponse, generation, artifactEntities);
    const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
    const recoveredTileKeys = getIitcRecoveredTileKeys(initialRetryTileKeys, nonEmptyTileKeys);
    queueState = markIitcTileQueueComplete(queueState);
    const partialTileKeys = plan.tileParams.hasPortals ? [] : [...queueState.failedTileKeys];
    activeQueueState = queueState;
    latestPlan = plan;
    latestResponse = mergedResponse;
    renderEntities(entities);
    renderTileDebug(plan, mergedResponse);
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
    });
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
  }).setView([storedView.lat, storedView.lng], storedView.zoom);

  window.__iitcIrisMap = map;
  window.__iitcIrisMapContainer = container;
  createIitcIrisPanes(map);

  setBaseLayer(loadStoredBaseLayerId());
  L.control.zoom({position: 'topright'}).addTo(map);

  map.on('moveend', postMapMoved);
  window.setTimeout(() => {
    map.invalidateSize();
    postMapMoved();
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
