import L, {type Layer as LeafletLayer, type Map as LeafletMap, type TileLayer} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisBaseLayerId, type IitcIrisDataSourceSettings, type IitcIrisEntitySource, type IitcIrisLayerSettings, type IitcIrisMessage, type IitcIrisQueueDiagnostics, type IitcIrisRenderArtifact, type IitcIrisRenderEntities, type IitcIrisRenderField, type IitcIrisRenderLink, type IitcIrisRenderPortal, type IitcIrisRenderPolicy} from './messages';
import {
  appendIitcResponseBucketDiagnostics,
  applyIitcTileRequestResponseToQueue,
  classifyIitcGetEntitiesResponse,
  createIitcResponseBucketDiagnostics,
  createIitcTileQueueState,
  createIitcTileQueueRequestBatches,
  createIitcEmptyTileRetryBatches,
  createIitcMapDataPlan,
  decodeIitcGameEntities,
  decodeIitcGetEntitiesResponse,
  getIitcRecoveredTileKeys,
  getIitcReusableCacheClassification,
  getIitcPortalArtifacts,
  IITC_EMPTY_TILE_RETRY_PASSES,
  markIitcTileQueueStale,
  markIitcTileRequestStarted,
  mergeIitcGetEntitiesResponses,
  type IitcGetEntitiesResponse,
  type IitcMapDataPlan,
  type IitcPortalArtifact,
  type IitcRawGameEntity,
  type IitcTileQueueState,
} from '@iris/iitc-core';

const DEFAULT_CENTER: [number, number] = [52.3730796, 4.8924534];
const DEFAULT_ZOOM = 11;
const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
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
let latestArtifactEntities: IitcRawGameEntity[] = [];
let layerSettings: IitcIrisLayerSettings = DEFAULT_LAYER_SETTINGS;
let baseLayerId: IitcIrisBaseLayerId = DEFAULT_BASE_LAYER_ID;
let baseLayer: TileLayer | undefined;
let dataSource: IitcIrisDataSourceSettings = {mode: 'live'};
let refreshTimer: number | undefined;
let currentFetchAbortController: AbortController | undefined;

interface TileDiagnostics {
  entitySource?: IitcIrisEntitySource;
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  elapsedMs?: number;
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

interface OrnamentVisibilitySettings {
  excludedPatterns: string[];
  hiddenKnown: Record<string, boolean>;
  layerStatus: Record<string, boolean>;
}

interface OrnamentDiagnostics {
  drawnMarkers: number;
  hiddenMarkers: number;
  types: Record<string, number>;
}

interface OrnamentDefinition {
  layer?: string;
  url?: string;
  offset?: [number, number];
  opacity?: number;
}

const ORNAMENT_DEFINITIONS: Record<string, OrnamentDefinition> = {
  bb_s: {layer: 'Battle'},
  sc4_p: {layer: 'Scouting'},
  sc5_p: {layer: 'Scouting'},
  ap1: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap1.svg'},
  ap1_v: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap1_v.svg'},
  ap2: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap2.svg'},
  ap2_v: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap2_v.svg'},
  ap3: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap3.svg'},
  ap3_v: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap3_v.svg'},
  ap5: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap5.svg'},
  ap5_v: {layer: 'Anomaly', url: 'https://iitc.app/extras/ornaments/ornament-ap5_v.svg'},
  peFRACK: {layer: 'Fracker', url: 'https://iitc.app/extras/ornaments/ornament-Fracker.svg'},
  peTOASTY: {url: 'https://iitc.app/extras/ornaments/ornament-TOASTY.svg', offset: [0, 0.5]},
};

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

function getLayerPane(layerKey: keyof IitcIrisLayerSettings): string {
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
  clearRenderedLayers(layers.ornaments);
  clearRenderedLayers(layers.artifacts);
  clearRenderedLayers(layers.labels);
}

function clearEntityLayers(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.fields);
  clearRenderedLayers(layers.links);
  clearRenderedLayers(layers.portals);
  clearRenderedLayers(layers.ornaments);
  clearRenderedLayers(layers.artifacts);
  clearRenderedLayers(layers.labels);
}

function createOrnamentMarker(latLng: [number, number], ornament: string, portalRadius: number): LeafletLayer {
  const definition = ORNAMENT_DEFINITIONS[ornament];
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

function loadOrnamentVisibilitySettings(): OrnamentVisibilitySettings {
  let excludedPatterns: string[] = [];
  let hiddenKnown: Record<string, boolean> = {};
  let layerStatus: Record<string, boolean> = {};
  try {
    const rawExcluded = window.localStorage.getItem('excludedOrnaments');
    const parsedExcluded: unknown = rawExcluded ? JSON.parse(rawExcluded) : [];
    if (Array.isArray(parsedExcluded)) {
      excludedPatterns = parsedExcluded.filter((value): value is string => typeof value === 'string' && value.length > 0);
    }
  } catch {
    excludedPatterns = [];
  }
  try {
    const rawKnown = window.localStorage.getItem('knownOrnaments');
    const parsedKnown: unknown = rawKnown ? JSON.parse(rawKnown) : {};
    if (parsedKnown && typeof parsedKnown === 'object' && !Array.isArray(parsedKnown)) {
      hiddenKnown = Object.fromEntries(
        Object.entries(parsedKnown).filter((entry): entry is [string, boolean] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'boolean'),
      );
    }
  } catch {
    hiddenKnown = {};
  }
  try {
    const rawLayers = window.localStorage.getItem('ingress.intelmap.layergroupdisplayed');
    const parsedLayers: unknown = rawLayers ? JSON.parse(rawLayers) : {};
    if (parsedLayers && typeof parsedLayers === 'object' && !Array.isArray(parsedLayers)) {
      layerStatus = Object.fromEntries(
        Object.entries(parsedLayers).filter((entry): entry is [string, boolean] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'boolean'),
      );
    }
  } catch {
    layerStatus = {};
  }
  return {excludedPatterns, hiddenKnown, layerStatus};
}

function isExcludedOrnament(ornament: string, settings: OrnamentVisibilitySettings): boolean {
  const layerName = ORNAMENT_DEFINITIONS[ornament]?.layer;
  return settings.excludedPatterns.some((pattern) => ornament.startsWith(pattern)) ||
    settings.hiddenKnown[ornament] === true ||
    (layerName !== undefined && settings.layerStatus[layerName] === false);
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
    ornaments: layerSettings.ornaments && optionalOverlaysVisible,
    artifacts: layerSettings.artifacts && optionalOverlaysVisible,
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

    addRenderedLayer(layers.portals, L.circleMarker(latLng, {
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
      interactive: false,
    }));

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
        if (isExcludedOrnament(ornament, ornamentVisibility)) {
          ornamentDiagnostics.hiddenMarkers += 1;
          continue;
        }
        ornamentDiagnostics.drawnMarkers += 1;
        addRenderedLayer(layers.ornaments, createOrnamentMarker(latLng, ornament, radius));
      }
    }
  }
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

function handleMessage(event: MessageEvent<IitcIrisMessage>): void {
  if (event.source !== window) return;
  if (event.data?.type === IITC_IRIS_MESSAGES.setView) {
    const map = window.__iitcIrisMap;
    if (!map || typeof event.data.lat !== 'number' || typeof event.data.lng !== 'number') return;
    const zoom = typeof event.data.zoom === 'number' ? event.data.zoom : map.getZoom();
    map.setView([event.data.lat, event.data.lng], zoom);
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
} {
  if (!entities || !bounds) {
    return {
      viewportPortals: 0,
      viewportRealPortals: 0,
      viewportPlaceholderPortals: 0,
      viewportLinks: 0,
      viewportFields: 0,
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
    queue: null,
    entitySource: 'live',
  },
): void {
  const portals = entities?.portals ?? [];
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
    artifactPortals: portals.filter((portal) => portal.artifacts && portal.artifacts.length > 0).length,
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
    retryRequests: tileDiagnostics.retryRequests ?? 0,
    retriedTileKeys: tileDiagnostics.retriedTileKeys ?? [],
    recoveredTileKeys: tileDiagnostics.recoveredTileKeys ?? [],
    emptyTileKeys: tileDiagnostics.emptyTileKeys,
    nonEmptyTileKeys: tileDiagnostics.nonEmptyTileKeys,
    unaccountedTileKeys: tileDiagnostics.unaccountedTileKeys,
    serverRetryTileKeys: tileDiagnostics.serverRetryTileKeys ?? [],
    timeoutTileKeys: tileDiagnostics.timeoutTileKeys ?? [],
    errorTileKeys: tileDiagnostics.errorTileKeys ?? [],
    responseRetryTileKeys: tileDiagnostics.responseRetryTileKeys ?? [],
    queueDelayReasons: tileDiagnostics.queueDelayReasons ?? [],
    queue: tileDiagnostics.queue,
    baseLayerId,
    dataSource,
    renderPolicy: getRenderPolicy(),
  } satisfies IitcIrisMessage, '*');
}

function toQueueDiagnostics(state: IitcTileQueueState): IitcIrisQueueDiagnostics {
  return {
    queuedTiles: state.queuedTileKeys.length,
    requestedTiles: state.requestedTileKeys.length,
    successTiles: state.successTileKeys.length,
    failedTiles: state.failedTileKeys.length,
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
      team: portal.team,
      latE6: portal.latE6,
      lngE6: portal.lngE6,
      level: portal.level,
      health: portal.health,
      ornaments: portal.ornaments,
      artifacts: toRenderArtifacts(getIitcPortalArtifacts(portal.artifactBrief)),
      isPlaceholder: portal.isPlaceholder,
    })),
    links: Object.values(decoded.links).map((link) => ({
      guid: link.guid,
      team: link.team,
      oLatE6: link.oLatE6,
      oLngE6: link.oLngE6,
      dLatE6: link.dLatE6,
      dLngE6: link.dLngE6,
    })),
    fields: Object.values(decoded.fields).map((field) => ({
      guid: field.guid,
      team: field.team,
      points: field.points.map((point) => ({latE6: point.latE6, lngE6: point.lngE6})),
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
    const artifactEntitiesPromise = fetchArtifactEntitiesForRender(version, liveAbortController.signal);
    const responses: IitcGetEntitiesResponse[] = [];
    let bucketDiagnostics = createIitcResponseBucketDiagnostics();
    let queueState = createIitcTileQueueState(plan.tileKeys);
    activeQueueState = queueState;
    const batches = createIitcTileQueueRequestBatches(queueState);
    for (const batch of batches) {
      queueState = markIitcTileRequestStarted(queueState, batch);
    }
    activeQueueState = queueState;
    postEntityStatus(`fetching ${plan.tileKeys.length} tiles`, undefined, {
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
      ...bucketDiagnostics,
      queue: toQueueDiagnostics(queueState),
    });

    const batchResults = await Promise.all(batches.map((batch) => fetchEntityBatchResult(batch, version, liveAbortController.signal)));
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
        queueState = applyIitcTileRequestResponseToQueue(queueState, result.response, result.tileKeys, true, {
          retryReturnedEmptyTiles: true,
        }).state;
        bucketDiagnostics = appendIitcResponseBucketDiagnostics(bucketDiagnostics, result.response, result.tileKeys);
        responses.push(result.response);
      } else {
        queueState = applyIitcTileRequestResponseToQueue(queueState, null, result.tileKeys, false, {
          retryReturnedEmptyTiles: true,
        }).state;
        bucketDiagnostics = appendRequestErrorDiagnostics(bucketDiagnostics, result.tileKeys);
      }
      activeQueueState = queueState;
      const mergedResponse = mergeIitcGetEntitiesResponses(responses);
      const entities = toRenderEntities(mergedResponse, generation);
      const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
      postEntityStatus(`batch ${index + 1}/${batches.length}`, entities, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles,
        nonEmptyTiles,
        viewportBounds: plan.viewportBounds,
        emptyTileKeys,
        nonEmptyTileKeys,
        unaccountedTileKeys,
        ...bucketDiagnostics,
        queue: toQueueDiagnostics(queueState),
      });
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
    if (plan.tileParams.hasPortals) {
      for (let pass = 1; pass <= IITC_EMPTY_TILE_RETRY_PASSES; pass += 1) {
        const retryTileKeys = [...queueState.queuedTileKeys];
        if (retryTileKeys.length === 0) break;

        const retryBatches = createIitcEmptyTileRetryBatches(retryTileKeys);
        const queueRetryBatches = retryBatches.flatMap((batch) => createIitcTileQueueRequestBatches(queueState, {
          maxRequests: 1,
          tilesPerRequest: batch.length,
          activeRequestCount: 0,
          pendingTileKeys: batch,
        }));
        for (let index = 0; index < queueRetryBatches.length; index += 1) {
          queueState = markIitcTileRequestStarted(queueState, queueRetryBatches[index]);
          const response = await fetchEntityBatch(queueRetryBatches[index], version, abortController.signal);
          if (generation !== latestFetchGeneration) {
            queueState = markIitcTileQueueStale(queueState);
            activeQueueState = queueState;
            return;
          }
          queueState = applyIitcTileRequestResponseToQueue(queueState, response, queueRetryBatches[index], true, {
            retryReturnedEmptyTiles: true,
          }).state;
          activeQueueState = queueState;
          bucketDiagnostics = appendIitcResponseBucketDiagnostics(bucketDiagnostics, response, queueRetryBatches[index]);
          retryRequests += 1;
          for (const tileKey of queueRetryBatches[index]) retriedTileKeys.add(tileKey);
          responses.push(response);
          mergedResponse = mergeIitcGetEntitiesResponses(responses);
          const entities = toRenderEntities(mergedResponse, generation);
          const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
          const recoveredTileKeys = getIitcRecoveredTileKeys(initialRetryTileKeys, nonEmptyTileKeys);
          postEntityStatus(`retry ${pass} ${index + 1}/${queueRetryBatches.length}`, entities, {
            requestedTiles: plan.tileKeys.length,
            returnedTiles,
            nonEmptyTiles,
            viewportBounds: plan.viewportBounds,
            retryRequests,
            retriedTileKeys: [...retriedTileKeys],
            recoveredTileKeys,
            emptyTileKeys,
            nonEmptyTileKeys,
            unaccountedTileKeys,
            ...bucketDiagnostics,
            queue: toQueueDiagnostics(queueState),
          });
        }
      }
    }

    const artifactEntities = await artifactEntitiesPromise;
    if (generation !== latestFetchGeneration) {
      queueState = markIitcTileQueueStale(queueState);
      activeQueueState = queueState;
      return;
    }
    const entities = toRenderEntities(mergedResponse, generation, artifactEntities);
    const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyTileDiagnostics(mergedResponse, plan);
    const recoveredTileKeys = getIitcRecoveredTileKeys(initialRetryTileKeys, nonEmptyTileKeys);
    latestPlan = plan;
    latestResponse = mergedResponse;
    renderEntities(entities);
    renderTileDebug(plan, mergedResponse);
    postEntityStatus('entities ready', entities, {
      requestedTiles: plan.tileKeys.length,
      returnedTiles,
      nonEmptyTiles,
      elapsedMs: performance.now() - refreshStartTime,
      viewportBounds: plan.viewportBounds,
      retryRequests,
      retriedTileKeys: [...retriedTileKeys],
      recoveredTileKeys,
      emptyTileKeys,
      nonEmptyTileKeys,
      unaccountedTileKeys,
      ...bucketDiagnostics,
      queue: toQueueDiagnostics(queueState),
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
  const panes: [keyof IitcIrisLayerSettings, number][] = [
    ['tiles', 405],
    ['fields', 410],
    ['links', 420],
    ['portals', 430],
    ['ornaments', 440],
    ['artifacts', 445],
    ['labels', 450],
  ];

  for (const [key, zIndex] of panes) {
    const paneName = getLayerPane(key);
    const pane = map.getPane(paneName) ?? map.createPane(paneName);
    pane.style.zIndex = String(zIndex);
    pane.style.pointerEvents = 'none';
  }
}

window.addEventListener('IITC_IRIS_CONTAINER_READY', boot);
window.addEventListener('message', handleMessage);
boot();
