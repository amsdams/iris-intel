import {h, render} from 'preact';
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import './iitc-iris.css';
import {formatIitcColorVars, getIitcItemColor, getIitcLevelColor, getIitcRarityColor, IITC_RESONATOR_ENERGY, IITC_TEAM_COLORS} from './iitc-colors';
import {formatSubscriptionBadge, formatSubscriptionLabel, getAuthErrorMessage, getPanelStatusClass, getSubscriptionStatusClass} from './ui-status';
import {
  CORE_LAYER_TOGGLE_REGISTRY,
  DEFAULT_LAYER_SETTINGS,
  DETAIL_LAYER_TOGGLE_REGISTRY,
  LAYER_REGISTRY_DIAGNOSTICS,
  type IitcIrisBooleanLayerSettingKey,
} from './layer-registry';
import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommMessage, type IitcIrisCommState, type IitcIrisCommTab, type IitcIrisDataSourceSettings, type IitcIrisDrawToolsItem, type IitcIrisDrawToolsLatLng, type IitcIrisEntitySource, type IitcIrisHighlighterSettings, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLifecycleSettings, type IitcIrisMapContextPortalAnchor, type IitcIrisMapTimingDiagnostics, type IitcIrisMessage, type IitcIrisMissionSource, type IitcIrisMissionsState, type IitcIrisPasscodeState, type IitcIrisPlayerTrackerDiagnostics, type IitcIrisPortalAnalysis, type IitcIrisPortalDetailsState, type IitcIrisPortalHighlighterId, type IitcIrisQueueDiagnostics, type IitcIrisRequestDiagnostics, type IitcIrisRenderMutationDiagnostics, type IitcIrisRenderPolicy, type IitcIrisRenderQueueDiagnostics, type IitcIrisScoresState, type IitcIrisSearchResult, type IitcIrisSearchState, type IitcIrisSelectedPortal} from './messages';
import {
  createIitcMapDataPlan,
  IITC_MAX_REQUESTS,
  IITC_MAX_TILE_RETRIES,
  IITC_NUM_TILES_PER_REQUEST,
  parseIitcDrawToolsLayer,
  serializeIitcDrawToolsLayer,
  type IitcDrawToolsItem,
  type IitcBounds,
  type IitcMapDataPlan,
  type IitcPortalAnalysisTeam,
  type IitcPortalsListEntry,
  type IitcScoreboardTeam,
} from '@iris/iitc-core';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const IITC_PAN_CONTROL_OFFSET_PX = 500;
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
const LAYER_SETTINGS_STORAGE_KEY = 'iitc-iris:layer-settings';
const HIGHLIGHTER_SETTINGS_STORAGE_KEY = 'iitc-iris:highlighter-settings';
const DATA_SOURCE_STORAGE_KEY = 'iitc-iris:data-source';
const LIFECYCLE_SETTINGS_STORAGE_KEY = 'iitc-iris:lifecycle-settings';
const DEBUG_DOCK_STORAGE_KEY = 'iitc-iris:debug-dock';
const SIDE_PANEL_STORAGE_KEY = 'iitc-iris:side-panel';
const ACTIVE_SHEET_STORAGE_KEY = 'iitc-iris:active-sheet';
const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
const PORTAL_SECTION_STORAGE_KEY = 'iitc-iris:portal-sections';
const SHORTCUTS_ENABLED_STORAGE_KEY = 'iitc-iris:shortcuts-enabled';
const MAP_FOCUS_MODE_STORAGE_KEY = 'iitc-iris:map-focus-mode';
const LOGIN_BYPASS_STORAGE_KEY = 'iitc-iris:login-bypass-until';
const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';
const LOGIN_BYPASS_MS = 5 * 60 * 1000;
const PORTAL_COUNTS_BAR_TOP = 20;
const PORTAL_COUNTS_BAR_HEIGHT = 180;
const PORTAL_COUNTS_BAR_WIDTH = 25;
const PORTAL_COUNTS_BAR_PADDING = 5;
const PORTAL_COUNTS_RADIUS_INNER = 70;
const PORTAL_COUNTS_RADIUS_OUTER = 100;
const PORTAL_COUNTS_BAR_COUNT = 4;
const PORTAL_COUNTS_SVG_WIDTH = (PORTAL_COUNTS_BAR_COUNT + 1) * (PORTAL_COUNTS_BAR_WIDTH + PORTAL_COUNTS_BAR_PADDING) + 2 * PORTAL_COUNTS_RADIUS_OUTER;
const PORTAL_COUNTS_SVG_HEIGHT = Math.max(PORTAL_COUNTS_BAR_HEIGHT, 2 * PORTAL_COUNTS_RADIUS_OUTER);
const PORTAL_COUNTS_PIE_CENTER_X = (PORTAL_COUNTS_BAR_COUNT + 1) * (PORTAL_COUNTS_BAR_WIDTH + PORTAL_COUNTS_BAR_PADDING) + PORTAL_COUNTS_RADIUS_OUTER;
const PORTAL_COUNTS_PIE_CENTER_Y = PORTAL_COUNTS_RADIUS_OUTER;
const PORTAL_ANALYSIS_PLAYER_TEAMS = ['R', 'E', 'M'] as const;
const PORTAL_ANALYSIS_PIE_TEAMS = ['R', 'E', 'M', 'N'] as const;
const VIEW_PRESETS = [
  {id: 'amsterdam-z10', label: 'AMS 10', lat: 52.3730796, lng: 4.8924534, zoom: 10},
  {id: 'amsterdam-z15', label: 'AMS 15', lat: 52.3730796, lng: 4.8924534, zoom: 15},
  {id: 'damrak-z15', label: 'DAM 15', lat: 52.3761096, lng: 4.8980545, zoom: 15},
] as const;
const BASE_LAYER_OPTIONS: {id: IitcIrisBaseLayerId; label: string; title: string}[] = [
  {id: 'cartodb-dark-matter', label: 'Dark', title: 'CartoDB Dark Matter'},
  {id: 'cartodb-positron', label: 'Light', title: 'CartoDB Positron'},
  {id: 'osm', label: 'OSM', title: 'OpenStreetMap'},
];
const DATA_SOURCE_OPTIONS = [
  {id: 'live', label: 'Live', title: 'Fetch live Intel getEntities responses', mode: 'live' as const},
  {
    id: 'ams-z10',
    label: 'AMS F10',
    title: 'Amsterdam fixture from docs/iris/update-map-samples/get-entities-z10.json',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-z10.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 10,
  },
  {
    id: 'ams-z14',
    label: 'AMS F14',
    title: 'Amsterdam fixture from docs/iris/update-map-samples/get-entities-z14.json',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-z14.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 14,
  },
  {
    id: 'dam-iitc-z15',
    label: 'DAM IITC',
    title: 'Damrak fixture extracted from IITC HAR getEntities response',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-damrak-iitc-z15.json',
    lat: 52.3761096,
    lng: 4.8980545,
    zoom: 15,
  },
] as const;
type BooleanLayerSettingKey = IitcIrisBooleanLayerSettingKey;
const CORE_OVERLAY_LAYER_TOGGLE_LABELS = CORE_LAYER_TOGGLE_REGISTRY.filter((entry) => entry.kind === 'overlay');
const PORTAL_FILTER_LAYER_TOGGLE_LABELS = CORE_LAYER_TOGGLE_REGISTRY.filter((entry) => entry.kind === 'filter');
const DETAIL_LAYER_TOGGLE_LABELS = DETAIL_LAYER_TOGGLE_REGISTRY;
type BooleanLayerToggleEntry = (typeof CORE_LAYER_TOGGLE_REGISTRY)[number];
const PORTAL_HIGHLIGHTER_OPTIONS: {id: IitcIrisPortalHighlighterId; label: string; title: string}[] = [
  {id: 'none', label: 'None', title: 'No portal highlighter'},
  {id: 'level-color', label: 'Level color', title: 'Color portal bodies by level'},
  {id: 'needs-recharge', label: 'Needs recharge', title: 'Color damaged portals by health'},
  {id: 'history-visited', label: 'Visited', title: 'Highlight visited portals'},
  {id: 'history-not-visited', label: 'Not visited', title: 'Highlight unvisited portals'},
  {id: 'history-captured', label: 'Captured', title: 'Highlight captured portals'},
  {id: 'history-not-captured', label: 'Not captured', title: 'Highlight uncaptured portals'},
  {id: 'history-scout-controlled', label: 'Scout controlled', title: 'Highlight scout-controlled portals'},
  {id: 'history-not-scout-controlled', label: 'Not scout controlled', title: 'Highlight portals not scout controlled'},
];
const DRAW_TOOLS_MARKER_PRESETS = [
  {id: 'white', color: '#ffffff', title: 'Add white marker'},
  {id: 'red', color: '#c34a4a', title: 'Add red marker'},
  {id: 'blue', color: '#4aa8c3', title: 'Add blue marker'},
  {id: 'green', color: '#51c34a', title: 'Add green marker'},
] as const;
const DRAW_TOOLS_DEFAULT_COLOR = '#a24ac3';
const RESONATOR_PANEL_ORDER: (number | null)[] = [0, 1, 2, 3, null, 4, 5, 6, 7];
const SIDE_PANEL_OPTIONS = [
  {id: 'agent', label: 'Agent', title: 'Agent status'},
  {id: 'comm', label: 'COMM', title: 'COMM messages'},
  {id: 'scores', label: 'Scores', title: 'Scores'},
  {id: 'missions', label: 'Missions', title: 'Missions'},
  {id: 'inventory', label: 'Inventory', title: 'Inventory'},
  {id: 'passcode', label: 'Passcode', title: 'Passcode redemption'},
] as const;
const COMM_TABS: {id: IitcIrisCommTab; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'faction', label: 'Faction'},
  {id: 'alerts', label: 'Alerts'},
];
const DEFAULT_RENDER_POLICY: IitcIrisRenderPolicy = {
  optionalOverlayMinZoom: 14,
  detailedPortals: false,
  activeHighlighter: 'none',
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
};
const EMPTY_REQUEST_DIAGNOSTICS: IitcIrisRequestDiagnostics = {
  activeRequests: 0,
  activeByEndpoint: {},
  active: [],
};
const EMPTY_SEARCH_STATE: IitcIrisSearchState = {
  status: 'idle',
  term: '',
  confirmed: false,
  results: [],
  localResults: 0,
};
const EMPTY_MISSIONS_STATE: IitcIrisMissionsState = {
  status: 'idle',
  requestState: 'idle',
  missions: [],
  detailsStatus: 'idle',
};
const GEOLOCATION_MAX_ZOOM = 13;
const IITC_TM_ICON_BASE = 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons';
const MISSION_TYPE_IMAGE_BY_TYPE_NUM: Record<number, string> = {
  1: 'mission-type-sequential.png',
  2: 'mission-type-random.png',
  3: 'mission-type-hidden.png',
};

interface CameraState {
  lat: number;
  lng: number;
  zoom: number;
  bounds: IitcBounds | null;
}

interface EntityFetchState {
  status: string;
  entitySource: IitcIrisEntitySource | 'idle';
  authRequired: boolean;
  generation: number;
  key: string;
  collision: boolean;
  portals: number;
  realPortals: number;
  placeholderPortals: number;
  ornamentPortals: number;
  drawnOrnamentMarkers: number;
  hiddenOrnamentMarkers: number;
  ornamentTypes: Record<string, number>;
  artifactPortals: number;
  drawnArtifactMarkers: number;
  artifactTypes: Record<string, number>;
  artifactFetchStatus: string;
  artifactFetchPortalCount: number;
  artifactFetchTypes: string[];
  artifactFetchElapsedMs: number | null;
  artifactFetchError: string;
  levelLabels: number;
  damagedPortals: number;
  links: number;
  fields: number;
  viewportPortals: number;
  viewportRealPortals: number;
  viewportPlaceholderPortals: number;
  viewportLinks: number;
  viewportFields: number;
  viewportOrnamentPortals: number;
  viewportOrnamentMarkers: number;
  viewportArtifactPortals: number;
  viewportArtifactMarkers: number;
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  elapsedMs: number | null;
  firstRenderElapsedMs: number | null;
  retryRequests: number;
  retriedTileKeys: string[];
  recoveredTileKeys: string[];
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
  unaccountedTileKeys: string[];
  serverRetryTileKeys: string[];
  timeoutTileKeys: string[];
  errorTileKeys: string[];
  responseRetryTileKeys: string[];
  queueDelayReasons: string[];
  partialTileKeys: string[];
  cacheFreshTileKeys: string[];
  cacheStaleTileKeys: string[];
  staleGenerationCacheWarmTileKeys: string[];
  queue: IitcIrisQueueDiagnostics | null;
  renderQueue: IitcIrisRenderQueueDiagnostics | null;
  renderMutation: IitcIrisRenderMutationDiagnostics | null;
  timing: IitcIrisMapTimingDiagnostics | null;
  playerTracker: IitcIrisPlayerTrackerDiagnostics | null;
  baseLayerId: IitcIrisBaseLayerId;
  dataSource: IitcIrisDataSourceSettings;
  highlighterSettings: IitcIrisHighlighterSettings;
  highlighterIds: IitcIrisPortalHighlighterId[];
  renderPolicy: IitcIrisRenderPolicy;
  selectedPortal: IitcIrisSelectedPortal | null;
  portalDetails: IitcIrisPortalDetailsState | null;
  portalAnalysis: IitcIrisPortalAnalysis | null;
}

type SidePanelId = typeof SIDE_PANEL_OPTIONS[number]['id'];
type SheetId = 'map' | 'layers' | 'view' | 'drawLinks' | 'drawMarkers' | 'portalCounts' | 'portalsList' | 'scoreboard' | 'search' | 'portal' | 'selectedLink' | 'selectedField' | 'system' | 'help' | SidePanelId;
type PrimaryMenuId = 'map' | 'selected' | 'agent' | 'comm' | 'system';
type PortalSectionId = 'mods' | 'resonators' | 'facts';
type PortalsListSortField = 'title' | 'level' | 'team' | 'health' | 'resCount' | 'links' | 'fields' | 'enemyAp' | 'keys';
type PortalsListTeamFilter = 'all' | IitcPortalAnalysisTeam;
type PortalsListLevelFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type SortOrder = 1 | -1;

interface PortalCountsBarSegment {
  level: number;
  y: number;
  height: number;
}

interface PortalCountsBar {
  id: string;
  label: string;
  color: string;
  levels: number[];
  segments: PortalCountsBarSegment[];
}

interface PortalCountsPieSegment {
  team: IitcPortalAnalysisTeam;
  start: number;
  end: number;
  path: string;
  label: string;
  labelX: number;
  labelY: number;
}

interface PortalCountsLevelRingSegment {
  team: IitcPortalAnalysisTeam;
  level: number;
  path: string;
}

interface PortalAnalysisListSummary {
  portals: number;
  links: number;
  fields: number;
  enemyAp: number;
  keys: number;
  teams: Record<IitcPortalAnalysisTeam, number>;
  history: {
    visited: number;
    captured: number;
    scoutControlled: number;
  };
}

interface ParsedViewInput {
  lat: number;
  lng: number;
  zoom?: number;
}

interface StoredMapView {
  lat: number;
  lng: number;
  zoom: number;
}

interface InnerStatusView {
  portalText: string;
  mapText: string;
  mapTitle: string;
  progressPercent: number | null;
  activeRequests: number;
  failedRequests: number;
}

interface ScenarioSnapshot {
  label: string;
  capturedAt: string;
  diagnostics: unknown;
}

interface ScenarioSnapshotSummary {
  complete?: boolean;
  source?: string;
  requestedTiles?: number;
  returnedTiles?: number;
  nonEmptyTiles?: number;
  retryRequests: number;
  retriedTiles: number;
  recoveredTiles: number;
  partialTiles: number;
  cacheFreshTiles: number;
  cacheStaleTiles: number;
  renderQueue?: {
    renderedTiles?: number;
    ok?: number;
    cacheFresh?: number;
    cacheStale?: number;
    lastStatus?: string | null;
  };
  renderMutation?: IitcIrisRenderMutationDiagnostics | null;
  timing?: IitcIrisMapTimingDiagnostics | null;
  warnings: string[];
}

interface ScenarioRun {
  id: string;
  name: string;
  startedAt: string;
  status: 'running' | 'finished';
  finishedAt?: string;
  lifecycleSettings: IitcIrisLifecycleSettings;
  snapshots: ScenarioSnapshot[];
}

interface MapContextSelection {
  lat: number;
  lng: number;
  zoom: number;
  target: 'map' | 'link' | 'field';
  guid?: string;
  team?: 'E' | 'R' | 'N' | 'M';
  portalGuids?: string[];
  portalAnchors?: IitcIrisMapContextPortalAnchor[];
  distanceMeters?: number;
}

interface DrawToolsTarget {
  lat: number;
  lng: number;
  label: string;
}

function isSupportedDrawToolsItem(item: IitcDrawToolsItem): item is Extract<IitcDrawToolsItem, {type: 'polyline' | 'marker'}> {
  return item.type === 'polyline' || item.type === 'marker';
}

function getDrawToolsItemCenter(item: IitcIrisDrawToolsItem): IitcIrisDrawToolsLatLng {
  if (item.type === 'marker') return item.latLng;
  const total = item.latLngs.reduce((sum, latLng) => ({
    lat: sum.lat + latLng.lat,
    lng: sum.lng + latLng.lng,
  }), {lat: 0, lng: 0});
  return {
    lat: total.lat / item.latLngs.length,
    lng: total.lng / item.latLngs.length,
  };
}

function getDrawToolsItemLabel(item: IitcIrisDrawToolsItem, displayIndex: number): string {
  if (item.type === 'marker') return `Marker ${displayIndex + 1}`;
  return `Link ${displayIndex + 1}`;
}

function getDrawToolsItemDetail(item: IitcIrisDrawToolsItem): string {
  if (item.type === 'marker') return `${item.latLng.lat.toFixed(6)}, ${item.latLng.lng.toFixed(6)}`;
  const start = item.latLngs[0];
  const end = item.latLngs[item.latLngs.length - 1];
  return `${start.lat.toFixed(6)}, ${start.lng.toFixed(6)} -> ${end.lat.toFixed(6)}, ${end.lng.toFixed(6)}`;
}

function stripDrawToolsStorageIndex(item: IitcIrisDrawToolsItem): IitcDrawToolsItem {
  if (item.type === 'marker') {
    return {
      type: 'marker',
      latLng: item.latLng,
      color: item.color,
    };
  }
  return {
    type: 'polyline',
    latLngs: item.latLngs,
    color: item.color,
  };
}

function isScenarioSettled(diagnostics: unknown): boolean {
  const view = diagnostics as {
    entities?: {
      complete?: boolean;
      queue?: {activeRequests?: number};
    };
    requests?: {activeRequests?: number};
  };
  return view.entities?.complete === true &&
    (view.requests?.activeRequests ?? 0) === 0 &&
    (view.entities?.queue?.activeRequests ?? 0) === 0;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function countIntersection(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}

function createScenarioSnapshotSummary(diagnostics: unknown): ScenarioSnapshotSummary {
  const view = diagnostics as {
    entities?: {
      complete?: boolean;
      source?: string;
      entitySource?: string;
      requestedTiles?: number;
      returnedTiles?: number;
      nonEmptyTiles?: number;
      retryRequests?: number;
      retriedTileKeys?: unknown;
      recoveredTileKeys?: unknown;
      partialTileKeys?: unknown;
      cacheFreshTileKeys?: unknown;
      cacheStaleTileKeys?: unknown;
      renderQueue?: IitcIrisRenderQueueDiagnostics | null;
      renderMutation?: IitcIrisRenderMutationDiagnostics | null;
      timing?: IitcIrisMapTimingDiagnostics | null;
    };
  };
  const entities = view.entities ?? {};
  const retriedTileKeys = readStringArray(entities.retriedTileKeys);
  const recoveredTileKeys = readStringArray(entities.recoveredTileKeys);
  const partialTileKeys = readStringArray(entities.partialTileKeys);
  const cacheFreshTileKeys = readStringArray(entities.cacheFreshTileKeys);
  const cacheStaleTileKeys = readStringArray(entities.cacheStaleTileKeys);
  const freshRetried = countIntersection(cacheFreshTileKeys, retriedTileKeys);
  const stalePartial = countIntersection(cacheStaleTileKeys, partialTileKeys);
  const renderQueue = entities.renderQueue ?? undefined;
  const renderMutation = entities.renderMutation ?? undefined;
  const renderedStatusTotal = renderQueue
    ? renderQueue.renderedOkTiles + renderQueue.renderedCacheFreshTiles + renderQueue.renderedCacheStaleTiles
    : 0;
  const warnings = [
    freshRetried > 0 ? `${freshRetried} fresh cached tiles were retried` : null,
    stalePartial > 0 ? `${stalePartial} stale cached tiles ended partial` : null,
    renderQueue && renderQueue.renderedTiles !== renderedStatusTotal
      ? `rendered tile count ${renderQueue.renderedTiles} differs from status total ${renderedStatusTotal}`
      : null,
  ].filter((warning): warning is string => warning !== null);

  return {
    complete: entities.complete,
    source: entities.source ?? entities.entitySource,
    requestedTiles: entities.requestedTiles,
    returnedTiles: entities.returnedTiles,
    nonEmptyTiles: entities.nonEmptyTiles,
    retryRequests: entities.retryRequests ?? 0,
    retriedTiles: retriedTileKeys.length,
    recoveredTiles: recoveredTileKeys.length,
    partialTiles: partialTileKeys.length,
    cacheFreshTiles: cacheFreshTileKeys.length,
    cacheStaleTiles: cacheStaleTileKeys.length,
    renderQueue: renderQueue ? {
      renderedTiles: renderQueue.renderedTiles,
      ok: renderQueue.renderedOkTiles,
      cacheFresh: renderQueue.renderedCacheFreshTiles,
      cacheStale: renderQueue.renderedCacheStaleTiles,
      lastStatus: renderQueue.lastRenderedTileStatus,
    } : undefined,
    renderMutation,
    timing: entities.timing,
    warnings,
  };
}

function clampView(view: ParsedViewInput): ParsedViewInput {
  return {
    lat: Math.max(-85.051128, Math.min(85.051128, view.lat)),
    lng: Math.max(-180, Math.min(179.999999, view.lng)),
    zoom: view.zoom === undefined ? undefined : Math.max(0, Math.min(21, view.zoom)),
  };
}

function isStoredMapView(value: unknown): value is StoredMapView {
  if (!value || typeof value !== 'object') return false;
  const view = value as Partial<StoredMapView>;
  return typeof view.lat === 'number' && Number.isFinite(view.lat) &&
    typeof view.lng === 'number' && Number.isFinite(view.lng) &&
    typeof view.zoom === 'number' && Number.isFinite(view.zoom);
}

function defaultMapView(): StoredMapView {
  return {lat: 52.3730796, lng: 4.8924534, zoom: 11};
}

function loadUrlMapView(): StoredMapView | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ll = params.get('ll');
    const z = params.get('z');
    if (!ll || !z) return null;
    const [latText, lngText] = ll.split(',');
    const parsed = {lat: Number(latText), lng: Number(lngText), zoom: Number(z)};
    if (!isStoredMapView(parsed)) return null;
    const clamped = clampView(parsed);
    return {lat: clamped.lat, lng: clamped.lng, zoom: clamped.zoom ?? defaultMapView().zoom};
  } catch {
    return null;
  }
}

function loadStoredMapView(): StoredMapView {
  try {
    const value = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!value) return defaultMapView();
    const parsed = JSON.parse(value) as unknown;
    if (!isStoredMapView(parsed)) return defaultMapView();
    const clamped = clampView(parsed);
    return {lat: clamped.lat, lng: clamped.lng, zoom: clamped.zoom ?? defaultMapView().zoom};
  } catch {
    return defaultMapView();
  }
}

function loadInitialMapView(): StoredMapView {
  return loadUrlMapView() ?? loadStoredMapView();
}

function parseViewInput(value: string): ParsedViewInput | null {
  const text = value.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const ll = url.searchParams.get('ll') ?? url.searchParams.get('pll');
    const z = url.searchParams.get('z');
    if (ll) {
      const [latText, lngText] = ll.split(',');
      const parsed = {
        lat: Number(latText),
        lng: Number(lngText),
        zoom: z ? Number(z) : undefined,
      };
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) && (parsed.zoom === undefined || Number.isFinite(parsed.zoom))) return clampView(parsed);
    }
  } catch {
    // Fall through to coordinate parsing.
  }

  const [latText, lngText, zoomText] = text.split(/[,\s]+/).filter(Boolean);
  const parsed = {
    lat: Number(latText),
    lng: Number(lngText),
    zoom: zoomText ? Number(zoomText) : undefined,
  };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  if (parsed.zoom !== undefined && !Number.isFinite(parsed.zoom)) return null;
  return clampView(parsed);
}

function getExtensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

function getMissionTypeIcon(typeNum?: number): string {
  return getExtensionUrl(`images/${MISSION_TYPE_IMAGE_BY_TYPE_NUM[typeNum ?? 0] ?? 'mission-type-unknown.png'}`);
}

function getMissionMetricIcon(name: 'rating' | 'time' | 'length' | 'agents' | 'waypoints' | 'order'): string {
  if (name === 'rating') return `${IITC_TM_ICON_BASE}/like.png`;
  if (name === 'time') return `${IITC_TM_ICON_BASE}/time.png`;
  if (name === 'agents') return `${IITC_TM_ICON_BASE}/players.png`;
  if (name === 'length') return getExtensionUrl('images/mission-length.png');
  return getMissionTypeIcon();
}

function isBaseLayerId(value: string | null): value is IitcIrisBaseLayerId {
  return value === 'osm' || value === 'cartodb-dark-matter' || value === 'cartodb-positron';
}

function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = window.localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    return isBaseLayerId(value) ? value : 'cartodb-dark-matter';
  } catch {
    return 'cartodb-dark-matter';
  }
}

function isLayerSettings(value: unknown): value is Partial<IitcIrisLayerSettings> {
  return !!value && typeof value === 'object';
}

type LegacyStoredLayerSettings = Partial<IitcIrisLayerSettings> & {
  drawnItems?: unknown;
  levelFill?: unknown;
  healthFill?: unknown;
  historyCaptured?: unknown;
  historyVisited?: unknown;
  historyScoutControlled?: unknown;
};

function isPortalHighlighterId(value: unknown): value is IitcIrisPortalHighlighterId {
  return PORTAL_HIGHLIGHTER_OPTIONS.some((option) => option.id === value);
}

function normalizePortalHighlighterId(value: unknown): IitcIrisPortalHighlighterId {
  if (isPortalHighlighterId(value)) return value;
  if (value === 'history-visited-captured') return 'history-visited';
  if (value === 'history-not-visited-captured') return 'history-not-visited';
  return 'none';
}

function loadStoredLayerSettings(): IitcIrisLayerSettings {
  try {
    const value = window.localStorage.getItem(LAYER_SETTINGS_STORAGE_KEY);
    if (!value) return DEFAULT_LAYER_SETTINGS;
    const parsed = JSON.parse(value) as unknown;
    if (!isLayerSettings(parsed)) return DEFAULT_LAYER_SETTINGS;
    const legacyParsed = parsed as LegacyStoredLayerSettings;
    const legacyPlayerTracker = typeof parsed.playerTracker === 'boolean' ? parsed.playerTracker : undefined;
    const storedKeyCount = (parsed as Record<string, unknown>).keyCount;
    return {
      fields: typeof parsed.fields === 'boolean' ? parsed.fields : DEFAULT_LAYER_SETTINGS.fields,
      links: typeof parsed.links === 'boolean' ? parsed.links : DEFAULT_LAYER_SETTINGS.links,
      portals: typeof parsed.portals === 'boolean' ? parsed.portals : DEFAULT_LAYER_SETTINGS.portals,
      unclaimedPortals: typeof parsed.unclaimedPortals === 'boolean' ? parsed.unclaimedPortals : DEFAULT_LAYER_SETTINGS.unclaimedPortals,
      level1Portals: typeof parsed.level1Portals === 'boolean' ? parsed.level1Portals : DEFAULT_LAYER_SETTINGS.level1Portals,
      level2Portals: typeof parsed.level2Portals === 'boolean' ? parsed.level2Portals : DEFAULT_LAYER_SETTINGS.level2Portals,
      level3Portals: typeof parsed.level3Portals === 'boolean' ? parsed.level3Portals : DEFAULT_LAYER_SETTINGS.level3Portals,
      level4Portals: typeof parsed.level4Portals === 'boolean' ? parsed.level4Portals : DEFAULT_LAYER_SETTINGS.level4Portals,
      level5Portals: typeof parsed.level5Portals === 'boolean' ? parsed.level5Portals : DEFAULT_LAYER_SETTINGS.level5Portals,
      level6Portals: typeof parsed.level6Portals === 'boolean' ? parsed.level6Portals : DEFAULT_LAYER_SETTINGS.level6Portals,
      level7Portals: typeof parsed.level7Portals === 'boolean' ? parsed.level7Portals : DEFAULT_LAYER_SETTINGS.level7Portals,
      level8Portals: typeof parsed.level8Portals === 'boolean' ? parsed.level8Portals : DEFAULT_LAYER_SETTINGS.level8Portals,
      resistance: typeof parsed.resistance === 'boolean' ? parsed.resistance : DEFAULT_LAYER_SETTINGS.resistance,
      enlightened: typeof parsed.enlightened === 'boolean' ? parsed.enlightened : DEFAULT_LAYER_SETTINGS.enlightened,
      machina: typeof parsed.machina === 'boolean' ? parsed.machina : DEFAULT_LAYER_SETTINGS.machina,
      ornaments: typeof parsed.ornaments === 'boolean' ? parsed.ornaments : DEFAULT_LAYER_SETTINGS.ornaments,
      artifacts: typeof parsed.artifacts === 'boolean' ? parsed.artifacts : DEFAULT_LAYER_SETTINGS.artifacts,
      labels: typeof parsed.labels === 'boolean' ? parsed.labels : DEFAULT_LAYER_SETTINGS.labels,
      tiles: typeof parsed.tiles === 'boolean' ? parsed.tiles : DEFAULT_LAYER_SETTINGS.tiles,
      drawnLinks: typeof parsed.drawnLinks === 'boolean'
        ? parsed.drawnLinks
        : typeof legacyParsed.drawnItems === 'boolean'
          ? legacyParsed.drawnItems
          : DEFAULT_LAYER_SETTINGS.drawnLinks,
      drawnMarkers: typeof parsed.drawnMarkers === 'boolean'
        ? parsed.drawnMarkers
        : typeof legacyParsed.drawnItems === 'boolean'
          ? legacyParsed.drawnItems
          : DEFAULT_LAYER_SETTINGS.drawnMarkers,
      playerTracker: DEFAULT_LAYER_SETTINGS.playerTracker,
      playerTrackerResistance: typeof parsed.playerTrackerResistance === 'boolean'
        ? parsed.playerTrackerResistance
        : legacyPlayerTracker ?? DEFAULT_LAYER_SETTINGS.playerTrackerResistance,
      playerTrackerEnlightened: typeof parsed.playerTrackerEnlightened === 'boolean'
        ? parsed.playerTrackerEnlightened
        : legacyPlayerTracker ?? DEFAULT_LAYER_SETTINGS.playerTrackerEnlightened,
      playerTrackerMachina: typeof parsed.playerTrackerMachina === 'boolean'
        ? parsed.playerTrackerMachina
        : legacyPlayerTracker ?? DEFAULT_LAYER_SETTINGS.playerTrackerMachina,
      keyCount: storedKeyCount === true || storedKeyCount === 'on',
    };
  } catch {
    return DEFAULT_LAYER_SETTINGS;
  }
}

function legacyHighlighterFromLayerSettings(
  legacyLayerSettings?: LegacyStoredLayerSettings,
): IitcIrisPortalHighlighterId {
  if (legacyLayerSettings?.levelFill === true) return 'level-color';
  if (legacyLayerSettings?.healthFill === true) return 'needs-recharge';
  if (legacyLayerSettings?.historyCaptured === 'on') return 'history-captured';
  if (legacyLayerSettings?.historyVisited === 'on') return 'history-visited';
  if (legacyLayerSettings?.historyCaptured === 'invert') return 'history-not-captured';
  if (legacyLayerSettings?.historyVisited === 'invert') return 'history-not-visited';
  if (legacyLayerSettings?.historyScoutControlled === 'on') return 'history-scout-controlled';
  if (legacyLayerSettings?.historyScoutControlled === 'invert') return 'history-not-scout-controlled';
  return 'none';
}

function loadStoredHighlighterSettings(): IitcIrisHighlighterSettings {
  try {
    const value = window.localStorage.getItem(HIGHLIGHTER_SETTINGS_STORAGE_KEY);
    const legacyLayerValue = window.localStorage.getItem(LAYER_SETTINGS_STORAGE_KEY);
    const legacyParsed = legacyLayerValue ? JSON.parse(legacyLayerValue) as unknown : undefined;
    const legacyStoredLayerSettings = isLayerSettings(legacyParsed) ? legacyParsed as LegacyStoredLayerSettings : undefined;
    if (!value) return {active: legacyHighlighterFromLayerSettings(legacyStoredLayerSettings)};
    const parsed = JSON.parse(value) as Partial<IitcIrisHighlighterSettings>;
    return {active: normalizePortalHighlighterId(parsed.active)};
  } catch {
    return {active: legacyHighlighterFromLayerSettings()};
  }
}

function loadStoredDataSourceId(): typeof DATA_SOURCE_OPTIONS[number]['id'] {
  try {
    const value = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
    return DATA_SOURCE_OPTIONS.some((option) => option.id === value) ? value as typeof DATA_SOURCE_OPTIONS[number]['id'] : 'live';
  } catch {
    return 'live';
  }
}

function loadStoredLifecycleSettings(): IitcIrisLifecycleSettings {
  try {
    const value = window.localStorage.getItem(LIFECYCLE_SETTINGS_STORAGE_KEY);
    if (!value) return {iitcMovementDelay: false};
    const parsed = JSON.parse(value) as Partial<IitcIrisLifecycleSettings>;
    return {iitcMovementDelay: parsed.iitcMovementDelay === true};
  } catch {
    return {iitcMovementDelay: false};
  }
}

function storeLayerSettings(value: IitcIrisLayerSettings): void {
  try {
    window.localStorage.setItem(LAYER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Layer preferences are optional.
  }
}

function storeHighlighterSettings(value: IitcIrisHighlighterSettings): void {
  try {
    window.localStorage.setItem(HIGHLIGHTER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Highlighter preferences are optional.
  }
}

function storeDataSourceId(value: string): void {
  try {
    window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, value);
  } catch {
    // Data source preference is optional.
  }
}

function storeLifecycleSettings(value: IitcIrisLifecycleSettings): void {
  try {
    window.localStorage.setItem(LIFECYCLE_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Lifecycle diagnostics are optional.
  }
}

function loadStoredDebugDockVisible(): boolean {
  try {
    return window.localStorage.getItem(DEBUG_DOCK_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function storeDebugDockVisible(value: boolean): void {
  try {
    window.localStorage.setItem(DEBUG_DOCK_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Debug visibility is optional.
  }
}

function isSidePanelId(value: string | null): value is SidePanelId {
  return SIDE_PANEL_OPTIONS.some((option) => option.id === value);
}

function isSheetId(value: string | null): value is SheetId {
  return value === 'map' ||
    value === 'layers' ||
    value === 'view' ||
    value === 'drawLinks' ||
    value === 'drawMarkers' ||
    value === 'portalCounts' ||
    value === 'portalsList' ||
    value === 'scoreboard' ||
    value === 'search' ||
    value === 'portal' ||
    value === 'selectedLink' ||
    value === 'selectedField' ||
    value === 'system' ||
    value === 'help' ||
    isSidePanelId(value);
}

function isCommTab(value: string | null): value is IitcIrisCommTab {
  return value === 'all' || value === 'faction' || value === 'alerts';
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function getPrimaryMenuId(sheet: SheetId): PrimaryMenuId {
  if (sheet === 'portal' || sheet === 'selectedLink' || sheet === 'selectedField') return 'selected';
  if (sheet === 'agent' || sheet === 'inventory' || sheet === 'passcode') return 'agent';
  if (sheet === 'comm') return 'comm';
  if (sheet === 'system' || sheet === 'help') return 'system';
  return 'map';
}

function loadStoredCommTab(): IitcIrisCommTab {
  try {
    const value = window.localStorage.getItem(COMM_TAB_STORAGE_KEY);
    return isCommTab(value) ? value : 'all';
  } catch {
    return 'all';
  }
}

function storeCommTab(value: IitcIrisCommTab): void {
  try {
    window.localStorage.setItem(COMM_TAB_STORAGE_KEY, value);
  } catch {
    // COMM tab preference is optional.
  }
}

function loadStoredSidePanelId(): SidePanelId | null {
  try {
    const value = window.localStorage.getItem(SIDE_PANEL_STORAGE_KEY);
    return isSidePanelId(value) ? value : null;
  } catch {
    return null;
  }
}

function loadStoredActiveSheet(): SheetId {
  try {
    const value = window.localStorage.getItem(ACTIVE_SHEET_STORAGE_KEY);
    if (isSheetId(value)) return value;
    return loadStoredSidePanelId() ?? 'map';
  } catch {
    return loadStoredSidePanelId() ?? 'map';
  }
}

function storeActiveSheet(value: SheetId): void {
  try {
    window.localStorage.setItem(ACTIVE_SHEET_STORAGE_KEY, value);
  } catch {
    // Sheet preference is optional.
  }
}

function loadStoredPortalSections(): Record<PortalSectionId, boolean> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PORTAL_SECTION_STORAGE_KEY) ?? '{}') as Partial<Record<PortalSectionId, boolean>>;
    return {
      mods: typeof parsed.mods === 'boolean' ? parsed.mods : true,
      resonators: typeof parsed.resonators === 'boolean' ? parsed.resonators : true,
      facts: typeof parsed.facts === 'boolean' ? parsed.facts : false,
    };
  } catch {
    return {mods: true, resonators: true, facts: false};
  }
}

function storePortalSections(value: Record<PortalSectionId, boolean>): void {
  try {
    window.localStorage.setItem(PORTAL_SECTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Portal section state is optional.
  }
}

function loadStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function storeBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // Boolean preferences are optional.
  }
}

function storeSidePanelId(value: SidePanelId | null): void {
  try {
    if (value) {
      window.localStorage.setItem(SIDE_PANEL_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(SIDE_PANEL_STORAGE_KEY);
    }
  } catch {
    // Side panel preference is optional.
  }
}

function createDataSourceSettings(id: typeof DATA_SOURCE_OPTIONS[number]['id']): IitcIrisDataSourceSettings {
  const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id) ?? DATA_SOURCE_OPTIONS[0];
  if (option.mode === 'live') return {mode: 'live'};
  return {
    mode: 'fixture',
    id: option.id,
    label: option.label,
    url: getExtensionUrl(option.fixturePath),
  };
}

function entityFetchStateFromMessage(message: IitcIrisMessage, current: EntityFetchState): EntityFetchState {
  return {
    status: message.status ?? current.status,
    entitySource: message.entitySource ?? 'live',
    authRequired: message.authRequired ?? false,
    generation: current.generation,
    key: current.key,
    collision: current.collision,
    portals: message.portals ?? 0,
    realPortals: message.realPortals ?? 0,
    placeholderPortals: message.placeholderPortals ?? 0,
    ornamentPortals: message.ornamentPortals ?? 0,
    drawnOrnamentMarkers: message.drawnOrnamentMarkers ?? 0,
    hiddenOrnamentMarkers: message.hiddenOrnamentMarkers ?? 0,
    ornamentTypes: message.ornamentTypes ?? {},
    artifactPortals: message.artifactPortals ?? 0,
    drawnArtifactMarkers: message.drawnArtifactMarkers ?? 0,
    artifactTypes: message.artifactTypes ?? {},
    artifactFetchStatus: message.artifactFetchStatus ?? 'disabled',
    artifactFetchPortalCount: message.artifactFetchPortalCount ?? 0,
    artifactFetchTypes: message.artifactFetchTypes ?? [],
    artifactFetchElapsedMs: message.artifactFetchElapsedMs ?? null,
    artifactFetchError: message.artifactFetchError ?? '',
    levelLabels: message.levelLabels ?? 0,
    damagedPortals: message.damagedPortals ?? 0,
    links: message.links ?? 0,
    fields: message.fields ?? 0,
    viewportPortals: message.viewportPortals ?? 0,
    viewportRealPortals: message.viewportRealPortals ?? 0,
    viewportPlaceholderPortals: message.viewportPlaceholderPortals ?? 0,
    viewportLinks: message.viewportLinks ?? 0,
    viewportFields: message.viewportFields ?? 0,
    viewportOrnamentPortals: message.viewportOrnamentPortals ?? 0,
    viewportOrnamentMarkers: message.viewportOrnamentMarkers ?? 0,
    viewportArtifactPortals: message.viewportArtifactPortals ?? 0,
    viewportArtifactMarkers: message.viewportArtifactMarkers ?? 0,
    requestedTiles: message.requestedTiles ?? 0,
    returnedTiles: message.returnedTiles ?? 0,
    nonEmptyTiles: message.nonEmptyTiles ?? 0,
    elapsedMs: message.elapsedMs ?? null,
    firstRenderElapsedMs: message.firstRenderElapsedMs ?? current.firstRenderElapsedMs,
    retryRequests: message.retryRequests ?? 0,
    retriedTileKeys: message.retriedTileKeys ?? [],
    recoveredTileKeys: message.recoveredTileKeys ?? [],
    emptyTileKeys: message.emptyTileKeys ?? [],
    nonEmptyTileKeys: message.nonEmptyTileKeys ?? [],
    unaccountedTileKeys: message.unaccountedTileKeys ?? [],
    serverRetryTileKeys: message.serverRetryTileKeys ?? [],
    timeoutTileKeys: message.timeoutTileKeys ?? [],
    errorTileKeys: message.errorTileKeys ?? [],
    responseRetryTileKeys: message.responseRetryTileKeys ?? [],
    queueDelayReasons: message.queueDelayReasons ?? [],
    partialTileKeys: message.partialTileKeys ?? [],
    cacheFreshTileKeys: message.cacheFreshTileKeys ?? [],
    cacheStaleTileKeys: message.cacheStaleTileKeys ?? [],
    staleGenerationCacheWarmTileKeys: message.staleGenerationCacheWarmTileKeys ?? current.staleGenerationCacheWarmTileKeys,
    queue: message.queue ?? null,
    renderQueue: message.renderQueue ?? null,
    renderMutation: message.renderMutation ?? null,
    timing: message.timing ?? null,
    playerTracker: message.playerTracker ?? current.playerTracker,
    baseLayerId: message.baseLayerId ?? current.baseLayerId,
    dataSource: message.dataSource ?? current.dataSource,
    highlighterSettings: message.highlighterSettings ?? current.highlighterSettings,
    highlighterIds: message.highlighterIds ?? current.highlighterIds,
    renderPolicy: message.renderPolicy ?? current.renderPolicy,
    selectedPortal: message.selectedPortal === undefined ? current.selectedPortal : message.selectedPortal,
    portalDetails: message.portalDetails === undefined ? current.portalDetails : message.portalDetails,
    portalAnalysis: message.portalAnalysis === undefined ? current.portalAnalysis : message.portalAnalysis,
  };
}

function injectScript(src: string): void {
  if (document.querySelector(`script[data-iitc-iris-src="${CSS.escape(src)}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.dataset.iitcIrisSrc = src;
  (document.head || document.documentElement).appendChild(script);
}

function createPlan(camera: CameraState): IitcMapDataPlan | null {
  if (!camera.bounds) return null;

  try {
    return createIitcMapDataPlan(camera.bounds, {lat: camera.lat, lng: camera.lng}, camera.zoom, {
      boundsPaddingRatio: REQUEST_BOUNDS_PADDING_RATIO,
    });
  } catch (error) {
    console.warn('[IITC IRIS] Failed to create map data plan', error);
    return null;
  }
}

function createIntelUrl(camera: CameraState): string {
  const lat = camera.lat.toFixed(6);
  const lng = camera.lng.toFixed(6);
  const zoom = String(Math.round(camera.zoom * 100) / 100);
  return `https://intel.ingress.com/intel?ll=${lat},${lng}&z=${zoom}`;
}

function formatLinkLength(meters: number): string {
  return meters > 1000 ? `${meters / 1000}km` : `${meters}m`;
}

function formatElapsedSeconds(milliseconds: number): string {
  return (Math.round(milliseconds / 100) / 10).toFixed(1);
}

function formatMissionRating(ratingE6: number | undefined): string {
  if (ratingE6 === undefined) return '-';
  return `${Math.round(ratingE6 / 10_000)}%`;
}

function formatMissionDuration(milliseconds: number | undefined, label: string | undefined): string {
  if (label) return label;
  if (milliseconds === undefined || milliseconds <= 0) return '-';
  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function formatDistance(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters) || meters <= 0) return '-';
  return meters > 1000 ? `${Math.round(meters / 100) / 10}km` : `${Math.round(meters * 10) / 10}m`;
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatPercent(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : `${Math.round(value)}%`;
}

function formatScoreLead(enlightened: number | undefined, resistance: number | undefined): string {
  if (enlightened === undefined || resistance === undefined) return '-';
  if (enlightened === resistance) return 'tied';
  const leader = enlightened > resistance ? 'ENL' : 'RES';
  return `${leader} +${formatInteger(Math.abs(enlightened - resistance))}`;
}

function formatSelectedPortal(portal: IitcIrisSelectedPortal | null): string {
  if (!portal) return 'none';
  const label = portal.title || portal.guid.slice(0, 8);
  const level = portal.isPlaceholder || portal.level === undefined ? 'P' : `L${portal.level}`;
  return `${label} ${portal.team}${level}`;
}

function formatPortalHealth(portal: IitcIrisSelectedPortal): string {
  if (portal.isPlaceholder || portal.health === undefined) return '-';
  return `${Math.round(portal.health)}%`;
}

function formatPortalHealthPercent(portal: IitcIrisSelectedPortal): number {
  if (portal.isPlaceholder || portal.health === undefined || !Number.isFinite(portal.health)) return 0;
  return Math.max(0, Math.min(100, Math.round(portal.health)));
}

function getPortalLatLng(portal: IitcIrisSelectedPortal): {lat: number; lng: number} {
  return {
    lat: portal.latE6 / 1_000_000,
    lng: portal.lngE6 / 1_000_000,
  };
}

function formatTeamLabel(team: string): string {
  if (team === 'E') return 'Enlightened';
  if (team === 'R') return 'Resistance';
  if (team === 'M') return 'Machina';
  if (team === 'N') return 'Neutral';
  return team || 'Unknown';
}

function formatTeamShortLabel(team: IitcPortalAnalysisTeam): string {
  if (team === 'E') return 'ENL';
  if (team === 'R') return 'RES';
  if (team === 'M') return 'MAC';
  return 'NEU';
}

function formatTeamClass(team: string): string {
  if (team === 'E') return 'iitc-iris-team-enl';
  if (team === 'R') return 'iitc-iris-team-res';
  if (team === 'M') return 'iitc-iris-team-machina';
  return 'iitc-iris-team-neutral';
}

function getTeamColor(team: IitcPortalAnalysisTeam): string {
  return IITC_TEAM_COLORS[team];
}

function getPortalCountsLevelColor(level: number): string {
  if (level === 0) return '#000000';
  return getIitcLevelColor(level) ?? '#9aa8b4';
}

function formatPortalAnalysisValue(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${formatInteger(value)}${suffix}`;
}

function formatPortalHistory(entry: IitcPortalsListEntry): string {
  if (entry.history.captured) return 'C';
  if (entry.history.visited) return 'V';
  return '-';
}

function formatScoutControlled(entry: IitcPortalsListEntry): string {
  return entry.history.scoutControlled ? 'S' : '-';
}

function formatPortalMission(entry: IitcPortalsListEntry): string {
  return entry.mission ? 'M' : '-';
}

function getPortalsListSortValue(entry: IitcPortalsListEntry, field: PortalsListSortField): string | number {
  if (field === 'title') return entry.title.toLowerCase();
  if (field === 'level') return entry.level;
  if (field === 'team') return entry.team;
  if (field === 'health') return entry.health ?? -1;
  if (field === 'resCount') return entry.resCount;
  if (field === 'links') return entry.links.count;
  if (field === 'fields') return entry.fields;
  if (field === 'enemyAp') return entry.ap.enemyAp;
  return entry.keyCount ?? 0;
}

function filterPortalsList(
  entries: IitcPortalsListEntry[],
  teamFilter: PortalsListTeamFilter,
  levelFilter: PortalsListLevelFilter,
  textFilter: string,
): IitcPortalsListEntry[] {
  const normalizedTextFilter = textFilter.trim().toLowerCase();
  return entries.filter((entry) => {
    if (teamFilter !== 'all' && entry.team !== teamFilter) return false;
    if (levelFilter !== 'all' && entry.level !== Number(levelFilter)) return false;
    return normalizedTextFilter.length === 0 || entry.title.toLowerCase().includes(normalizedTextFilter);
  });
}

function sortPortalsList(entries: IitcPortalsListEntry[], sortBy: PortalsListSortField, sortOrder: SortOrder): IitcPortalsListEntry[] {
  return [...entries].sort((a, b) => {
    const aValue = getPortalsListSortValue(a, sortBy);
    const bValue = getPortalsListSortValue(b, sortBy);
    if (aValue < bValue) return -sortOrder;
    if (aValue > bValue) return sortOrder;
    return a.title.localeCompare(b.title) || a.guid.localeCompare(b.guid);
  });
}

function summarizePortalsList(entries: IitcPortalsListEntry[]): PortalAnalysisListSummary {
  return entries.reduce<PortalAnalysisListSummary>((summary, entry) => {
    summary.portals += 1;
    summary.links += entry.links.count;
    summary.fields += entry.fields;
    summary.enemyAp += entry.ap.enemyAp;
    summary.keys += entry.keyCount ?? 0;
    summary.teams[entry.team] += 1;
    if (entry.history.visited) summary.history.visited += 1;
    if (entry.history.captured) summary.history.captured += 1;
    if (entry.history.scoutControlled) summary.history.scoutControlled += 1;
    return summary;
  }, {
    portals: 0,
    links: 0,
    fields: 0,
    enemyAp: 0,
    keys: 0,
    teams: {E: 0, R: 0, M: 0, N: 0},
    history: {
      visited: 0,
      captured: 0,
      scoutControlled: 0,
    },
  });
}

function formatPortalAnalysisPercent(value: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function getPortalCountsBarSegments(levels: number[], chartHeight: number): PortalCountsBarSegment[] {
  const total = levels.reduce((sum, count) => sum + count, 0);
  let y = chartHeight;
  return levels.flatMap((count, level) => {
    if (count <= 0 || total <= 0) return [];
    const height = Math.max(1, (count / total) * chartHeight);
    y -= height;
    return [{level, y, height}];
  }).reverse();
}

function getPortalCountsBars(levels: {count: number; teams: Record<IitcPortalAnalysisTeam, number>}[]): PortalCountsBar[] {
  const allLevels = levels.map((level) => level.count);
  return [
    {id: 'all', label: 'All', color: '#ffffff', levels: allLevels, segments: getPortalCountsBarSegments(allLevels, PORTAL_COUNTS_BAR_HEIGHT)},
    ...PORTAL_ANALYSIS_PLAYER_TEAMS.map((team) => {
      const teamLevels = levels.map((level) => level.teams[team]);
      return {
        id: team,
        label: formatTeamShortLabel(team),
        color: getTeamColor(team),
        levels: teamLevels,
        segments: getPortalCountsBarSegments(teamLevels, PORTAL_COUNTS_BAR_HEIGHT),
      };
    }),
  ];
}

function getPortalCountsPieSegments(teams: Record<IitcPortalAnalysisTeam, number>, total: number): PortalCountsPieSegment[] {
  let start = 0;
  return PORTAL_ANALYSIS_PIE_TEAMS.flatMap((team) => {
    const count = teams[team];
    if (count <= 0 || total <= 0) return [];
    const end = start + count / total;
    const labelAngle = 0.5 - (start + end) / 2;
    const segment = {
      team,
      start,
      end,
      path: createPortalCountsPiePath(start, end, PORTAL_COUNTS_RADIUS_INNER),
      label: `${Math.round((end - start) * 100)}%`,
      labelX: Math.sin(labelAngle * 2 * Math.PI) * PORTAL_COUNTS_RADIUS_INNER / 1.5,
      labelY: Math.cos(labelAngle * 2 * Math.PI) * PORTAL_COUNTS_RADIUS_INNER / 1.5,
    };
    start = end;
    return [segment];
  });
}

function getPortalCountsLevelRingSegments(
  levels: PortalCountsPieSegment[],
  portalCountsLevels: {teams: Record<IitcPortalAnalysisTeam, number>}[],
  total: number,
): PortalCountsLevelRingSegment[] {
  return levels.flatMap((teamSegment) => {
    let start = teamSegment.start;
    return portalCountsLevels.flatMap((levelData, level) => {
      const count = levelData.teams[teamSegment.team];
      if (count <= 0 || total <= 0) return [];
      const end = start + count / total;
      const segment = {
        team: teamSegment.team,
        level,
        path: createPortalCountsRingPath(start, end, PORTAL_COUNTS_RADIUS_OUTER, PORTAL_COUNTS_RADIUS_INNER),
      };
      start = end;
      return [segment];
    });
  });
}

function createPortalCountsPiePath(startFraction: number, endFraction: number, radius: number): string {
  if (startFraction === endFraction) return '';
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  const startAngle = 0.5 - startFraction;
  const endAngle = 0.5 - endFraction;
  const p1x = Math.sin(startAngle * 2 * Math.PI) * radius;
  const p1y = Math.cos(startAngle * 2 * Math.PI) * radius;
  let p2x = Math.sin(endAngle * 2 * Math.PI) * radius;
  const p2y = Math.cos(endAngle * 2 * Math.PI) * radius;
  if (startAngle === 0.5 && endAngle === -0.5) p2x -= 1e-5;
  return `M ${p1x},${p1y} A ${radius},${radius} 0 ${largeArc} 1 ${p2x},${p2y} L 0,0 Z`;
}

function createPortalCountsRingPath(startFraction: number, endFraction: number, outerRadius: number, innerRadius: number): string {
  if (startFraction === endFraction) return '';
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  const startAngle = 0.5 - startFraction;
  const endAngle = 0.5 - endFraction;
  const p1x = Math.sin(startAngle * 2 * Math.PI) * outerRadius;
  const p1y = Math.cos(startAngle * 2 * Math.PI) * outerRadius;
  let p2x = Math.sin(endAngle * 2 * Math.PI) * outerRadius;
  const p2y = Math.cos(endAngle * 2 * Math.PI) * outerRadius;
  let p3x = Math.sin(endAngle * 2 * Math.PI) * innerRadius;
  const p3y = Math.cos(endAngle * 2 * Math.PI) * innerRadius;
  const p4x = Math.sin(startAngle * 2 * Math.PI) * innerRadius;
  const p4y = Math.cos(startAngle * 2 * Math.PI) * innerRadius;
  if (startAngle === 0.5 && endAngle === -0.5) {
    p2x -= 1e-5;
    p3x -= 1e-5;
  }
  return `M ${p1x},${p1y} A ${outerRadius},${outerRadius} 0 ${largeArc} 1 ${p2x},${p2y} L ${p3x},${p3y} A ${innerRadius},${innerRadius} 0 ${largeArc} 0 ${p4x},${p4y} Z`;
}

function getScoreboardTeamLabel(team: 'E' | 'R' | 'M'): string {
  if (team === 'E') return 'Enlightened';
  if (team === 'R') return 'Resistance';
  return 'Machina';
}

function formatScoreboardAverage(value: number | null): string {
  return value === null ? '-' : value.toFixed(1);
}

function formatScoreboardTotal(team: IitcScoreboardTeam): string {
  return team.placeholders > 0 ? `${formatInteger(team.total)} + ${formatInteger(team.placeholders)}` : formatInteger(team.total);
}

const SCOREBOARD_ROWS: {label: string; format: (team: IitcScoreboardTeam) => string}[] = [
  {label: 'Portals', format: (team): string => formatScoreboardTotal(team)},
  {label: 'avg Level', format: (team): string => formatScoreboardAverage(team.avgLevel)},
  {label: 'avg Health', format: (team): string => formatScoreboardAverage(team.avgHealth)},
  {label: 'Level 8', format: (team): string => formatPortalAnalysisValue(team.level8)},
  {label: 'Max Level', format: (team): string => formatPortalAnalysisValue(team.maxLevel)},
  {label: 'Links', format: (team): string => formatPortalAnalysisValue(team.links)},
  {label: 'Fields', format: (team): string => formatPortalAnalysisValue(team.fields)},
];

function formatMapObjectDistance(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters)) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
  return `${Math.round(meters)} m`;
}

function formatResonatorEnergy(energy: number): string {
  return energy >= 1000 ? `${Math.round(energy / 100) / 10}k` : String(energy);
}

function formatResonatorEnergyPercent(level: number, energy: number): number {
  const normalizedLevel = Math.max(0, Math.min(8, Math.floor(level)));
  const maxEnergy = IITC_RESONATOR_ENERGY[normalizedLevel] ?? 1000;
  return Math.max(0, Math.min(100, Math.round((energy / maxEnergy) * 100)));
}

function formatModName(name: string): string {
  return name.replace(/^Portal\s+/i, '').replace(/_/g, ' ');
}

function formatModStats(stats: Record<string, string | number>): string {
  const preferredStats = ['MITIGATION', 'REMOVAL_STICKINESS', 'FORCE_AMPLIFIER', 'LINK_RANGE_MULTIPLIER', 'HACK_SPEED', 'HIT_BONUS', 'ATTACK_FREQUENCY'];
  const parts: string[] = [];
  for (const key of preferredStats) {
    const value = stats[key];
    if (value !== undefined) parts.push(`${key.toLowerCase().replace(/_/g, ' ')} ${value}`);
  }
  return parts.slice(0, 2).join(', ');
}

function formatItemBadge(item: {level?: number; rarity?: string; type?: string}): string {
  if (item.level !== undefined) return `L${item.level}`;
  if (item.rarity === 'VERY_RARE') return 'VR';
  if (item.rarity === 'RARE') return 'R';
  if (item.rarity === 'COMMON') return 'C';
  if (item.type?.includes('CAPSULE')) return 'CAP';
  return 'IT';
}

function formatCommActor(message: IitcIrisCommMessage): string {
  return message.player || message.players[0] || (message.auto ? 'system' : 'unknown');
}

function normalizeCommText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^\s*[,.:;-]\s*/, '').trimStart();
}

function getCommDisplayParts(message: IitcIrisCommMessage): IitcIrisCommMessage['parts'] {
  const actor = formatCommActor(message).replace(/^@/, '').toLowerCase();
  return message.parts.filter((part) => {
    if (part.type !== 'player') return true;
    return part.text.replace(/^@/, '').toLowerCase() !== actor;
  }).map((part, index) => part.type === 'text' && index === 0 ? {...part, text: normalizeCommText(part.text)} : part)
    .filter((part) => part.type !== 'text' || part.text.length > 0);
}

function formatCommContextTitle(message: IitcIrisCommMessage): string {
  const context = [
    ...message.players.map((player) => `player: ${player}`),
    ...message.portals.map((portal) => `portal: ${portal.name || portal.address || 'portal'}`),
  ];
  return context.length > 0 ? context.join('\n') : message.text || message.type;
}

function formatCommTime(time: number): string {
  if (!Number.isFinite(time)) return '-';
  return new Date(time).toLocaleTimeString();
}

function formatCommBounds(bounds: IitcIrisCommState['bounds']): string {
  return bounds ? `${bounds.minLatE6},${bounds.minLngE6} to ${bounds.maxLatE6},${bounds.maxLngE6}` : '-';
}

function formatRenderMutationSummary(mutation: IitcIrisRenderMutationDiagnostics | null): string {
  if (!mutation) return 'render -';
  const portals = mutation.portals;
  return `${mutation.mode === 'incremental' ? 'inc' : 'full'} p +${portals.added}/-${portals.removed}/~${portals.unchanged}/r${portals.replaced}`;
}

function getCommTeamClass(team?: string): string {
  if (team === 'E') return 'is-enlightened';
  if (team === 'R') return 'is-resistance';
  if (team === 'M') return 'is-machina';
  return '';
}

function createInnerStatusView(plan: IitcMapDataPlan | null, entityFetch: EntityFetchState, requests: IitcIrisRequestDiagnostics): InnerStatusView {
  const portalText = plan?.tileParams.hasPortals
    ? 'portals'
    : `links: ${plan && plan.tileParams.minLinkLength > 0 ? `>${formatLinkLength(plan.tileParams.minLinkLength)}` : 'all links'}`;
  const loading = entityFetch.requestedTiles > 0 && entityFetch.returnedTiles < entityFetch.requestedTiles;
  const activeRequests = requests.activeRequests || entityFetch.queue?.activeRequests || (loading ? 1 : 0);
  const failedRequests = entityFetch.queue?.failedTiles ?? entityFetch.errorTileKeys.length;
  const progressPercent = loading ? Math.floor((entityFetch.returnedTiles / entityFetch.requestedTiles) * 100) : null;

  let mapText = entityFetch.status;
  if (entityFetch.authRequired) {
    mapText = 'login';
  } else if (loading) {
    mapText = 'loading';
  } else if (entityFetch.status === 'entities ready') {
    mapText = failedRequests > 0 ? 'errors' : 'done';
  }

  const cachedTiles = entityFetch.entitySource === 'cache' ? entityFetch.returnedTiles : 0;
  const loadedTiles = entityFetch.entitySource === 'cache' ? 0 : entityFetch.returnedTiles;
  const remainingTiles = Math.max(0, entityFetch.requestedTiles - entityFetch.returnedTiles);
  const retryText = entityFetch.retryRequests > 0 ? `, ${entityFetch.retryRequests} retried` : '';
  const partialText = entityFetch.queue?.partialTiles ? `, ${entityFetch.queue.partialTiles} partial` : '';
  const sourceText = entityFetch.entitySource === 'idle' ? '' : `, source ${entityFetch.entitySource}`;
  const finalTimeText = !loading && entityFetch.elapsedMs !== null ? `, in ${formatElapsedSeconds(entityFetch.elapsedMs)} seconds` : '';
  const tileProgressText = !loading && entityFetch.elapsedMs !== null
    ? `Tiles: ${cachedTiles} cached, ${loadedTiles} loaded${retryText}${partialText}${finalTimeText}${sourceText}`
    : `Tiles: ${cachedTiles} cached, ${loadedTiles} loaded, ${remainingTiles} remaining${retryText}${sourceText}`;
  const mapTitle = entityFetch.requestedTiles > 0
    ? tileProgressText
    : `${entityFetch.status}${sourceText}`;

  return {
    portalText,
    mapText,
    mapTitle,
    progressPercent,
    activeRequests,
    failedRequests,
  };
}

function App(): h.JSX.Element {
  const [status, setStatus] = useState('booting');
  const [copyStatus, setCopyStatus] = useState('');
  const [scenarioStatus, setScenarioStatus] = useState('');
  const [scenarioRuns, setScenarioRuns] = useState<ScenarioRun[]>([]);
  const [activeScenarioRunId, setActiveScenarioRunId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchState, setSearchState] = useState<IitcIrisSearchState>(EMPTY_SEARCH_STATE);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);
  const [portalImageOpen, setPortalImageOpen] = useState(false);
  const [portalSections, setPortalSections] = useState<Record<PortalSectionId, boolean>>(() => loadStoredPortalSections());
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => loadStoredBoolean(SHORTCUTS_ENABLED_STORAGE_KEY, true));
  const [mapFocusMode, setMapFocusMode] = useState(() => loadStoredBoolean(MAP_FOCUS_MODE_STORAGE_KEY, false));
  const [commUserAtBottom, setCommUserAtBottom] = useState(true);
  const [commNewBelow, setCommNewBelow] = useState(false);
  const [viewInput, setViewInput] = useState('');
  const [viewInputStatus, setViewInputStatus] = useState('');
  const [geolocationStatus, setGeolocationStatus] = useState('');
  const [mapContext, setMapContext] = useState<MapContextSelection | null>(null);
  const [drawToolsLinkStart, setDrawToolsLinkStart] = useState<IitcIrisDrawToolsLatLng | null>(null);
  const [drawToolsItems, setDrawToolsItems] = useState<IitcIrisDrawToolsItem[]>([]);
  const [drawToolsImportText, setDrawToolsImportText] = useState('');
  const [drawToolsImportMerge, setDrawToolsImportMerge] = useState(true);
  const [drawToolsImportStatus, setDrawToolsImportStatus] = useState('');
  const [drawToolsClearConfirm, setDrawToolsClearConfirm] = useState<'polyline' | 'marker' | null>(null);
  const [debugDockVisible, setDebugDockVisible] = useState(() => loadStoredDebugDockVisible());
  const [activeSheet, setActiveSheet] = useState<SheetId>(() => loadStoredActiveSheet());
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanelId | null>(() => {
    const sheet = loadStoredActiveSheet();
    return isSidePanelId(sheet) ? sheet : null;
  });
  const [agentState, setAgentState] = useState<IitcIrisAgentState>(() => ({status: 'idle'}));
  const [commState, setCommState] = useState<IitcIrisCommState>(() => ({status: 'idle', tab: loadStoredCommTab(), messages: 0}));
  const [scoresState, setScoresState] = useState<IitcIrisScoresState>(() => ({status: 'idle', requestState: 'idle', region: {status: 'idle'}}));
  const [missionsState, setMissionsState] = useState<IitcIrisMissionsState>(() => EMPTY_MISSIONS_STATE);
  const [passcodeState, setPasscodeState] = useState<IitcIrisPasscodeState>(() => ({status: 'idle', requestState: 'idle'}));
  const [requestDiagnostics, setRequestDiagnostics] = useState<IitcIrisRequestDiagnostics>(EMPTY_REQUEST_DIAGNOSTICS);
  const [inventoryState, setInventoryState] = useState<IitcIrisInventoryState>(() => ({
    status: 'idle',
    requestState: 'idle',
    subscription: {status: 'unknown'},
    items: 0,
    keys: 0,
    portalsWithKeys: 0,
    capsules: 0,
    portalKeysForSelectedPortal: null,
  }));
  const [commDraft, setCommDraft] = useState('');
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const commListRef = useRef<HTMLDivElement | null>(null);
  const commOlderScrollHeightRef = useRef<number | null>(null);
  const commOlderRequestPendingRef = useRef(false);
  const commStickToBottomRef = useRef(true);
  const commLatestTimestampRef = useRef<number | undefined>(undefined);
  const layerSettingsIntentAtRef = useRef<number | undefined>(undefined);
  const highlighterSettingsIntentAtRef = useRef<number | undefined>(undefined);
  const [baseLayerId, setBaseLayerId] = useState<IitcIrisBaseLayerId>(() => loadStoredBaseLayerId());
  const [dataSourceId, setDataSourceId] = useState<typeof DATA_SOURCE_OPTIONS[number]['id']>(() => loadStoredDataSourceId());
  const [lifecycleSettings, setLifecycleSettings] = useState<IitcIrisLifecycleSettings>(() => loadStoredLifecycleSettings());
  const [layerSettings, setLayerSettings] = useState<IitcIrisLayerSettings>(() => loadStoredLayerSettings());
  const [highlighterSettings, setHighlighterSettings] = useState<IitcIrisHighlighterSettings>(() => loadStoredHighlighterSettings());
  const [camera, setCamera] = useState<CameraState>(() => ({
    ...loadInitialMapView(),
    bounds: null,
  }));
  const [entityFetch, setEntityFetch] = useState<EntityFetchState>({
    status: 'idle',
    entitySource: 'idle',
    authRequired: false,
    generation: 0,
    key: '',
    collision: false,
    portals: 0,
    realPortals: 0,
    placeholderPortals: 0,
    ornamentPortals: 0,
    drawnOrnamentMarkers: 0,
    hiddenOrnamentMarkers: 0,
    ornamentTypes: {},
    artifactPortals: 0,
    drawnArtifactMarkers: 0,
    artifactTypes: {},
    artifactFetchStatus: 'disabled',
    artifactFetchPortalCount: 0,
    artifactFetchTypes: [],
    artifactFetchElapsedMs: null,
    artifactFetchError: '',
    levelLabels: 0,
    damagedPortals: 0,
    links: 0,
    fields: 0,
    viewportPortals: 0,
    viewportRealPortals: 0,
    viewportPlaceholderPortals: 0,
    viewportLinks: 0,
    viewportFields: 0,
    viewportOrnamentPortals: 0,
    viewportOrnamentMarkers: 0,
    viewportArtifactPortals: 0,
    viewportArtifactMarkers: 0,
    requestedTiles: 0,
    returnedTiles: 0,
    nonEmptyTiles: 0,
    elapsedMs: null,
    firstRenderElapsedMs: null,
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
    renderMutation: null,
    timing: null,
    playerTracker: null,
    baseLayerId: loadStoredBaseLayerId(),
    dataSource: createDataSourceSettings(loadStoredDataSourceId()),
    highlighterSettings: {active: 'none'},
    highlighterIds: PORTAL_HIGHLIGHTER_OPTIONS.map((option) => option.id),
    renderPolicy: DEFAULT_RENDER_POLICY,
    selectedPortal: null,
    portalDetails: null,
    portalAnalysis: null,
  });
  const [portalsListSortBy, setPortalsListSortBy] = useState<PortalsListSortField>('level');
  const [portalsListSortOrder, setPortalsListSortOrder] = useState<SortOrder>(-1);
  const [portalsListTeamFilter, setPortalsListTeamFilter] = useState<PortalsListTeamFilter>('all');
  const [portalsListLevelFilter, setPortalsListLevelFilter] = useState<PortalsListLevelFilter>('all');
  const [portalsListTextFilter, setPortalsListTextFilter] = useState('');
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);
  const summaryMode = plan?.tileParams.hasPortals ? 'summary' : 'placeholder';
  const requestBatches = plan ? plan.requestBatches.map((batch) => batch.length) : [];
  const intelUrl = createIntelUrl(camera);
  const dataSource = useMemo(() => createDataSourceSettings(dataSourceId), [dataSourceId]);
  const innerStatus = createInnerStatusView(plan, entityFetch, requestDiagnostics);
  const portalAnalysis = entityFetch.portalAnalysis;
  const filteredPortalsList = useMemo(
    () => filterPortalsList(portalAnalysis?.portalslist ?? [], portalsListTeamFilter, portalsListLevelFilter, portalsListTextFilter),
    [portalAnalysis?.portalslist, portalsListTeamFilter, portalsListLevelFilter, portalsListTextFilter],
  );
  const sortedPortalsList = useMemo(
    () => sortPortalsList(filteredPortalsList, portalsListSortBy, portalsListSortOrder),
    [filteredPortalsList, portalsListSortBy, portalsListSortOrder],
  );
  const portalsListSummary = useMemo(() => summarizePortalsList(filteredPortalsList), [filteredPortalsList]);
  const portalCountsBars = useMemo(() => getPortalCountsBars(portalAnalysis?.portalcounts.levels ?? []), [portalAnalysis?.portalcounts.levels]);
  const portalCountsPieSegments = useMemo(
    () => getPortalCountsPieSegments(portalAnalysis?.portalcounts.teams ?? {E: 0, R: 0, M: 0, N: 0}, portalAnalysis?.portalcounts.total ?? 0),
    [portalAnalysis?.portalcounts.teams, portalAnalysis?.portalcounts.total],
  );
  const portalCountsLevelRingSegments = useMemo(
    () => getPortalCountsLevelRingSegments(portalCountsPieSegments, portalAnalysis?.portalcounts.levels ?? [], portalAnalysis?.portalcounts.total ?? 0),
    [portalAnalysis?.portalcounts.levels, portalAnalysis?.portalcounts.total, portalCountsPieSegments],
  );
  const sortPortalsListBy = (field: PortalsListSortField): void => {
    if (portalsListSortBy === field) {
      setPortalsListSortOrder((current) => current === 1 ? -1 : 1);
      return;
    }
    setPortalsListSortBy(field);
    setPortalsListSortOrder(field === 'title' || field === 'team' ? 1 : -1);
  };
  const detailOverlaysActive = entityFetch.renderPolicy.activeHighlighter !== 'none' ||
    entityFetch.renderPolicy.levelFill ||
    entityFetch.renderPolicy.healthFill ||
    entityFetch.renderPolicy.ornaments ||
    entityFetch.renderPolicy.artifacts ||
    entityFetch.renderPolicy.labels;
  const selectedPortalDetails = entityFetch.selectedPortal && entityFetch.portalDetails?.guid === entityFetch.selectedPortal.guid
    ? entityFetch.portalDetails
    : null;
  const selectedPortalDetailsStatus = selectedPortalDetails?.status ?? 'waiting';
  const selectedPortalMissionState = entityFetch.selectedPortal &&
    missionsState.source === 'portal' &&
    missionsState.portalGuid === entityFetch.selectedPortal.guid
    ? missionsState
    : null;
  const selectedPortalHasMissions = Boolean(
    entityFetch.selectedPortal?.mission ||
    entityFetch.selectedPortal?.mission50plus ||
    selectedPortalDetails?.hasMissionsStartingHere ||
    selectedPortalMissionState,
  );
  const selectedPortalMissionSummary = selectedPortalMissionState
    ? selectedPortalMissionState.status === 'loading'
      ? 'Loading'
      : selectedPortalMissionState.status === 'empty'
        ? '0 starting here'
        : selectedPortalMissionState.status === 'ready'
          ? `${formatInteger(selectedPortalMissionState.missions.length)} starting here`
          : selectedPortalMissionState.status
    : entityFetch.selectedPortal?.mission50plus
      ? '50+ starting here'
      : selectedPortalHasMissions
        ? 'Starting here'
        : '';
  const selectedMapObject = mapContext?.target === 'link' || mapContext?.target === 'field' ? mapContext : null;
  const hasSelectedObject = Boolean(entityFetch.selectedPortal || selectedMapObject);
  const selectedPrimaryLabel = selectedMapObject?.target === 'link'
    ? 'Link'
    : selectedMapObject?.target === 'field'
      ? 'Field'
      : entityFetch.selectedPortal
        ? 'Portal'
        : 'Selected';
  const activeSelectedSheet: SheetId = selectedMapObject?.target === 'link'
    ? 'selectedLink'
    : selectedMapObject?.target === 'field'
      ? 'selectedField'
      : entityFetch.selectedPortal
        ? 'portal'
        : 'map';
  const selectedKind = selectedMapObject?.target ?? (entityFetch.selectedPortal ? 'portal' : null);
  const showPortalSidePanel = Boolean(entityFetch.selectedPortal && !(selectedMapObject && (activeSheet === 'selectedLink' || activeSheet === 'selectedField')));
  const dockDiagnostics = {
    app: 'IITC IRIS',
    status,
    intelUrl,
    camera: {
      lat: camera.lat,
      lng: camera.lng,
      zoom: camera.zoom,
      bounds: camera.bounds,
    },
    plan: plan ? {
      dataZoom: plan.dataZoom,
      mode: summaryMode,
      tiles: plan.tiles.length,
      xRange: plan.xRange,
      yRange: plan.yRange,
      firstBatchSize: requestBatches[0] ?? 0,
      requestBatches,
      requestPolicy: {
        name: 'iitc-refill-queue',
        maxRequests: IITC_MAX_REQUESTS,
        maxTilesPerRequest: IITC_NUM_TILES_PER_REQUEST,
        adaptiveRequestBatches: true,
        sequentialRequestBatches: false,
        timeoutRetryLimit: IITC_MAX_TILE_RETRIES,
      },
      dataBounds: plan.dataBounds,
    } : null,
    entities: {
      status: entityFetch.status,
      source: entityFetch.entitySource,
      complete: entityFetch.status === 'entities ready',
      portals: entityFetch.portals,
      realPortals: entityFetch.realPortals,
      placeholderPortals: entityFetch.placeholderPortals,
      ornamentPortals: entityFetch.ornamentPortals,
      drawnOrnamentMarkers: entityFetch.drawnOrnamentMarkers,
      hiddenOrnamentMarkers: entityFetch.hiddenOrnamentMarkers,
      ornamentTypes: entityFetch.ornamentTypes,
      artifactPortals: entityFetch.artifactPortals,
      drawnArtifactMarkers: entityFetch.drawnArtifactMarkers,
      artifactTypes: entityFetch.artifactTypes,
      artifactFetch: {
        status: entityFetch.artifactFetchStatus,
        portalCount: entityFetch.artifactFetchPortalCount,
        types: entityFetch.artifactFetchTypes,
        elapsedMs: entityFetch.artifactFetchElapsedMs,
        elapsedSeconds: entityFetch.artifactFetchElapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.artifactFetchElapsedMs)),
        error: entityFetch.artifactFetchError || undefined,
      },
      levelLabels: entityFetch.levelLabels,
      damagedPortals: entityFetch.damagedPortals,
      links: entityFetch.links,
      fields: entityFetch.fields,
      viewport: {
        portals: entityFetch.viewportPortals,
        realPortals: entityFetch.viewportRealPortals,
        placeholderPortals: entityFetch.viewportPlaceholderPortals,
        links: entityFetch.viewportLinks,
        fields: entityFetch.viewportFields,
        ornamentPortals: entityFetch.viewportOrnamentPortals,
        ornamentMarkers: entityFetch.viewportOrnamentMarkers,
        artifactPortals: entityFetch.viewportArtifactPortals,
        artifactMarkers: entityFetch.viewportArtifactMarkers,
      },
      requestedTiles: entityFetch.requestedTiles,
      returnedTiles: entityFetch.returnedTiles,
      nonEmptyTiles: entityFetch.nonEmptyTiles,
      elapsedMs: entityFetch.elapsedMs,
      elapsedSeconds: entityFetch.elapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.elapsedMs)),
      firstRenderMs: entityFetch.firstRenderElapsedMs,
      firstRenderSeconds: entityFetch.firstRenderElapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.firstRenderElapsedMs)),
      retryRequests: entityFetch.retryRequests,
      retriedTileKeys: entityFetch.retriedTileKeys,
      recoveredTileKeys: entityFetch.recoveredTileKeys,
      emptyTileKeys: entityFetch.emptyTileKeys,
      nonEmptyTileKeys: entityFetch.nonEmptyTileKeys,
      unaccountedTileKeys: entityFetch.unaccountedTileKeys,
      serverRetryTileKeys: entityFetch.serverRetryTileKeys,
      timeoutTileKeys: entityFetch.timeoutTileKeys,
      errorTileKeys: entityFetch.errorTileKeys,
      responseRetryTileKeys: entityFetch.responseRetryTileKeys,
      queueDelayReasons: entityFetch.queueDelayReasons,
      partialTileKeys: entityFetch.partialTileKeys,
      cacheFreshTiles: entityFetch.cacheFreshTileKeys.length,
      cacheFreshTileKeys: entityFetch.cacheFreshTileKeys,
      cacheStaleTiles: entityFetch.cacheStaleTileKeys.length,
      cacheStaleTileKeys: entityFetch.cacheStaleTileKeys,
      staleGenerationCacheWarmTiles: entityFetch.staleGenerationCacheWarmTileKeys.length,
      staleGenerationCacheWarmTileKeys: entityFetch.staleGenerationCacheWarmTileKeys,
      queue: entityFetch.queue,
      renderQueue: entityFetch.renderQueue,
      renderMutation: entityFetch.renderMutation,
      timing: entityFetch.timing,
      playerTracker: entityFetch.playerTracker,
      authRequired: entityFetch.authRequired,
    },
    baseLayerId,
    dataSource,
    highlighters: {
      active: entityFetch.highlighterSettings.active,
      registered: entityFetch.highlighterIds,
    },
    requests: requestDiagnostics,
    lifecycleSettings,
    layers: layerSettings,
    layerRegistry: LAYER_REGISTRY_DIAGNOSTICS,
    renderPolicy: entityFetch.renderPolicy,
    selectedPortal: entityFetch.selectedPortal,
    portalDetails: entityFetch.portalDetails,
    sidePanels: {
      active: activeSidePanel,
      agent: agentState,
      comm: commState,
      scores: scoresState,
      missions: missionsState,
      passcodes: passcodeState,
      inventory: inventoryState,
    },
    collision: entityFetch.collision,
  };
  const createScenarioSnapshot = (label: string, settings = lifecycleSettings): ScenarioSnapshot => ({
    label,
    capturedAt: new Date().toISOString(),
    diagnostics: {
      ...dockDiagnostics,
      lifecycleSettings: settings,
    },
  });

  const setScenarioStatusBriefly = (value: string): void => {
    setScenarioStatus(value);
    window.setTimeout(() => setScenarioStatus(''), 1800);
  };

  const activeScenarioRun = scenarioRuns.find((run) => run.id === activeScenarioRunId && run.status === 'running') ?? null;
  const latestScenarioRun = scenarioRuns.length > 0 ? scenarioRuns[scenarioRuns.length - 1] : null;
  const scenarioSnapCount = scenarioRuns.reduce((total, run) => total + run.snapshots.length, 0);
  const scenarioProgressRun = activeScenarioRun ?? latestScenarioRun;
  const scenarioProgressLabels = scenarioProgressRun ? new Set(scenarioProgressRun.snapshots.map((snapshot) => snapshot.label)) : new Set<string>();
  const scenarioExpectedSteps = ['previous', 'before-pan-south', 'reload', 'in-progress', 'done'];

  const startScenarioRun = (name: string, settings: IitcIrisLifecycleSettings): void => {
    if (activeScenarioRun) {
      setScenarioStatusBriefly('finish current run first');
      return;
    }
    const runId = `${name}-${Date.now()}`;
    setLifecycleSettings(settings);
    setScenarioRuns((current) => [...current, {
      id: runId,
      name,
      startedAt: new Date().toISOString(),
      status: 'running',
      lifecycleSettings: settings,
      snapshots: [createScenarioSnapshot('previous', settings)],
    }]);
    setActiveScenarioRunId(runId);
    setScenarioStatusBriefly(`${name}: previous captured`);
  };

  const captureScenarioSnapshot = (label: string): void => {
    const runId = activeScenarioRunId;
    if (!runId) {
      setScenarioStatusBriefly('start a scenario first');
      return;
    }
    setScenarioRuns((current) => current.map((run) => run.id === runId
      ? {...run, snapshots: [...run.snapshots, createScenarioSnapshot(label, run.lifecycleSettings)]}
      : run));
    setScenarioStatusBriefly(`${label} captured`);
  };

  const panScenarioSouth = (): void => {
    if (!canPan || !activeScenarioRun) return;
    captureScenarioSnapshot('before-pan-south');
    panMap('south');
  };

  const finishScenarioRun = (): void => {
    const run = activeScenarioRun;
    if (!run) {
      setScenarioStatusBriefly('no active run');
      return;
    }
    const finalLabel = isScenarioSettled(dockDiagnostics) ? 'done' : 'done-active';
    const finishedAt = new Date().toISOString();
    setScenarioRuns((current) => current.map((item) => item.id === run.id
      ? {
        ...item,
        status: 'finished',
        finishedAt,
        snapshots: [...item.snapshots, createScenarioSnapshot(finalLabel, item.lifecycleSettings)],
      }
      : item));
    setActiveScenarioRunId(null);
    setScenarioStatusBriefly(finalLabel === 'done' ? `${run.name} finished` : `${run.name} captured active finish`);
  };

  const clearScenarioRuns = (): void => {
    setScenarioRuns([]);
    setActiveScenarioRunId(null);
    setScenarioStatusBriefly('scenario history cleared');
  };

  const copyScenarioRun = (): void => {
    const summarizeRun = (run: ScenarioRun): ScenarioRun => ({
      ...run,
      snapshots: run.snapshots.map((snapshot) => ({
        ...snapshot,
        summary: createScenarioSnapshotSummary(snapshot.diagnostics),
      })),
    });
    const currentRun = {
      id: `current-${Date.now()}`,
      name: 'current',
      startedAt: new Date().toISOString(),
      status: 'finished' as const,
      lifecycleSettings,
      snapshots: [createScenarioSnapshot('current')],
    };
    const runs = (scenarioRuns.length > 0 ? scenarioRuns : [currentRun]).map(summarizeRun);
    const latest = runs.length > 0 ? runs[runs.length - 1] : currentRun;
    void navigator.clipboard.writeText(JSON.stringify({
      runs,
      latest,
      activeRunId: activeScenarioRunId,
      copiedAt: new Date().toISOString(),
    }, null, 2))
      .then(() => setScenarioStatusBriefly('scenario history copied'))
      .catch(() => setScenarioStatusBriefly('copy failed'));
  };

  const copyDockText = (): void => {
    void navigator.clipboard.writeText(JSON.stringify(dockDiagnostics, null, 2))
      .then(() => {
        setCopyStatus('json copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyIntelUrl = (): void => {
    void navigator.clipboard.writeText(intelUrl)
      .then(() => {
        setCopyStatus('url copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyMapContextLatLng = (): void => {
    if (!mapContext) return;
    void navigator.clipboard.writeText(`${mapContext.lat.toFixed(6)},${mapContext.lng.toFixed(6)}`)
      .then(() => {
        setCopyStatus('coords copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyMapContextUrl = (): void => {
    if (!mapContext) return;
    const url = `https://intel.ingress.com/intel?ll=${mapContext.lat.toFixed(6)},${mapContext.lng.toFixed(6)}&z=${Math.round(mapContext.zoom)}`;
    void navigator.clipboard.writeText(url)
      .then(() => {
        setCopyStatus('context url copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyMapContextGuid = (): void => {
    if (!mapContext?.guid) return;
    void navigator.clipboard.writeText(mapContext.guid)
      .then(() => {
        setCopyStatus(`${mapContext.target} guid copied`);
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyMapContextPortalGuids = (): void => {
    if (!mapContext?.portalGuids?.length) return;
    void navigator.clipboard.writeText(mapContext.portalGuids.join('\n'))
      .then(() => {
        setCopyStatus('anchor guids copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const centerMapContext = (): void => {
    if (!mapContext) return;
    setMapView(mapContext.lat, mapContext.lng, mapContext.zoom);
  };

  const getDrawToolsTarget = (): DrawToolsTarget | null => {
    if (entityFetch.selectedPortal) {
      const {lat, lng} = getPortalLatLng(entityFetch.selectedPortal);
      return {
        lat,
        lng,
        label: entityFetch.selectedPortal.title || entityFetch.selectedPortal.guid,
      };
    }
    return mapContext
      ? {
          lat: mapContext.lat,
          lng: mapContext.lng,
          label: `${mapContext.lat.toFixed(6)}, ${mapContext.lng.toFixed(6)}`,
        }
      : null;
  };

  const getDrawToolsTargetLatLng = (): IitcIrisDrawToolsLatLng | null => {
    const target = getDrawToolsTarget();
    return target ? {lat: target.lat, lng: target.lng} : null;
  };

  const postDrawToolsAction = (message: Omit<IitcIrisMessage, 'type'>): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.drawTools,
      ...message,
    } satisfies IitcIrisMessage, '*');
  };

  const addDrawToolsMarker = (color: string): void => {
    const latLng = getDrawToolsTargetLatLng();
    if (!latLng) return;
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'addMarker',
      drawToolsColor: color,
      drawToolsLatLngs: [latLng],
    });
    setStatus('draw marker added');
  };

  const addDrawToolsLinkPoint = (): void => {
    const latLng = getDrawToolsTargetLatLng();
    if (!latLng) return;
    if (!drawToolsLinkStart) {
      setDrawToolsLinkStart(latLng);
      setStatus('draw link start set');
      return;
    }
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'addPolyline',
      drawToolsColor: DRAW_TOOLS_DEFAULT_COLOR,
      drawToolsLatLngs: [drawToolsLinkStart, latLng],
    });
    setDrawToolsLinkStart(null);
    setStatus('draw link added');
  };

  const deleteDrawToolsAtContext = (itemType?: 'polyline' | 'marker'): void => {
    const latLng = getDrawToolsTargetLatLng();
    if (!latLng) return;
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'deleteAt',
      drawToolsItemType: itemType,
      drawToolsLatLngs: [latLng],
    });
    setStatus('draw item delete requested');
  };

  const deleteDrawToolsItem = (item: IitcIrisDrawToolsItem): void => {
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'deleteIndex',
      drawToolsIndex: item.storageIndex,
    });
    setStatus(`${item.type === 'polyline' ? 'draw link' : 'draw marker'} delete requested`);
  };

  const undoDrawToolsItem = (itemType?: 'polyline' | 'marker'): void => {
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({drawToolsAction: 'undo', drawToolsItemType: itemType});
    setStatus(itemType === 'polyline' ? 'draw link undo requested' : itemType === 'marker' ? 'draw marker undo requested' : 'draw undo requested');
  };

  const clearDrawToolsItems = (itemType?: 'polyline' | 'marker'): void => {
    if (itemType && drawToolsClearConfirm !== itemType) {
      setDrawToolsClearConfirm(itemType);
      setStatus(itemType === 'polyline' ? 'click Clear again to remove drawn links' : 'click Clear again to remove drawn markers');
      return;
    }
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({drawToolsAction: 'clear', drawToolsItemType: itemType});
    if (!itemType || itemType === 'polyline') setDrawToolsLinkStart(null);
    setStatus(itemType === 'polyline' ? 'draw links cleared' : itemType === 'marker' ? 'draw markers cleared' : 'draw items cleared');
  };

  const centerDrawToolsItem = (item: IitcIrisDrawToolsItem): void => {
    const center = getDrawToolsItemCenter(item);
    setMapView(center.lat, center.lng, Math.max(camera.zoom, 15));
  };

  const copyDrawToolsItems = (itemType?: 'polyline' | 'marker'): void => {
    const items = drawToolsItems
      .filter((item) => !itemType || item.type === itemType)
      .map(stripDrawToolsStorageIndex);
    void navigator.clipboard.writeText(serializeIitcDrawToolsLayer(items))
      .then(() => {
        setDrawToolsImportStatus(itemType === 'polyline' ? 'links copied' : itemType === 'marker' ? 'markers copied' : 'draw tools JSON copied');
        window.setTimeout(() => setDrawToolsImportStatus(''), 1400);
      })
      .catch(() => {
        setDrawToolsImportStatus('copy failed');
        window.setTimeout(() => setDrawToolsImportStatus(''), 1800);
      });
  };

  const importDrawToolsItems = (): void => {
    try {
      const parsedItems = parseIitcDrawToolsLayer(drawToolsImportText);
      const supportedItems = parsedItems.filter(isSupportedDrawToolsItem);
      const skippedItems = parsedItems.length - supportedItems.length;
      if (supportedItems.length === 0) {
        setDrawToolsImportStatus('no supported links or markers');
        return;
      }
      postDrawToolsAction({
        drawToolsAction: 'import',
        drawToolsJson: serializeIitcDrawToolsLayer(supportedItems),
        drawToolsMerge: drawToolsImportMerge,
      });
      setDrawToolsImportStatus(skippedItems > 0 ? `importing ${supportedItems.length}, skipped ${skippedItems}` : `importing ${supportedItems.length}`);
      setDrawToolsClearConfirm(null);
    } catch (error) {
      setDrawToolsImportStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const copySelectedPortalLink = (): void => {
    if (!entityFetch.selectedPortal) return;
    const {lat, lng} = getPortalLatLng(entityFetch.selectedPortal);
    const portalUrl = `https://intel.ingress.com/intel?ll=${lat.toFixed(6)},${lng.toFixed(6)}&z=${Math.max(17, Math.round(camera.zoom))}&pll=${lat.toFixed(6)},${lng.toFixed(6)}`;
    void navigator.clipboard.writeText(portalUrl)
      .then(() => {
        setCopyStatus('portal link copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copySelectedPortalGuid = (): void => {
    if (!entityFetch.selectedPortal) return;
    void navigator.clipboard.writeText(entityFetch.selectedPortal.guid)
      .then(() => {
        setCopyStatus('portal guid copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copySelectedPortalTitle = (): void => {
    if (!entityFetch.selectedPortal) return;
    void navigator.clipboard.writeText(entityFetch.selectedPortal.title || entityFetch.selectedPortal.guid)
      .then(() => {
        setCopyStatus('portal title copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const toggleDebugDock = (): void => {
    setDebugDockVisible((current) => {
      const next = !current;
      storeDebugDockVisible(next);
      return next;
    });
  };

  const closeSheetToMap = (): void => {
    if (activeSidePanel) {
      window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
    }
    setActiveSidePanel(null);
    setActiveSheet('map');
    storeSidePanelId(null);
    storeActiveSheet('map');
  };

  const toggleSidePanel = (panelId: SidePanelId): void => {
    setActiveSidePanel((current) => {
      const next = current === panelId ? null : panelId;
      storeSidePanelId(next);
      const nextSheet = next ?? 'map';
      setActiveSheet(nextSheet);
      storeActiveSheet(nextSheet);
      return next;
    });
  };

  const closeSidePanel = (): void => {
    closeSheetToMap();
  };

  const openSheet = (sheet: SheetId): void => {
    setActiveSheet(sheet);
    storeActiveSheet(sheet);
    if (isSidePanelId(sheet)) {
      setActiveSidePanel(sheet);
      storeSidePanelId(sheet);
      return;
    }
    if (activeSidePanel) {
      window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
    }
    setActiveSidePanel(null);
    storeSidePanelId(null);
  };

  const toggleSheet = (sheet: SheetId): void => {
    if (activeSheet === sheet) {
      closeSheetToMap();
      return;
    }
    openSheet(sheet);
  };

  const refreshComm = (tab: IitcIrisCommTab = commState.tab, older = false): void => {
    storeCommTab(tab);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestComm,
      commTab: tab,
      commOlder: older,
    } satisfies IitcIrisMessage, '*');
  };

  const requestOlderComm = (): void => {
    if (commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0) return;
    const list = commListRef.current;
    commOlderScrollHeightRef.current = list?.scrollHeight ?? null;
    commOlderRequestPendingRef.current = true;
    refreshComm(commState.tab, true);
  };

  const handleCommScroll = (): void => {
    const list = commListRef.current;
    if (!list || activeSidePanel !== 'comm' || commState.status === 'loading' || commOlderRequestPendingRef.current) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight <= 10;
    commStickToBottomRef.current = atBottom;
    setCommUserAtBottom(atBottom);
    if (atBottom) setCommNewBelow(false);
    if (list.scrollTop <= 8) requestOlderComm();
  };

  const jumpCommToLatest = (): void => {
    const list = commListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    commStickToBottomRef.current = true;
    setCommUserAtBottom(true);
    setCommNewBelow(false);
  };

  const refreshScores = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestScores,
    } satisfies IitcIrisMessage, '*');
  };

  const refreshInventory = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestInventory,
    } satisfies IitcIrisMessage, '*');
  };

  const refreshMissions = (source: IitcIrisMissionSource = missionsState.source ?? 'view'): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestMissions,
      missionSource: source,
    } satisfies IitcIrisMessage, '*');
  };

  const openSelectedPortalMissions = (): void => {
    if (!entityFetch.selectedPortal) return;
    openSheet('missions');
    refreshMissions('portal');
  };

  const requestMissionDetails = (missionGuid: string): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestMissionDetails,
      missionGuid,
    } satisfies IitcIrisMessage, '*');
  };

  const zoomToMission = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.missionZoom,
    } satisfies IitcIrisMessage, '*');
  };

  const redeemPasscode = (): void => {
    const passcode = passcodeDraft.replace(/[^\x20-\x7E]+/g, '').trim();
    if (!passcode || passcodeState.status === 'loading') return;
    setPasscodeDraft(passcode);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestPasscode,
      passcodeText: passcode,
    } satisfies IitcIrisMessage, '*');
  };

  const sendComm = (): void => {
    const message = commDraft.trim();
    if (!message || commState.tab === 'alerts') return;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.sendComm,
      commTab: commState.tab,
      commMessage: message,
    } satisfies IitcIrisMessage, '*');
    setCommDraft('');
  };

  const addCommNickname = (nickname: string): void => {
    const normalized = nickname.replace(/^@/, '').trim();
    if (!normalized) return;
    setCommDraft((current) => `${current.trim()} @${normalized} `.trimStart());
  };

  const openIntelLogin = (): void => {
    try {
      window.sessionStorage.setItem(LOGIN_BYPASS_STORAGE_KEY, String(Date.now() + LOGIN_BYPASS_MS));
    } catch {
      // Login recovery still works without session storage.
    }
    document.getElementById('iitc-iris-root')?.remove();
    if (window.location.origin === 'https://intel.ingress.com' && window.location.pathname === '/intel') {
      window.location.reload();
      return;
    }
    window.location.assign('https://intel.ingress.com/intel');
  };

  const retryAuthRequest = (): void => {
    if (activeSidePanel === 'comm') {
      refreshComm(commState.tab);
      return;
    }
    if (activeSidePanel === 'scores') {
      refreshScores();
      return;
    }
    if (activeSidePanel === 'missions') {
      refreshMissions();
      return;
    }
    if (activeSidePanel === 'inventory') {
      refreshInventory();
      return;
    }
    if (activeSidePanel === 'passcode' && (passcodeDraft.trim() || passcodeState.passcode)) {
      const passcode = passcodeDraft.trim() || passcodeState.passcode || '';
      setPasscodeDraft(passcode);
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestPasscode,
        passcodeText: passcode,
      } satisfies IitcIrisMessage, '*');
      return;
    }
    window.postMessage({
      type: IITC_IRIS_MESSAGES.dataSourceSettings,
      dataSource,
    } satisfies IitcIrisMessage, '*');
  };

  const inlineAuthActions = (
    <span className="iitc-iris-inline-auth">
      <button type="button" onClick={openIntelLogin} title="Open Intel login">Login</button>
      <button type="button" onClick={retryAuthRequest} title="Retry after login">Retry</button>
    </span>
  );

  const toggleLayerSetting = (key: BooleanLayerSettingKey): void => {
    layerSettingsIntentAtRef.current = performance.now();
    setLayerSettings((current) => ({...current, [key]: !current[key]}));
  };

  const selectPortalHighlighter = (active: IitcIrisPortalHighlighterId): void => {
    highlighterSettingsIntentAtRef.current = performance.now();
    setHighlighterSettings({active});
  };

  const renderBooleanLayerCheckbox = ({id, title}: BooleanLayerToggleEntry): h.JSX.Element => (
    <label key={id} className={`iitc-iris-layer-choice ${layerSettings[id] ? 'is-checked' : ''}`} title={`${title}: ${layerSettings[id] ? 'on' : 'off'}`}>
      <input
        type="checkbox"
        checked={layerSettings[id]}
        onChange={() => toggleLayerSetting(id)}
        aria-label={title}
      />
      <span className="iitc-iris-layer-choice-label">{title}</span>
    </label>
  );

  const renderHighlighterRadio = (option: (typeof PORTAL_HIGHLIGHTER_OPTIONS)[number]): h.JSX.Element => (
    <label key={option.id} className={`iitc-iris-layer-choice ${highlighterSettings.active === option.id ? 'is-checked' : ''}`} title={option.title}>
      <input
        type="radio"
        name="iitc-iris-portal-highlighter"
        checked={highlighterSettings.active === option.id}
        onChange={() => selectPortalHighlighter(option.id)}
        aria-label={option.label}
      />
      <span className="iitc-iris-layer-choice-label">{option.label}</span>
    </label>
  );

  const setMapView = (lat: number, lng: number, zoom = camera.zoom): void => {
    const clamped = clampView({lat, lng, zoom});
    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: clamped.lat,
      lng: clamped.lng,
      zoom: clamped.zoom ?? camera.zoom,
    } satisfies IitcIrisMessage, '*');
  };

  const requestSearch = (term: string, confirmed = false): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchRequest,
      searchTerm: term,
      searchConfirmed: confirmed,
    } satisfies IitcIrisMessage, '*');
  };

  const clearSearch = (): void => {
    setSearchTerm('');
    setSearchState(EMPTY_SEARCH_STATE);
    setActiveSearchResultIndex(0);
    window.postMessage({type: IITC_IRIS_MESSAGES.searchClear} satisfies IitcIrisMessage, '*');
  };

  const previewSearchResult = (result: IitcIrisSearchResult | null): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchPreview,
      searchResult: result ?? undefined,
    } satisfies IitcIrisMessage, '*');
  };

  const selectSearchResult = (result: IitcIrisSearchResult, zoom = false): void => {
    if (result.type === 'empty') return;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchSelect,
      searchResult: result,
      searchZoom: zoom,
    } satisfies IitcIrisMessage, '*');
    if (mapFocusMode) closeSheets();
    else if (result.type === 'portal' || result.type === 'guid') openSheet('portal');
  };

  const moveSearchSelection = (delta: number): void => {
    const selectableResults = searchState.results.filter((result) => result.type !== 'empty');
    if (selectableResults.length === 0) return;
    setActiveSearchResultIndex((current) => (current + delta + selectableResults.length) % selectableResults.length);
  };

  const selectActiveSearchResult = (zoom = false): boolean => {
    const result = searchState.results.filter((candidate) => candidate.type !== 'empty')[activeSearchResultIndex];
    if (!result) return false;
    selectSearchResult(result, zoom);
    return true;
  };

  const handleSearchKeyDown = (event: h.JSX.TargetedKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSearchSelection(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSearchSelection(-1);
      return;
    }
    if (event.key === 'Enter' && selectActiveSearchResult(event.shiftKey)) {
      event.preventDefault();
    }
  };

  const setPortalSectionOpen = (section: PortalSectionId, open: boolean): void => {
    setPortalSections((current) => {
      const next = {...current, [section]: open};
      storePortalSections(next);
      return next;
    });
  };

  const zoomToAndShowPortal = (portalGuid?: string, latE6?: number, lngE6?: number, zoom = Math.max(camera.zoom, 15)): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      portalGuid,
      portalLat: latE6 === undefined ? undefined : latE6 / 1_000_000,
      portalLng: lngE6 === undefined ? undefined : lngE6 / 1_000_000,
      zoom,
    } satisfies IitcIrisMessage, '*');
  };

  const selectMapContextAnchor = (anchor: IitcIrisMapContextPortalAnchor): void => {
    zoomToAndShowPortal(anchor.guid, anchor.latE6, anchor.lngE6);
  };

  const selectPortalByLatLng = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    if (latE6 === undefined || lngE6 === undefined) return;
    zoomToAndShowPortal(portalGuid, latE6, lngE6);
  };

  const formatMissionOrderLabel = (order?: string): string => {
    if (!order) return 'any order';
    return order.replace(/_/g, ' ').toLowerCase();
  };

  const formatMissionRowMeta = (mission: IitcIrisMissionsState['missions'][number]): string => {
    const selected = missionsState.selectedMission?.guid === mission.guid ? missionsState.selectedMission : undefined;
    if (selected) {
      return [
        `${formatMissionRating(mission.ratingE6)} rating`,
        formatMissionDuration(mission.medianCompletionTimeMs, mission.durationLabel),
      ].filter((part) => part && part !== '-').join(' · ');
    }
    const waypointCount = mission.waypointCount;
    const routeLengthMeters = mission.routeLengthMeters;
    const orderType = mission.type;
    const completedAgents = mission.numUniqueCompletedPlayers;
    const author = mission.authorNickname;
    const parts = [
      `${formatMissionRating(mission.ratingE6)} rating`,
      formatMissionDuration(mission.medianCompletionTimeMs, mission.durationLabel),
    ];
    if (author) parts.push(`by ${author}`);
    if (routeLengthMeters !== undefined) parts.push(formatDistance(routeLengthMeters));
    if (completedAgents !== undefined) parts.push(`${formatInteger(completedAgents)} agents`);
    if (waypointCount !== undefined) parts.push(`${waypointCount} waypoints`);
    if (orderType) parts.push(formatMissionOrderLabel(orderType));
    return parts.filter((part) => part && part !== '-').join(' · ');
  };

  const renderSelectedMissionDetails = (): h.JSX.Element | null => {
    if (!missionsState.selectedMission) return null;
    const firstWaypoint = missionsState.selectedMission.waypoints.find((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined);
    const renderMissionMetric = (
      icon: 'rating' | 'time' | 'length' | 'agents' | 'waypoints' | 'order',
      value: string | number,
      label: string,
      title: string,
    ): h.JSX.Element => (
      <span title={title}>
        <img
          src={icon === 'waypoints' || icon === 'order' ? getMissionTypeIcon(missionsState.selectedMission?.typeNum) : getMissionMetricIcon(icon)}
          alt=""
          loading="lazy"
        />
        <b>{value}</b>
        <small>{label}</small>
      </span>
    );
    return (
      <div className="iitc-iris-mission-details">
        <div className="iitc-iris-mission-expanded-top">
          <span className="iitc-iris-status">
            {missionsState.selectedMission.authorNickname ? (
              <>
                by <b className={`iitc-iris-mission-author ${getCommTeamClass(missionsState.selectedMission.authorTeam)}`}>{missionsState.selectedMission.authorNickname}</b>
              </>
            ) : 'unknown author'}
          </span>
        </div>
        <div className="iitc-iris-mission-metrics">
          {renderMissionMetric('rating', formatMissionRating(missionsState.selectedMission.ratingE6), 'rating', 'Average rating')}
          {renderMissionMetric('time', formatMissionDuration(missionsState.selectedMission.medianCompletionTimeMs, missionsState.selectedMission.durationLabel), 'typical', 'Typical duration')}
          {renderMissionMetric('length', formatDistance(missionsState.selectedMission.routeLengthMeters), 'length', 'Length of this mission. The actual distance required may vary.')}
          {renderMissionMetric('agents', formatInteger(missionsState.selectedMission.numUniqueCompletedPlayers), 'agents', 'Unique players who have completed this mission')}
          {renderMissionMetric('waypoints', missionsState.selectedMission.waypoints.length, 'waypoints', `${missionsState.selectedMission.type ?? 'Unknown'} mission with ${missionsState.selectedMission.waypoints.length} waypoints`)}
          {renderMissionMetric('order', formatMissionOrderLabel(missionsState.selectedMission.type), 'order', 'Mission order')}
        </div>
        <div className="iitc-iris-mission-detail-actions">
          <button
            className="iitc-iris-portal-action"
            type="button"
            onClick={() => firstWaypoint && zoomToAndShowPortal(firstWaypoint.portalGuid, firstWaypoint.latE6, firstWaypoint.lngE6, Math.max(camera.zoom, 17))}
            disabled={!firstWaypoint}
            title="Pan to the first visible waypoint and select it when the portal is loaded"
          >
            First
          </button>
          <button className="iitc-iris-portal-action" type="button" onClick={zoomToMission} disabled={!missionsState.selectedMission.bounds} title="Zoom to mission route">
            Zoom
          </button>
        </div>
        {missionsState.selectedMission.description && (
          <p className="iitc-iris-mission-description">{missionsState.selectedMission.description}</p>
        )}
        <div className="iitc-iris-mission-waypoint-list">
          {missionsState.selectedMission.waypoints.map((waypoint) => (
            <button
              className={`iitc-iris-mission-waypoint ${waypoint.hidden ? 'is-hidden' : ''}`}
              type="button"
              key={`${waypoint.guid}-${waypoint.index}`}
              onClick={() => {
                if (waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined) {
                  zoomToAndShowPortal(waypoint.portalGuid, waypoint.latE6, waypoint.lngE6);
                }
              }}
              disabled={waypoint.latE6 === undefined || waypoint.lngE6 === undefined}
              title={waypoint.portalGuid || waypoint.guid}
            >
              <b>{waypoint.index + 1}</b>
              <span>
                <strong>{waypoint.hidden ? 'Hidden waypoint' : waypoint.title}</strong>
                <small>{waypoint.objective} · {waypoint.type}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const selectCommPortal = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    selectPortalByLatLng(latE6, lngE6, portalGuid);
  };

  const panMap = (direction: 'north' | 'south' | 'west' | 'east'): void => {
    const offsetX = direction === 'east' ? IITC_PAN_CONTROL_OFFSET_PX : direction === 'west' ? -IITC_PAN_CONTROL_OFFSET_PX : 0;
    const offsetY = direction === 'south' ? IITC_PAN_CONTROL_OFFSET_PX : direction === 'north' ? -IITC_PAN_CONTROL_OFFSET_PX : 0;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.panBy,
      panX: offsetX,
      panY: offsetY,
    } satisfies IitcIrisMessage, '*');
  };

  const zoomMap = (delta: number): void => {
    setMapView(camera.lat, camera.lng, camera.zoom + delta);
  };

  const clearPortalSelection = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.clearPortalSelection,
    } satisfies IitcIrisMessage, '*');
  };

  const closeSheets = (): void => {
    setPortalImageOpen(false);
    openSheet('map');
  };

  const focusSelectedPortal = (): void => {
    if (!entityFetch.selectedPortal) return;
    const {lat, lng} = getPortalLatLng(entityFetch.selectedPortal);
    setMapView(lat, lng, Math.max(17, camera.zoom));
    if (mapFocusMode) closeSheets();
  };

  const canPan = camera.bounds !== null;
  const activeSidePanelOption = SIDE_PANEL_OPTIONS.find((option) => option.id === activeSidePanel) ?? null;
  const activePrimaryMenu = activeSheet === 'missions' && missionsState.source === 'portal'
    ? 'selected'
    : activeSheet === 'map' && entityFetch.selectedPortal
      ? 'selected'
    : getPrimaryMenuId(activeSheet);
  const activeSidePanelStatus = activeSidePanel === 'comm'
    ? commState.status === 'auth' || commState.sendStatus === 'auth' ? 'auth' : commState.status
    : activeSidePanel === 'scores'
      ? scoresState.status === 'auth' || scoresState.region?.status === 'auth' ? 'auth' : scoresState.status
      : activeSidePanel === 'missions'
        ? missionsState.status === 'auth' || missionsState.detailsStatus === 'auth' ? 'auth' : missionsState.status
        : activeSidePanel === 'inventory'
          ? inventoryState.status === 'auth' || inventoryState.subscription?.status === 'auth' ? 'auth' : inventoryState.status
          : activeSidePanel === 'passcode'
            ? passcodeState.status
            : activeSidePanel === 'agent'
              ? agentState.status === 'missing' || agentState.subscription?.status === 'auth' ? 'auth' : agentState.status
              : 'idle';
  const authSources = [
    entityFetch.authRequired ? 'map' : null,
    selectedPortalDetails?.status === 'auth' ? 'portal details' : null,
    commState.status === 'auth' || commState.sendStatus === 'auth' ? 'COMM' : null,
    scoresState.status === 'auth' || scoresState.region?.status === 'auth' ? 'scores' : null,
    missionsState.status === 'auth' || missionsState.detailsStatus === 'auth' ? 'missions' : null,
    inventoryState.status === 'auth' || inventoryState.subscription?.status === 'auth' ? 'inventory' : null,
    passcodeState.status === 'auth' ? 'passcode' : null,
    agentState.status === 'missing' || agentState.subscription?.status === 'auth' ? 'agent' : null,
  ].filter((source): source is string => source !== null);
  const authRecoveryText = authSources.length > 0
    ? authSources.length === 1
      ? `${authSources[0]} needs an authenticated Intel session`
      : `${authSources.length} requests need an authenticated Intel session`
    : '';
  const activePanelNeedsAuth = activeSidePanelStatus === 'auth';
  const openCommPanel = (tab?: IitcIrisCommTab): void => {
    if (tab) refreshComm(tab);
    openSheet('comm');
  };

  const selectCommTab = (tab: IitcIrisCommTab): void => {
    if (activeSheet === 'comm' && commState.tab === tab) return;
    refreshComm(tab);
    if (activeSheet !== 'comm') openSheet('comm');
  };

  const toggleCommPanel = (tab?: IitcIrisCommTab): void => {
    if (activeSheet === 'comm' && (!tab || commState.tab === tab)) {
      closeSheetToMap();
      return;
    }
    openCommPanel(tab);
  };

  const toggleMissionsSheet = (source: IitcIrisMissionSource): void => {
    if (activeSheet === 'missions' && missionsState.source === source) {
      closeSheetToMap();
      return;
    }
    openSheet('missions');
    refreshMissions(source);
  };

  const togglePrimaryMenu = (menu: PrimaryMenuId): void => {
    if (menu === 'selected') {
      if (!hasSelectedObject) return;
      toggleSheet(activeSelectedSheet);
      return;
    }
    if (menu === 'map') {
      if (activePrimaryMenu === 'map' && activeSheet !== 'map') closeSheetToMap();
      else openSheet('layers');
      return;
    }
    if (menu === 'agent') {
      toggleSheet('agent');
      return;
    }
    if (menu === 'comm') {
      toggleCommPanel();
      return;
    }
    if (menu === 'system') {
      toggleSheet('system');
    }
  };

  const jumpToPreset = (preset: typeof VIEW_PRESETS[number]): void => {
    setMapView(preset.lat, preset.lng, preset.zoom);
  };

  const jumpToViewInput = (): void => {
    const parsed = parseViewInput(viewInput);
    if (!parsed) {
      setViewInputStatus('bad view');
      window.setTimeout(() => setViewInputStatus(''), 1600);
      return;
    }

    setMapView(parsed.lat, parsed.lng, parsed.zoom ?? camera.zoom);
    setViewInputStatus('jumped');
    window.setTimeout(() => setViewInputStatus(''), 1200);
  };

  const locateBrowserPosition = (): void => {
    if (!navigator.geolocation) {
      setGeolocationStatus('unavailable');
      window.setTimeout(() => setGeolocationStatus(''), 1800);
      return;
    }
    setGeolocationStatus('locating...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.postMessage({
          type: IITC_IRIS_MESSAGES.setUserLocation,
          userLat: position.coords.latitude,
          userLng: position.coords.longitude,
          userAccuracy: position.coords.accuracy,
        } satisfies IitcIrisMessage, '*');
        setMapView(position.coords.latitude, position.coords.longitude, GEOLOCATION_MAX_ZOOM);
        setGeolocationStatus(position.coords.accuracy ? `located +/- ${Math.round(position.coords.accuracy)}m` : 'located');
        window.setTimeout(() => setGeolocationStatus(''), 2200);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'permission denied'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'unavailable'
            : 'timeout';
        setGeolocationStatus(message);
        window.setTimeout(() => setGeolocationStatus(''), 2200);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<IitcIrisMessage>): void => {
      if (event.source !== window) return;
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('IRIS_')) {
        setEntityFetch((current) => ({...current, collision: true}));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.pageReady) {
        setStatus('leaflet ready');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.layerSettings,
          sentAt: performance.now(),
          layerSettings,
          baseLayerId,
        } satisfies IitcIrisMessage, '*');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.layerSettings,
          highlighterSettings,
        } satisfies IitcIrisMessage, '*');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.dataSourceSettings,
          dataSource,
        } satisfies IitcIrisMessage, '*');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.lifecycleSettings,
          lifecycleSettings,
        } satisfies IitcIrisMessage, '*');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.drawTools,
          drawToolsAction: 'requestStatus',
        } satisfies IitcIrisMessage, '*');
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.mapMoved) {
        setCamera((current) => ({
          lat: event.data.lat ?? current.lat,
          lng: event.data.lng ?? current.lng,
          zoom: event.data.zoom ?? current.zoom,
          bounds: event.data.bounds ?? current.bounds,
        }));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.mapContext) {
        if (event.data.contextTarget === 'portal') {
          setMapContext(null);
          if (activeSidePanel) {
            window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
          }
          setPortalImageOpen(false);
          setActiveSidePanel(null);
          storeSidePanelId(null);
          setActiveSheet('portal');
          storeActiveSheet('portal');
        } else if (typeof event.data.lat === 'number' && typeof event.data.lng === 'number') {
          const target = event.data.contextTarget === 'link' || event.data.contextTarget === 'field' ? event.data.contextTarget : 'map';
          setMapContext({
            lat: event.data.lat,
            lng: event.data.lng,
            zoom: event.data.zoom ?? camera.zoom,
            target,
            guid: event.data.contextGuid,
            team: event.data.contextTeam,
            portalGuids: event.data.contextPortalGuids,
            portalAnchors: event.data.contextPortalAnchors,
            distanceMeters: event.data.contextDistanceMeters,
          });
          if (activeSidePanel) {
            window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
          }
          setPortalImageOpen(false);
          setActiveSidePanel(null);
          storeSidePanelId(null);
          const contextSheet = target === 'link' ? 'selectedLink' : target === 'field' ? 'selectedField' : 'view';
          setActiveSheet(contextSheet);
          storeActiveSheet(contextSheet);
          setStatus(`${target} context ${event.data.lat.toFixed(6)},${event.data.lng.toFixed(6)}`);
        }
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.entityStatus) {
        setEntityFetch((current) => entityFetchStateFromMessage(event.data, current));
        if (event.data.requestDiagnostics) setRequestDiagnostics(event.data.requestDiagnostics);
        if (event.data.comm) setCommState(event.data.comm);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.commStatus && event.data.comm) {
        setCommState(event.data.comm);
        if (event.data.requestDiagnostics) setRequestDiagnostics(event.data.requestDiagnostics);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.scoresStatus && event.data.scores) {
        setScoresState(event.data.scores);
        if (event.data.requestDiagnostics) setRequestDiagnostics(event.data.requestDiagnostics);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.passcodeStatus && event.data.passcode) {
        setPasscodeState(event.data.passcode);
        if (event.data.requestDiagnostics) setRequestDiagnostics(event.data.requestDiagnostics);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.inventoryStatus && event.data.inventory) {
        setInventoryState(event.data.inventory);
        if (event.data.requestDiagnostics) setRequestDiagnostics(event.data.requestDiagnostics);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.missionsStatus && event.data.missions) {
        setMissionsState(event.data.missions);
        if (event.data.requestDiagnostics) setRequestDiagnostics(event.data.requestDiagnostics);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.requestStatus && event.data.requestDiagnostics) {
        setRequestDiagnostics(event.data.requestDiagnostics);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.agentStatus && event.data.agent) {
        setAgentState(event.data.agent);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.searchStatus && event.data.search) {
        setSearchState(event.data.search);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.drawToolsStatus) {
        setDrawToolsItems(event.data.drawToolsItems ?? []);
        if (event.data.drawToolsError) {
          setDrawToolsImportStatus(event.data.drawToolsError);
        } else if (event.data.drawToolsStatusText) {
          setDrawToolsImportStatus(event.data.drawToolsStatusText);
        }
      }
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, [activeSidePanel, baseLayerId, dataSource, highlighterSettings, layerSettings, lifecycleSettings]);

  useEffect(() => {
    storeLayerSettings(layerSettings);
    const sentAt = layerSettingsIntentAtRef.current ?? performance.now();
    layerSettingsIntentAtRef.current = undefined;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt,
      layerSettings,
      baseLayerId,
    } satisfies IitcIrisMessage, '*');
  }, [baseLayerId, layerSettings]);

  useEffect(() => {
    storeHighlighterSettings(highlighterSettings);
    const sentAt = highlighterSettingsIntentAtRef.current ?? performance.now();
    highlighterSettingsIntentAtRef.current = undefined;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt,
      highlighterSettings,
    } satisfies IitcIrisMessage, '*');
  }, [highlighterSettings]);

  useEffect(() => {
    storeDataSourceId(dataSourceId);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.dataSourceSettings,
      dataSource,
    } satisfies IitcIrisMessage, '*');
  }, [dataSource, dataSourceId]);

  useEffect(() => {
    storeLifecycleSettings(lifecycleSettings);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.lifecycleSettings,
      lifecycleSettings,
    } satisfies IitcIrisMessage, '*');
  }, [lifecycleSettings]);

  useEffect(() => {
    storeBoolean(SHORTCUTS_ENABLED_STORAGE_KEY, shortcutsEnabled);
  }, [shortcutsEnabled]);

  useEffect(() => {
    storeBoolean(MAP_FOCUS_MODE_STORAGE_KEY, mapFocusMode);
  }, [mapFocusMode]);

  useEffect(() => {
    if (activeSidePanel !== 'comm' || commState.status !== 'idle') return;
    const postCommRequest = (): void => {
      storeCommTab(commState.tab);
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestComm,
        commTab: commState.tab,
      } satisfies IitcIrisMessage, '*');
    };
    postCommRequest();
    const retryTimers = [
      window.setTimeout(postCommRequest, 500),
      window.setTimeout(postCommRequest, 1500),
    ];
    return (): void => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeSidePanel, commState.status, commState.tab]);

  useEffect(() => {
    if (activeSidePanel !== 'scores' || scoresState.status !== 'idle') return;
    const postScoresRequest = (): void => {
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestScores,
      } satisfies IitcIrisMessage, '*');
    };
    postScoresRequest();
    const retryTimer = window.setTimeout(postScoresRequest, 500);
    return (): void => window.clearTimeout(retryTimer);
  }, [activeSidePanel, scoresState.status]);

  useEffect(() => {
    if (activeSidePanel !== 'inventory' || inventoryState.status !== 'idle') return;
    const postInventoryRequest = (): void => {
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestInventory,
      } satisfies IitcIrisMessage, '*');
    };
    postInventoryRequest();
    const retryTimer = window.setTimeout(postInventoryRequest, 500);
    return (): void => window.clearTimeout(retryTimer);
  }, [activeSidePanel, inventoryState.status]);

  useEffect(() => {
    if (activeSidePanel !== 'missions') return;
    if (missionsState.source !== 'portal' || missionsState.status === 'loading') return;
    const selectedPortalGuid = entityFetch.selectedPortal?.guid;
    if (!selectedPortalGuid || selectedPortalGuid === missionsState.portalGuid) return;
    refreshMissions('portal');
  }, [activeSidePanel, entityFetch.selectedPortal?.guid, missionsState.portalGuid, missionsState.source, missionsState.status]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length === 0) {
      setSearchState(EMPTY_SEARCH_STATE);
      setActiveSearchResultIndex(0);
      window.postMessage({type: IITC_IRIS_MESSAGES.searchClear} satisfies IitcIrisMessage, '*');
      return;
    }
    const timer = window.setTimeout(() => requestSearch(term, false), 100);
    return (): void => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [searchState.term, searchState.results.length]);

  useEffect(() => {
    if (activeSheet !== 'search') return;
    const result = searchState.results.filter((candidate) => candidate.type !== 'empty')[activeSearchResultIndex];
    previewSearchResult(result ?? null);
  }, [activeSheet, activeSearchResultIndex, searchState.results]);

  useEffect(() => {
    if (activeSidePanel !== 'comm') return;
    const list = commListRef.current;
    if (!list) return;
    window.requestAnimationFrame(() => {
      if (commState.requestOlder) {
        if (commState.status === 'loading') return;
        const previousHeight = commOlderScrollHeightRef.current;
        if (commState.oldMessagesWereAdded && previousHeight !== null) {
          list.scrollTop = Math.max(0, list.scrollHeight - previousHeight);
        }
        commOlderScrollHeightRef.current = null;
        commOlderRequestPendingRef.current = false;
        return;
      }
      commOlderScrollHeightRef.current = null;
      commOlderRequestPendingRef.current = false;
      if (commStickToBottomRef.current || commState.sendStatus === 'sending' || commState.sendStatus === 'sent') {
        list.scrollTop = list.scrollHeight;
        setCommUserAtBottom(true);
      }
    });
  }, [activeSidePanel, commState.tab, commState.status, commState.newestTimestamp, commState.messages, commState.recent?.length, commState.requestOlder, commState.oldMessagesWereAdded, commState.sendStatus]);

  useEffect(() => {
    if (activeSidePanel !== 'comm') {
      commLatestTimestampRef.current = commState.newestTimestamp;
      return;
    }
    const previous = commLatestTimestampRef.current;
    const current = commState.newestTimestamp;
    if (previous !== undefined && current !== undefined && current > previous && !commStickToBottomRef.current) {
      setCommNewBelow(true);
    }
    commLatestTimestampRef.current = current;
  }, [activeSidePanel, commState.newestTimestamp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (event.key === 'Escape') {
        if (portalImageOpen) {
          event.preventDefault();
          setPortalImageOpen(false);
          return;
        }
        event.preventDefault();
        closeSheets();
        return;
      }
      if (!shortcutsEnabled) return;
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleSheet('help');
        return;
      }
      const menuShortcut = (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) ||
        (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey);
      if (menuShortcut) {
        if (key === 'm') {
          event.preventDefault();
          togglePrimaryMenu('map');
          return;
        }
        if (key === 'p' && hasSelectedObject) {
          event.preventDefault();
          togglePrimaryMenu('selected');
          return;
        }
        if (key === 'a') {
          event.preventDefault();
          togglePrimaryMenu('agent');
          return;
        }
        if (key === 'c') {
          event.preventDefault();
          togglePrimaryMenu('comm');
          return;
        }
        if (key === 's') {
          event.preventDefault();
          togglePrimaryMenu('system');
          return;
        }
      }
      if (event.key === '/') {
        event.preventDefault();
        toggleSheet('search');
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomMap(1);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomMap(-1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        panMap('north');
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        panMap('south');
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        panMap('west');
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        panMap('east');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => window.removeEventListener('keydown', onKeyDown);
  }, [activePrimaryMenu, activeSheet, entityFetch.selectedPortal, portalImageOpen, camera, shortcutsEnabled]);

  const setDataSource = (id: typeof DATA_SOURCE_OPTIONS[number]['id']): void => {
    setDataSourceId(id);
    const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id);
    if (!option || option.mode === 'live') return;
    setMapView(option.lat, option.lng, option.zoom);
  };
  let searchSelectableIndex = -1;
  const renderedSearchResults = searchState.results.map((result) => ({
    result,
    selectableIndex: result.type === 'empty' ? -1 : ++searchSelectableIndex,
  }));
  const groupedSearchResults = [
    {id: 'portals', label: 'Loaded portals', items: renderedSearchResults.filter(({result}) => result.type === 'portal' || result.type === 'guid')},
    {id: 'addresses', label: 'Addresses', items: renderedSearchResults.filter(({result}) => result.type === 'address')},
    {id: 'coordinates', label: 'Coordinates', items: renderedSearchResults.filter(({result}) => result.type === 'coordinate')},
    {id: 'notices', label: 'Notices', items: renderedSearchResults.filter(({result}) => result.type === 'empty')},
  ].filter((group) => group.items.length > 0);
  const activeSearchResult = searchState.results.filter((result) => result.type !== 'empty')[activeSearchResultIndex];
  const drawToolsTarget = getDrawToolsTarget();
  const drawToolsLinkItems = drawToolsItems.filter((item) => item.type === 'polyline');
  const drawToolsMarkerItems = drawToolsItems.filter((item) => item.type === 'marker');

  return (
    <div className={`iitc-iris-shell iitc-iris-sheet-${activeSheet} ${entityFetch.selectedPortal ? 'iitc-iris-has-selected-portal' : ''}`}>
      <div id="iitc-iris-map" className="iitc-iris-map" />
      {authRecoveryText && (
        <div className="iitc-iris-auth-recovery" role="status" aria-live="polite">
          <span>{authRecoveryText}</span>
          <button type="button" onClick={openIntelLogin} title="Open Intel login">Login</button>
          <button type="button" onClick={retryAuthRequest} title="Retry the latest affected request">Retry</button>
        </div>
      )}
      {activeSheet === 'map' && searchState.term && searchState.results.length > 0 && (
        <div className="iitc-iris-map-search-badge">
          <span title={activeSearchResult?.title || searchState.term}>search: {activeSearchResult?.title || searchState.term}</span>
          <button type="button" onClick={clearSearch} title="Clear search overlay" aria-label="Clear search overlay">x</button>
        </div>
      )}
      {activeSheet === 'search' && (
        <aside className="iitc-iris-request-side-panel iitc-iris-search-panel" role="search" aria-label="Search">
          <div className="iitc-iris-request-panel-header">
            <span className="iitc-iris-selected-title">Search</span>
            <span className="iitc-iris-panel-header-actions">
              <span className={`iitc-iris-status iitc-iris-panel-state ${getPanelStatusClass(searchState.status)}`}>{searchState.status}</span>
              <button className="iitc-iris-clear-selection" type="button" onClick={() => openSheet('map')} title="Close search" aria-label="Close search">X</button>
            </span>
          </div>
          <div className="iitc-iris-request-panel-body">
          <form
            className="iitc-iris-search-box"
            onSubmit={(event) => {
              event.preventDefault();
              requestSearch(searchTerm, true);
            }}
          >
            <input
              className="iitc-iris-search-input"
              type="search"
              value={searchTerm}
              placeholder="Search portal or address"
              title="Type to search loaded portals. Press Enter to search OpenStreetMap."
              onInput={(event) => setSearchTerm(event.currentTarget.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchTerm && (
              <button className="iitc-iris-search-clear" type="button" onClick={clearSearch} title="Clear search" aria-label="Clear search">x</button>
            )}
          </form>
          {searchTerm.trim().length > 0 && (
            <div className="iitc-iris-search-results">
              <div className="iitc-iris-search-status">
                <span>{searchState.status === 'loading' ? 'searching online' : searchState.results.length > 0 ? `${searchState.results.length} results` : searchTerm.trim().length < 3 ? 'type 3+ chars' : 'no local results'}</span>
                {!searchState.confirmed && searchTerm.trim().length >= 3 && <span>Enter for address</span>}
              </div>
              {groupedSearchResults.map((group) => (
                <div className="iitc-iris-search-result-group" key={group.id}>
                  <span className="iitc-iris-search-result-heading">
                    {group.label}
                    <b>{group.items.length}</b>
                  </span>
                  {group.items.map(({result, selectableIndex}) => (
                    <button
                      className={`iitc-iris-search-result iitc-iris-search-result-${result.type} ${selectableIndex === activeSearchResultIndex ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => selectSearchResult(result)}
                      onDblClick={(event) => {
                        event.preventDefault();
                        selectSearchResult(result, true);
                      }}
                      disabled={result.type === 'empty'}
                      key={result.id}
                      onMouseEnter={() => {
                        if (selectableIndex >= 0) setActiveSearchResultIndex(selectableIndex);
                        previewSearchResult(result);
                      }}
                      onMouseLeave={() => previewSearchResult(null)}
                      onFocus={() => previewSearchResult(result)}
                      onBlur={() => previewSearchResult(null)}
                      title={result.title}
                    >
                      <span className="iitc-iris-search-result-main">
                        <span className="iitc-iris-search-result-type">{result.type === 'coordinate' ? 'coords' : result.type}</span>
                        <span className={result.team ? getCommTeamClass(result.team) : ''}>{result.title}</span>
                      </span>
                      {result.description && <small>{result.description}</small>}
                    </button>
                  ))}
                </div>
              ))}
              {searchState.error && <span className="iitc-iris-warning">{searchState.error}</span>}
            </div>
          )}
          <div className="iitc-iris-panel-footer">
            <span
              className="iitc-iris-diagnostics-chip"
              title={[
                searchState.confirmed ? 'request: Nominatim search' : 'request: local portal search only',
                `local: ${searchState.localResults}`,
                `online: ${searchState.onlineResults ?? '-'}`,
              ].join('\n')}
            >
              {searchState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(searchState.elapsedMs)}s` : 'request'}
            </span>
            {searchState.results.length > 0 && (
              <button className="iitc-iris-diagnostics-chip iitc-iris-chip-button" type="button" onClick={clearSearch} title="Clear search results and map overlay">
                clear overlay
              </button>
            )}
          </div>
          </div>
        </aside>
      )}
      <aside className="iitc-iris-map-controls" aria-label="Map controls">
        {(activeSheet === 'view' || activeSheet === 'layers' || activeSheet === 'drawLinks' || activeSheet === 'drawMarkers' || activeSheet === 'portalCounts' || activeSheet === 'portalsList' || activeSheet === 'scoreboard' || activeSheet === 'selectedLink' || activeSheet === 'selectedField') && (
          <div className="iitc-iris-panel-topbar">
            <span className="iitc-iris-selected-title">
              {activeSheet === 'view'
                ? 'Controls'
                : activeSheet === 'selectedLink'
                  ? 'Link'
                : activeSheet === 'selectedField'
                  ? 'Field'
                : activeSheet === 'layers'
                  ? 'Display'
                  : activeSheet === 'drawLinks'
                    ? 'Draw Links'
                    : activeSheet === 'drawMarkers'
                      ? 'Draw Markers'
                      : activeSheet === 'portalCounts'
                        ? 'Portal Counts'
                        : activeSheet === 'portalsList'
                          ? 'Portals List'
                          : 'Scoreboard'}
            </span>
            <span className="iitc-iris-panel-header-actions">
              <button className="iitc-iris-clear-selection" type="button" onClick={closeSheets} title={`Close ${activeSheet}`} aria-label={`Close ${activeSheet}`}>X</button>
            </span>
          </div>
        )}
        {activeSheet === 'view' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Controls</span>
          <div className="iitc-iris-map-control-row">
            <div className="iitc-iris-pan-grid" aria-label="Pan controls">
              <button className="iitc-iris-nav-button iitc-iris-pan-north" type="button" disabled={!canPan} onClick={() => panMap('north')} title="Pan north" aria-label="Pan north">N</button>
              <button className="iitc-iris-nav-button iitc-iris-pan-west" type="button" disabled={!canPan} onClick={() => panMap('west')} title="Pan west" aria-label="Pan west">W</button>
              <button className="iitc-iris-nav-button iitc-iris-pan-east" type="button" disabled={!canPan} onClick={() => panMap('east')} title="Pan east" aria-label="Pan east">E</button>
              <button className="iitc-iris-nav-button iitc-iris-pan-south" type="button" disabled={!canPan} onClick={() => panMap('south')} title="Pan south" aria-label="Pan south">S</button>
            </div>
            <button className="iitc-iris-nav-button" type="button" onClick={() => zoomMap(1)} title="Zoom in" aria-label="Zoom in">+</button>
            <button className="iitc-iris-nav-button" type="button" onClick={() => zoomMap(-1)} title="Zoom out" aria-label="Zoom out">-</button>
            <button className="iitc-iris-nav-button iitc-iris-nav-button-wide" type="button" onClick={locateBrowserPosition} title="Pan to current browser location">Locate</button>
          </div>
          {geolocationStatus && <span className="iitc-iris-map-control-status">{geolocationStatus}</span>}
        </div>}
        {mapContext && (
          (activeSheet === 'view' && mapContext.target === 'map') ||
          (activeSheet === 'selectedLink' && mapContext.target === 'link') ||
          (activeSheet === 'selectedField' && mapContext.target === 'field')
        ) && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">
            {mapContext.target === 'link' ? 'Link details' : mapContext.target === 'field' ? 'Field details' : 'Context'}
          </span>
          {mapContext.target !== 'map' && <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords" title={mapContext.guid}>
              {mapContext.target === 'link' ? 'Link' : 'Field'}
              {mapContext.team ? `, ${formatTeamLabel(mapContext.team)}` : ''}
            </span>
            {mapContext.guid && <button className="iitc-iris-portal-action" type="button" onClick={copyMapContextGuid} title={`Copy ${mapContext.target} GUID`}>GUID</button>}
            {mapContext.portalGuids?.length ? <button className="iitc-iris-portal-action" type="button" onClick={copyMapContextPortalGuids} title="Copy anchor portal GUIDs">Anchors</button> : null}
          </div>}
          {mapContext.target !== 'map' && mapContext.distanceMeters !== undefined && <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords">
              {mapContext.target === 'link' ? 'Length' : 'Edge total'}: {formatMapObjectDistance(mapContext.distanceMeters)}
            </span>
          </div>}
          {mapContext.target !== 'map' && mapContext.portalAnchors?.length ? mapContext.portalAnchors.map((anchor, index) => (
            <div className="iitc-iris-map-context-row" key={`${anchor.guid || 'anchor'}-${index}`}>
              <button className={`iitc-iris-map-context-anchor ${mapContext.team ? formatTeamClass(mapContext.team) : ''}`} type="button" onClick={() => selectMapContextAnchor(anchor)} title="Center and select this anchor portal">
                {mapContext.target === 'link' ? (index === 0 ? 'From' : 'To') : `Anchor ${index + 1}`}: {anchor.label}
              </button>
            </div>
          )) : null}
          <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords" title={`${mapContext.lat},${mapContext.lng}`}>
              {mapContext.lat.toFixed(6)}, {mapContext.lng.toFixed(6)}
            </span>
            <button className="iitc-iris-portal-action" type="button" onClick={centerMapContext} title="Center map on this context point">Center</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copyMapContextLatLng} title="Copy context coordinates">LL</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copyMapContextUrl} title="Copy Intel URL for this context point">URL</button>
          </div>
        </div>}
        {activeSheet === 'drawLinks' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Draw Links</span>
          <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords">
              {drawToolsTarget?.label ?? 'Select a portal or open a context point'}
            </span>
            <button className="iitc-iris-portal-action" type="button" onClick={addDrawToolsLinkPoint} disabled={!drawToolsTarget} title={drawToolsLinkStart ? 'Finish drawn link at the current target' : 'Start drawn link at the current target'}>
              {drawToolsLinkStart ? 'To' : 'From'}
            </button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => setDrawToolsLinkStart(null)} disabled={!drawToolsLinkStart} title="Reset pending drawn link">Reset</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => deleteDrawToolsAtContext('polyline')} disabled={!drawToolsTarget} title="Delete nearest drawn link">Del</button>
          </div>
          {drawToolsLinkStart && <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords">
              From {drawToolsLinkStart.lat.toFixed(6)}, {drawToolsLinkStart.lng.toFixed(6)}
            </span>
          </div>}
          <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords">{formatInteger(drawToolsLinkItems.length)} drawn links</span>
            <button className="iitc-iris-portal-action" type="button" onClick={() => undoDrawToolsItem('polyline')} disabled={drawToolsLinkItems.length === 0} title="Remove latest drawn link">Undo</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => copyDrawToolsItems('polyline')} disabled={drawToolsLinkItems.length === 0} title="Copy drawn links as IITC Draw Tools JSON">Copy</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => copyDrawToolsItems()} disabled={drawToolsItems.length === 0} title="Export all supported Draw Tools items as IITC JSON">Export</button>
            <button className={`iitc-iris-portal-action ${drawToolsClearConfirm === 'polyline' ? 'is-danger' : ''}`} type="button" onClick={() => clearDrawToolsItems('polyline')} disabled={drawToolsLinkItems.length === 0} title="Clear all drawn links">
              {drawToolsClearConfirm === 'polyline' ? 'Confirm' : 'Clear'}
            </button>
          </div>
          {drawToolsLinkItems.length > 0 && <div className="iitc-iris-draw-tools-list" aria-label="Drawn links">
            {drawToolsLinkItems.map((item, index) => (
              <div className="iitc-iris-draw-tools-list-item" key={`link-${item.storageIndex}`}>
                <span className="iitc-iris-draw-tools-list-label">
                  <b>{getDrawToolsItemLabel(item, index)}</b>
                  <small>{getDrawToolsItemDetail(item)}</small>
                </span>
                <span className="iitc-iris-draw-tools-list-actions">
                  <button className="iitc-iris-portal-action" type="button" onClick={() => centerDrawToolsItem(item)} title="Center this drawn link">Center</button>
                  <button className="iitc-iris-portal-action" type="button" onClick={() => deleteDrawToolsItem(item)} title="Delete this drawn link">Del</button>
                </span>
              </div>
            ))}
          </div>}
          <div className="iitc-iris-draw-tools-import">
            <span className="iitc-iris-draw-tools-interop">IITC Draw Tools JSON: links and markers</span>
            <textarea
              className="iitc-iris-draw-tools-import-input"
              value={drawToolsImportText}
              placeholder="Paste IITC Draw Tools JSON"
              rows={3}
              onInput={(event) => setDrawToolsImportText(event.currentTarget.value)}
            />
            <div className="iitc-iris-map-context-row">
              <label className="iitc-iris-draw-tools-import-merge">
                <input type="checkbox" checked={drawToolsImportMerge} onChange={(event) => setDrawToolsImportMerge(event.currentTarget.checked)} />
                Merge
              </label>
              <button className="iitc-iris-portal-action" type="button" onClick={importDrawToolsItems} disabled={!drawToolsImportText.trim()} title="Import supported links and markers">Import</button>
              {drawToolsImportStatus && <span className="iitc-iris-map-control-status">{drawToolsImportStatus}</span>}
            </div>
          </div>
        </div>}
        {activeSheet === 'drawMarkers' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Draw Markers</span>
          <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords">
              {drawToolsTarget?.label ?? 'Select a portal or open a context point'}
            </span>
            <span className="iitc-iris-draw-tools-marker-actions" aria-label="Add marker">
              {DRAW_TOOLS_MARKER_PRESETS.map((preset) => (
                <button
                  className="iitc-iris-draw-tools-marker-swatch"
                  key={preset.id}
                  type="button"
                  onClick={() => addDrawToolsMarker(preset.color)}
                  disabled={!drawToolsTarget}
                  style={{background: preset.color}}
                  title={preset.title}
                  aria-label={preset.title}
                />
              ))}
            </span>
          </div>
          <div className="iitc-iris-map-context-row">
            <span className="iitc-iris-map-context-coords">{formatInteger(drawToolsMarkerItems.length)} drawn markers</span>
            <button className="iitc-iris-portal-action" type="button" onClick={() => deleteDrawToolsAtContext('marker')} disabled={!drawToolsTarget} title="Delete nearest drawn marker">Del</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => undoDrawToolsItem('marker')} disabled={drawToolsMarkerItems.length === 0} title="Remove latest drawn marker">Undo</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => copyDrawToolsItems('marker')} disabled={drawToolsMarkerItems.length === 0} title="Copy drawn markers as IITC Draw Tools JSON">Copy</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => copyDrawToolsItems()} disabled={drawToolsItems.length === 0} title="Export all supported Draw Tools items as IITC JSON">Export</button>
            <button className={`iitc-iris-portal-action ${drawToolsClearConfirm === 'marker' ? 'is-danger' : ''}`} type="button" onClick={() => clearDrawToolsItems('marker')} disabled={drawToolsMarkerItems.length === 0} title="Clear all drawn markers">
              {drawToolsClearConfirm === 'marker' ? 'Confirm' : 'Clear'}
            </button>
          </div>
          {drawToolsMarkerItems.length > 0 && <div className="iitc-iris-draw-tools-list" aria-label="Drawn markers">
            {drawToolsMarkerItems.map((item, index) => (
              <div className="iitc-iris-draw-tools-list-item" key={`marker-${item.storageIndex}`}>
                <span className="iitc-iris-draw-tools-marker-dot" style={{background: item.color ?? DRAW_TOOLS_DEFAULT_COLOR}} />
                <span className="iitc-iris-draw-tools-list-label">
                  <b>{getDrawToolsItemLabel(item, index)}</b>
                  <small>{getDrawToolsItemDetail(item)}</small>
                </span>
                <span className="iitc-iris-draw-tools-list-actions">
                  <button className="iitc-iris-portal-action" type="button" onClick={() => centerDrawToolsItem(item)} title="Center this drawn marker">Center</button>
                  <button className="iitc-iris-portal-action" type="button" onClick={() => deleteDrawToolsItem(item)} title="Delete this drawn marker">Del</button>
                </span>
              </div>
            ))}
          </div>}
          <div className="iitc-iris-draw-tools-import">
            <span className="iitc-iris-draw-tools-interop">IITC Draw Tools JSON: links and markers</span>
            <textarea
              className="iitc-iris-draw-tools-import-input"
              value={drawToolsImportText}
              placeholder="Paste IITC Draw Tools JSON"
              rows={3}
              onInput={(event) => setDrawToolsImportText(event.currentTarget.value)}
            />
            <div className="iitc-iris-map-context-row">
              <label className="iitc-iris-draw-tools-import-merge">
                <input type="checkbox" checked={drawToolsImportMerge} onChange={(event) => setDrawToolsImportMerge(event.currentTarget.checked)} />
                Merge
              </label>
              <button className="iitc-iris-portal-action" type="button" onClick={importDrawToolsItems} disabled={!drawToolsImportText.trim()} title="Import supported links and markers">Import</button>
              {drawToolsImportStatus && <span className="iitc-iris-map-control-status">{drawToolsImportStatus}</span>}
            </div>
          </div>
        </div>}
        {activeSheet === 'portalCounts' && <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
          <span className="iitc-iris-status">Portal Counts</span>
          {portalAnalysis ? (
            <>
              <div className="iitc-iris-analysis-summary-grid">
                <span><b>{formatInteger(portalAnalysis.portalcounts.total)}</b><small>visible</small></span>
                <span><b>{formatInteger(portalAnalysis.portalcounts.real)}</b><small>real</small></span>
                <span><b>{formatInteger(portalAnalysis.portalcounts.placeholders)}</b><small>placeholders</small></span>
                <span><b>{formatInteger(portalAnalysis.portalcounts.withKeys)}</b><small>with keys</small></span>
              </div>
              <div className="iitc-iris-analysis-chip-row">
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalAnalysis.portalcounts.history.visited)}</b><small>Visited</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalAnalysis.portalcounts.history.captured)}</b><small>Captured</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalAnalysis.portalcounts.history.scoutControlled)}</b><small>Scout</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalAnalysis.portalcounts.missions)}</b><small>Missions</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalAnalysis.portalcounts.ornaments)}</b><small>Ornaments</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalAnalysis.portalcounts.artifacts)}</b><small>Artifacts</small></span>
              </div>
              {portalAnalysis.portalcounts.inaccurateAtLinkLevel && (
                <div className="iitc-iris-empty-state">Portal counts are approximate at link-level zoom.</div>
              )}
              <div className="iitc-iris-portal-counts-table-wrap">
                <table className="iitc-iris-portal-analysis-table iitc-iris-portal-counts-table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th className="iitc-iris-team-res">RES</th>
                      <th className="iitc-iris-team-enl">ENL</th>
                      <th className="iitc-iris-team-machina">MAC</th>
                      <th className="iitc-iris-team-neutral">Neutral</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...portalAnalysis.portalcounts.levels].reverse().map((level) => (
                      <tr key={level.level} className={level.count === 0 ? 'is-muted' : ''}>
                        <td className={`iitc-iris-level-cell iitc-iris-level-${level.level}`}>{level.level === 0 ? 'P' : `L${level.level}`}</td>
                        <td className="iitc-iris-team-res">{formatInteger(level.teams.R)}</td>
                        <td className="iitc-iris-team-enl">{formatInteger(level.teams.E)}</td>
                        <td className="iitc-iris-team-machina">{formatInteger(level.teams.M)}</td>
                        <td className="iitc-iris-team-neutral">{formatInteger(level.teams.N)}</td>
                        <td>{formatInteger(level.count)}</td>
                      </tr>
                    ))}
                    <tr>
                      <th>Total</th>
                      <th className="iitc-iris-team-res">{formatInteger(portalAnalysis.portalcounts.teams.R)}</th>
                      <th className="iitc-iris-team-enl">{formatInteger(portalAnalysis.portalcounts.teams.E)}</th>
                      <th className="iitc-iris-team-machina">{formatInteger(portalAnalysis.portalcounts.teams.M)}</th>
                      <th className="iitc-iris-team-neutral">{formatInteger(portalAnalysis.portalcounts.teams.N)}</th>
                      <th>{formatInteger(portalAnalysis.portalcounts.total)}</th>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="iitc-iris-counts-visuals" aria-label="Portal counts graph">
                <svg viewBox={`0 0 ${PORTAL_COUNTS_SVG_WIDTH} ${PORTAL_COUNTS_SVG_HEIGHT}`} role="img">
                  <title>Portal counts by level and faction</title>
                  {portalCountsBars.map((bar, index) => {
                    const total = bar.levels.reduce((sum, count) => sum + count, 0);
                    return (
                      <g key={bar.id} transform={`translate(${index * (PORTAL_COUNTS_BAR_WIDTH + PORTAL_COUNTS_BAR_PADDING)} 0)`}>
                        <text className="iitc-iris-counts-bar-team" fill={bar.color} x={PORTAL_COUNTS_BAR_WIDTH / 2} y={PORTAL_COUNTS_BAR_TOP * 0.75}>{bar.label}</text>
                        {bar.segments.map((segment) => (
                          <rect
                            key={segment.level}
                            fill={getPortalCountsLevelColor(segment.level)}
                            height={segment.height}
                            width={PORTAL_COUNTS_BAR_WIDTH}
                            x="0"
                            y={segment.y + PORTAL_COUNTS_BAR_TOP}
                          />
                        ))}
                        <text className="iitc-iris-counts-bar-value" x={PORTAL_COUNTS_BAR_WIDTH / 2} y={PORTAL_COUNTS_SVG_HEIGHT - 4}>{formatInteger(total)}</text>
                      </g>
                    );
                  })}
                  <g transform={`translate(${PORTAL_COUNTS_PIE_CENTER_X} ${PORTAL_COUNTS_PIE_CENTER_Y})`}>
                    <circle className="iitc-iris-counts-pie-track" cx="0" cy="0" r={PORTAL_COUNTS_RADIUS_OUTER} />
                    {portalCountsPieSegments.map((segment) => (
                      <path
                        key={segment.team}
                        className="iitc-iris-counts-pie-slice"
                        d={segment.path}
                        fill={getTeamColor(segment.team)}
                      />
                    ))}
                    {portalCountsLevelRingSegments.map((segment) => (
                      <path
                        key={`${segment.team}-${segment.level}`}
                        className="iitc-iris-counts-level-ring"
                        d={segment.path}
                        fill={getPortalCountsLevelColor(segment.level)}
                      />
                    ))}
                    {portalCountsPieSegments.map((segment) => (
                      <text
                        key={`${segment.team}-label`}
                        className="iitc-iris-counts-pie-percent"
                        x={segment.labelX}
                        y={segment.labelY}
                      >
                        {segment.label}
                      </text>
                    ))}
                  </g>
                </svg>
              </div>
            </>
          ) : (
            <div className="iitc-iris-empty-state">No portal count data for the current view.</div>
          )}
        </div>}
        {activeSheet === 'portalsList' && <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
          <span className="iitc-iris-status">Portals List</span>
          {portalAnalysis ? (
            <>
              <div className="iitc-iris-portals-list-summary" aria-label="Filtered portal list summary">
                {([
                  ['R', 'Resistance', portalsListSummary.teams.R],
                  ['E', 'Enlightened', portalsListSummary.teams.E],
                  ['M', 'MACHINA', portalsListSummary.teams.M],
                  ['N', 'Neutral', portalsListSummary.teams.N],
                ] as const).map(([team, label, count]) => (
                  <div className={`iitc-iris-portals-list-summary-item ${formatTeamClass(team)}`} key={team}>
                    <b>{formatInteger(count)} ({formatPortalAnalysisPercent(count, portalsListSummary.portals)})</b>
                    <small>{label}</small>
                  </div>
                ))}
                {([
                  ['Visited', portalsListSummary.history.visited],
                  ['Captured', portalsListSummary.history.captured],
                  ['Scout Controlled', portalsListSummary.history.scoutControlled],
                ] as const).map(([label, count]) => (
                  <div className="iitc-iris-portals-list-summary-item" key={label}>
                    <b>{formatInteger(count)} ({formatPortalAnalysisPercent(count, portalsListSummary.portals)})</b>
                    <small>{label}</small>
                  </div>
                ))}
              </div>
              <div className="iitc-iris-analysis-chip-row">
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.portals)}</b><small>Portals</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.links)}</b><small>Links</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.fields)}</b><small>Fields</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.enemyAp)}</b><small>AP</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.keys)}</b><small>Keys</small></span>
                <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{portalsListSortOrder === 1 ? 'Asc' : 'Desc'}</b><small>Sort {portalsListSortBy}</small></span>
              </div>
              <div className="iitc-iris-portals-list-filters">
                <input
                  aria-label="Filter portal list by name"
                  className="iitc-iris-portals-list-search"
                  placeholder="Filter portals"
                  type="search"
                  value={portalsListTextFilter}
                  onInput={(event) => setPortalsListTextFilter(event.currentTarget.value)}
                />
                <select aria-label="Filter portal list by faction" value={portalsListTeamFilter} onChange={(event) => setPortalsListTeamFilter(event.currentTarget.value as PortalsListTeamFilter)}>
                  <option value="all">All factions</option>
                  <option value="R">Resistance</option>
                  <option value="E">Enlightened</option>
                  <option value="M">Machina</option>
                  <option value="N">Neutral</option>
                </select>
                <select aria-label="Filter portal list by level" value={portalsListLevelFilter} onChange={(event) => setPortalsListLevelFilter(event.currentTarget.value as PortalsListLevelFilter)}>
                  <option value="all">All levels</option>
                  <option value="0">Level 0 / Neutral</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                  <option value="6">Level 6</option>
                  <option value="7">Level 7</option>
                  <option value="8">Level 8</option>
                </select>
                <button
                  className="iitc-iris-portal-action"
                  type="button"
                  onClick={() => {
                    setPortalsListTextFilter('');
                    setPortalsListTeamFilter('all');
                    setPortalsListLevelFilter('all');
                  }}
                  disabled={portalsListTextFilter === '' && portalsListTeamFilter === 'all' && portalsListLevelFilter === 'all'}
                  title="Reset portal list filters"
                >
                  Reset
                </button>
              </div>
              {sortedPortalsList.length > 0 ? (
                <div className="iitc-iris-portals-list-table-wrap">
                  <table className="iitc-iris-portal-analysis-table iitc-iris-portals-list-table">
                    <thead>
                      <tr>
                        {([
                          ['title', 'Portal Name'],
                          ['level', 'Level'],
                          ['team', 'Team'],
                          ['health', 'Health'],
                          ['resCount', 'Res'],
                          ['links', 'Links'],
                          ['fields', 'Fields'],
                          ['enemyAp', 'AP'],
                          ['keys', 'Keys'],
                        ] as const).map(([field, label]) => (
                          <th key={field}>
                            <button className="iitc-iris-table-sort" type="button" onClick={() => sortPortalsListBy(field)}>
                              {label}{portalsListSortBy === field ? portalsListSortOrder === 1 ? ' ^' : ' v' : ''}
                            </button>
                          </th>
                        ))}
                        <th>V/C</th>
                        <th>S</th>
                        <th>M</th>
                        <th>Go</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sortedPortalsList.map((portal) => (
                        <tr key={portal.guid} className={formatTeamClass(portal.team)}>
                          <td className="iitc-iris-portal-list-title">
                            <button type="button" onClick={() => zoomToAndShowPortal(portal.guid, portal.latE6, portal.lngE6, camera.zoom)} onDblClick={() => zoomToAndShowPortal(portal.guid, portal.latE6, portal.lngE6)}>
                              {portal.title}
                            </button>
                          </td>
                          <td className={`iitc-iris-level-cell iitc-iris-level-${portal.level}`}>L{portal.level}</td>
                          <td><span className={`iitc-iris-team-pill ${formatTeamClass(portal.team)}`}>{formatTeamShortLabel(portal.team)}</span></td>
                          <td>{portal.health === null ? '-' : `${Math.round(portal.health)}%`}</td>
                          <td>{formatInteger(portal.resCount)}</td>
                          <td title={`In: ${portal.links.in}\nOut: ${portal.links.out}`}>{formatInteger(portal.links.count)}</td>
                          <td>{formatInteger(portal.fields)}</td>
                          <td title={`Destroy AP: ${portal.ap.destroyAp}\nCapture AP: ${portal.ap.captureAp}`}>{formatInteger(portal.ap.enemyAp)}</td>
                          <td>{portal.keyCount === undefined ? '-' : formatInteger(portal.keyCount)}</td>
                          <td>{formatPortalHistory(portal)}</td>
                          <td>{formatScoutControlled(portal)}</td>
                          <td>{formatPortalMission(portal)}</td>
                          <td>
                            <button className="iitc-iris-table-action" type="button" onClick={() => zoomToAndShowPortal(portal.guid, portal.latE6, portal.lngE6)} title="Zoom to and select portal">Zoom</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="iitc-iris-empty-state">No portals match the current filters.</div>
              )}
            </>
          ) : (
            <div className="iitc-iris-empty-state">Nothing to show.</div>
          )}
        </div>}
        {activeSheet === 'scoreboard' && <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
          <span className="iitc-iris-status">Scoreboard</span>
          {portalAnalysis ? (
            <div className="iitc-iris-portal-counts-table-wrap">
              <table className="iitc-iris-portal-analysis-table iitc-iris-scoreboard-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="iitc-iris-scoreboard-column iitc-iris-team-res">RES</th>
                    <th className="iitc-iris-scoreboard-column iitc-iris-team-enl">ENL</th>
                    <th className="iitc-iris-scoreboard-column iitc-iris-team-machina">MAC</th>
                  </tr>
                </thead>
                <tbody>
                  {SCOREBOARD_ROWS.map(({label, format}) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {PORTAL_ANALYSIS_PLAYER_TEAMS.map((team) => (
                        <td className={`iitc-iris-scoreboard-column ${formatTeamClass(team)}`} key={team} title={getScoreboardTeamLabel(team)}>
                          {format(portalAnalysis.scoreboard.teams[team])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="iitc-iris-empty-state">Nothing to show.</div>
          )}
        </div>}
        {activeSheet === 'layers' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Base map</span>
          <div className="iitc-iris-map-control-row">
            {BASE_LAYER_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`iitc-iris-layer-toggle iitc-iris-base-toggle ${baseLayerId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => setBaseLayerId(option.id)}
                title={option.title}
                aria-pressed={baseLayerId === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>}
        {activeSheet === 'layers' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Core overlays</span>
          <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Core overlay layers">
            {CORE_OVERLAY_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
          </div>
        </div>}
        {activeSheet === 'layers' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Portal filters</span>
          <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Portal filter layers">
            {PORTAL_FILTER_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
          </div>
        </div>}
        {activeSheet === 'layers' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Portal highlighter</span>
          <div className="iitc-iris-layer-choice-grid" role="radiogroup" aria-label="Portal highlighter">
            {PORTAL_HIGHLIGHTER_OPTIONS.map(renderHighlighterRadio)}
          </div>
        </div>}
        {activeSheet === 'layers' && <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Detail overlays</span>
          <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Detail overlay layers">
            {DETAIL_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
          </div>
        </div>}
      </aside>
      {activeSheet === 'system' && (
        <aside className="iitc-iris-system-panel" aria-label="System controls">
          <div className="iitc-iris-panel-topbar">
            <span className="iitc-iris-selected-title">System</span>
            <span className="iitc-iris-panel-header-actions">
              <span className="iitc-iris-status">UI and diagnostics</span>
            </span>
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Status</span>
            <div id="iitc-iris-innerstatus" className="iitc-iris-innerstatus">
              <span className="help portallevel" title="Indicates portal levels/link lengths displayed. Zoom in to display more.">{innerStatus.portalText}</span>
              <span className="map">
                <b>map</b>:{' '}
                <span className="help" title={innerStatus.mapTitle}>{innerStatus.mapText}</span>
                {innerStatus.progressPercent !== null && ` ${innerStatus.progressPercent}%`}
              </span>
              {innerStatus.activeRequests > 0 && (
                <span title={Object.entries(requestDiagnostics.activeByEndpoint).map(([endpoint, count]) => `${endpoint}: ${count}`).join('\n')}>
                  {innerStatus.activeRequests} requests
                </span>
              )}
              {innerStatus.failedRequests > 0 && <span className="failed-request">{innerStatus.failedRequests} failed</span>}
              {entityFetch.selectedPortal && (
                <>
                  <span className="selected-portal" title={entityFetch.selectedPortal.guid}>
                    selected {formatSelectedPortal(entityFetch.selectedPortal)}
                  </span>
                  <button className="iitc-iris-clear-selection" type="button" onClick={clearPortalSelection} title="Clear selected portal" aria-label="Clear selected portal">X</button>
                </>
              )}
              {entityFetch.collision && <span className="failed-request">old IRIS active</span>}
              {entityFetch.authRequired && (
                <button className="iitc-iris-login iitc-iris-innerstatus-login" type="button" onClick={openIntelLogin} title="Open Intel login">
                  Intel Login
                </button>
              )}
            </div>
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Interaction</span>
            <div className="iitc-iris-map-control-row">
              <button
                className={`iitc-iris-layer-toggle ${shortcutsEnabled ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => setShortcutsEnabled((current) => !current)}
                title="Enable plain keyboard shortcuts when focus is not in a text field"
                aria-pressed={shortcutsEnabled}
              >
                Shortcuts
              </button>
              <button
                className={`iitc-iris-layer-toggle ${mapFocusMode ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => setMapFocusMode((current) => !current)}
                title="Auto-close panels after navigation actions that move the map"
                aria-pressed={mapFocusMode}
              >
                Map Focus
              </button>
              <span className="iitc-iris-status">{shortcutsEnabled ? 'keys on' : 'keys off'}</span>
              <span className="iitc-iris-status">{mapFocusMode ? 'auto close' : 'stay open'}</span>
            </div>
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Debug display</span>
            <div className="iitc-iris-map-control-row">
              <button
                className={`iitc-iris-layer-toggle iitc-iris-system-toggle ${debugDockVisible ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={toggleDebugDock}
                title="Show or hide debug diagnostic rows"
                aria-pressed={debugDockVisible}
              >
                Debug
              </button>
            </div>
          </div>
          {debugDockVisible && <div className="iitc-iris-map-controls-section iitc-iris-system-debug">
            <span className="iitc-iris-status">Map diagnostics</span>
            <div className="iitc-iris-dock-row iitc-iris-debug-row">
              <span className="iitc-iris-status">{status}</span>
              <span className="iitc-iris-status">z {camera.zoom.toFixed(2)}</span>
              <span className="iitc-iris-status">data z {plan?.dataZoom ?? '-'}</span>
              <span className="iitc-iris-status">mode {summaryMode}</span>
              <span className="iitc-iris-status">detail {detailOverlaysActive ? 'on' : 'off'}</span>
              <span className="iitc-iris-status">tiles {plan?.tiles.length ?? '-'}</span>
              <span className="iitc-iris-status">x {plan ? `${plan.xRange[0]}-${plan.xRange[1]}` : '-'}</span>
              <span className="iitc-iris-status">y {plan ? `${plan.yRange[0]}-${plan.yRange[1]}` : '-'}</span>
              <span className="iitc-iris-status">batch {requestBatches[0] ?? 0}</span>
              {entityFetch.collision && <span className="iitc-iris-status iitc-iris-warning">old IRIS active</span>}
              {entityFetch.authRequired && (
                <button className="iitc-iris-login" type="button" onClick={openIntelLogin} title="Open Intel login">
                  Intel Login
                </button>
              )}
            </div>
            <div className="iitc-iris-dock-row iitc-iris-debug-row">
              <span className="iitc-iris-status">{entityFetch.status}</span>
              <span className="iitc-iris-status">src {entityFetch.entitySource}</span>
              <span className="iitc-iris-status">p {entityFetch.portals}</span>
              <span className="iitc-iris-status">real {entityFetch.realPortals}</span>
              <span className="iitc-iris-status">ph {entityFetch.placeholderPortals}</span>
              <span className="iitc-iris-status">orn {entityFetch.ornamentPortals}</span>
              <span className="iitc-iris-status">ornDraw {entityFetch.drawnOrnamentMarkers}</span>
              <span className="iitc-iris-status">ornHide {entityFetch.hiddenOrnamentMarkers}</span>
              <span className="iitc-iris-status">art {entityFetch.artifactPortals}</span>
              <span className="iitc-iris-status">artDraw {entityFetch.drawnArtifactMarkers}</span>
              <span className="iitc-iris-status">artFetch {entityFetch.artifactFetchStatus}:{entityFetch.artifactFetchPortalCount}</span>
              <span className="iitc-iris-status">lvl {entityFetch.levelLabels}</span>
              <span className="iitc-iris-status">dmg {entityFetch.damagedPortals}</span>
              <span className="iitc-iris-status">l {entityFetch.links}</span>
              <span className="iitc-iris-status">f {entityFetch.fields}</span>
              <span className="iitc-iris-status iitc-iris-compare" title={entityFetch.renderMutation ? JSON.stringify(entityFetch.renderMutation) : undefined}>
                {formatRenderMutationSummary(entityFetch.renderMutation)}
              </span>
              <span className="iitc-iris-status iitc-iris-compare">compare vp P/L/F {entityFetch.viewportPortals}/{entityFetch.viewportLinks}/{entityFetch.viewportFields}</span>
              <span className="iitc-iris-status">rt {entityFetch.returnedTiles}/{entityFetch.requestedTiles}</span>
              <span className="iitc-iris-status">nt {entityFetch.nonEmptyTiles}</span>
              {entityFetch.elapsedMs !== null && <span className="iitc-iris-status">in {formatElapsedSeconds(entityFetch.elapsedMs)}s</span>}
              {entityFetch.timing?.initialMs !== undefined && <span className="iitc-iris-status">init {formatElapsedSeconds(entityFetch.timing.initialMs)}s</span>}
              {entityFetch.timing?.retryMs !== undefined && <span className="iitc-iris-status">retryT {formatElapsedSeconds(entityFetch.timing.retryMs)}s</span>}
              {entityFetch.retryRequests > 0 && <span className="iitc-iris-status">retry {entityFetch.retryRequests}</span>}
              {entityFetch.playerTracker && <span className="iitc-iris-status">pt {entityFetch.playerTracker.players}/{entityFetch.playerTracker.events}</span>}
              {entityFetch.selectedPortal && (
                <>
                  <span className="iitc-iris-status iitc-iris-compare">sel {formatSelectedPortal(entityFetch.selectedPortal)}</span>
                  <button className="iitc-iris-preset" type="button" onClick={clearPortalSelection} title="Clear selected portal">Clear Sel</button>
                </>
              )}
            </div>
          </div>}
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Copy/export</span>
            <div className="iitc-iris-map-control-row">
              <button className="iitc-iris-portal-action" type="button" onClick={copyDockText} title="Copy JSON diagnostics">JSON</button>
              <button className="iitc-iris-portal-action" type="button" onClick={copyIntelUrl} title="Copy current view as an Intel URL">URL</button>
              {copyStatus && <span className="iitc-iris-status">{copyStatus}</span>}
            </div>
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Presets</span>
            <div className="iitc-iris-map-control-row">
              {VIEW_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="iitc-iris-preset"
                  type="button"
                  onClick={() => jumpToPreset(preset)}
                  title={`${preset.label} ${preset.lat.toFixed(6)},${preset.lng.toFixed(6)}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <form
              className="iitc-iris-jump"
              onSubmit={(event) => {
                event.preventDefault();
                jumpToViewInput();
              }}
            >
              <input
                className="iitc-iris-jump-input"
                type="text"
                value={viewInput}
                onInput={(event) => setViewInput((event.currentTarget as HTMLInputElement).value)}
                placeholder="lat,lng,z or Intel URL"
                title="Paste lat,lng,z or an Intel URL with ll, pll, and optional z"
              />
              <button className="iitc-iris-preset" type="submit">Jump</button>
              {viewInputStatus && <span className="iitc-iris-status">{viewInputStatus}</span>}
            </form>
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Lifecycle</span>
            <div className="iitc-iris-map-control-row">
              <button
                className={`iitc-iris-layer-toggle iitc-iris-system-toggle ${lifecycleSettings.iitcMovementDelay ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => setLifecycleSettings((current) => ({...current, iitcMovementDelay: !current.iitcMovementDelay}))}
                title="Compare current fast refresh with IITC-style map movement and download timing"
                aria-pressed={lifecycleSettings.iitcMovementDelay}
              >
                IITC Delay
              </button>
              <span className="iitc-iris-status">{lifecycleSettings.iitcMovementDelay ? 'IITC timing' : 'fast move'}</span>
            </div>
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Scenarios</span>
            <div className="iitc-iris-map-control-row">
              <button
                className="iitc-iris-preset"
                type="button"
                disabled={activeScenarioRun !== null}
                onClick={() => startScenarioRun('fast-pan', {iitcMovementDelay: false})}
                title="Start a fast-refresh scenario and capture the previous state"
              >
                Start Fast
              </button>
              <button
                className="iitc-iris-preset"
                type="button"
                disabled={activeScenarioRun !== null}
                onClick={() => startScenarioRun('iitc-delay-pan', {iitcMovementDelay: true})}
                title="Start an IITC-delay scenario and capture the previous state"
              >
                Start Delay
              </button>
              <button
                className="iitc-iris-preset"
                type="button"
                disabled={!canPan || activeScenarioRun === null}
                onClick={panScenarioSouth}
                title="Capture the current diagnostics before panning south, then pan south"
              >
                Snap Before Pan S
              </button>
              <button className="iitc-iris-preset" type="button" disabled={activeScenarioRun === null} onClick={() => captureScenarioSnapshot('reload')} title="Capture the current diagnostics after the selected scenario mode has refreshed">Snap Reload</button>
              <button className="iitc-iris-preset" type="button" disabled={activeScenarioRun === null} onClick={() => captureScenarioSnapshot('in-progress')} title="Capture the current diagnostics as the in-progress point">Snap Prog</button>
              <button className="iitc-iris-preset" type="button" disabled={activeScenarioRun === null} onClick={finishScenarioRun} title="Capture the final diagnostics and finish the active scenario run">Snap Done</button>
              <button className="iitc-iris-portal-action" type="button" onClick={copyScenarioRun} title="Copy all scenario runs as JSON">Copy Runs</button>
              <button className="iitc-iris-preset" type="button" onClick={clearScenarioRuns}>Clear</button>
              {activeScenarioRun
                ? <span className="iitc-iris-status iitc-iris-panel-state is-loading">{activeScenarioRun.name}: running</span>
                : latestScenarioRun
                  ? <span className="iitc-iris-status iitc-iris-panel-state is-ready">{scenarioRuns.length} runs, {scenarioSnapCount} snaps</span>
                  : <span className="iitc-iris-status">no run</span>}
              {scenarioStatus && <span className="iitc-iris-status">{scenarioStatus}</span>}
            </div>
            {scenarioProgressRun && (
              <div className="iitc-iris-scenario-progress" title={`${scenarioProgressRun.name} ${scenarioProgressRun.status}`}>
                {scenarioExpectedSteps.map((label) => {
                  const doneLabel = label === 'done'
                    ? scenarioProgressLabels.has('done') || scenarioProgressLabels.has('done-active')
                    : scenarioProgressLabels.has(label);
                  return (
                    <span className={doneLabel ? 'is-done' : ''} key={label}>
                      {label === 'before-pan-south' ? 'pan-south' : label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="iitc-iris-map-controls-section">
            <span className="iitc-iris-status">Data source</span>
            <div className="iitc-iris-map-control-row">
              {DATA_SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`iitc-iris-layer-toggle iitc-iris-source-toggle ${dataSourceId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
                  type="button"
                  onClick={() => setDataSource(option.id)}
                  title={option.title}
                  aria-pressed={dataSourceId === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
      <nav className="iitc-iris-sheet-tabbar" aria-label="Panels">
        <div className="iitc-iris-sheet-tabbar-primary">
          <button
            className={`iitc-iris-sheet-tab ${activePrimaryMenu === 'selected' ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePrimaryMenu('selected')}
            disabled={!hasSelectedObject}
            aria-pressed={activePrimaryMenu === 'selected'}
            title={`${selectedPrimaryLabel} menu (P)`}
          >
            {selectedPrimaryLabel}
          </button>
          <button
            className={`iitc-iris-sheet-tab ${activePrimaryMenu === 'map' ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePrimaryMenu('map')}
            aria-pressed={activePrimaryMenu === 'map'}
            title="Map menu (M)"
          >
            Map
          </button>
          <button
            className={`iitc-iris-sheet-tab ${activePrimaryMenu === 'agent' ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePrimaryMenu('agent')}
            aria-pressed={activePrimaryMenu === 'agent'}
            title="Agent menu (A)"
          >
            Agent
          </button>
          <button
            className={`iitc-iris-sheet-tab ${activePrimaryMenu === 'comm' ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePrimaryMenu('comm')}
            aria-pressed={activePrimaryMenu === 'comm'}
            title="COMM menu (C)"
          >
            COMM
          </button>
          <button
            className={`iitc-iris-sheet-tab ${activePrimaryMenu === 'system' ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePrimaryMenu('system')}
            aria-pressed={activePrimaryMenu === 'system'}
            title="System menu (S)"
          >
            System
          </button>
        </div>
        <div className="iitc-iris-sheet-tabbar-secondary">
          {activePrimaryMenu === 'map' && (
            <>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'search' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('search')} aria-pressed={activeSheet === 'search'}>Search</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'layers' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('layers')} aria-pressed={activeSheet === 'layers'}>Display</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'view' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('view')} aria-pressed={activeSheet === 'view'}>Controls</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'missions' && missionsState.source !== 'portal' ? 'is-active' : ''}`} type="button" onClick={() => toggleMissionsSheet('view')} aria-pressed={activeSheet === 'missions' && missionsState.source !== 'portal'}>Missions</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'scores' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('scores')} aria-pressed={activeSheet === 'scores'}>Scores</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'portalCounts' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('portalCounts')} aria-pressed={activeSheet === 'portalCounts'}>Counts</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'portalsList' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('portalsList')} aria-pressed={activeSheet === 'portalsList'}>List</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'scoreboard' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('scoreboard')} aria-pressed={activeSheet === 'scoreboard'}>Scoreboard</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'drawLinks' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('drawLinks')} aria-pressed={activeSheet === 'drawLinks'}>Links</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'drawMarkers' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('drawMarkers')} aria-pressed={activeSheet === 'drawMarkers'}>Markers</button>
            </>
          )}
          {activePrimaryMenu === 'selected' && (
            <>
              {selectedKind === 'portal' && <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'portal' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('portal')} aria-pressed={activeSheet === 'portal'}>Details</button>}
              {selectedKind === 'link' && <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'selectedLink' ? 'is-active' : ''}`} type="button" onClick={() => openSheet('selectedLink')} aria-pressed={activeSheet === 'selectedLink'}>Details</button>}
              {selectedKind === 'field' && <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'selectedField' ? 'is-active' : ''}`} type="button" onClick={() => openSheet('selectedField')} aria-pressed={activeSheet === 'selectedField'}>Details</button>}
              {selectedKind === 'portal' && <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'missions' && missionsState.source === 'portal' ? 'is-active' : ''}`} type="button" onClick={() => toggleMissionsSheet('portal')} aria-pressed={activeSheet === 'missions' && missionsState.source === 'portal'}>Missions</button>}
            </>
          )}
          {activePrimaryMenu === 'agent' && (
            <>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'agent' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('agent')} aria-pressed={activeSheet === 'agent'}>Profile</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'inventory' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('inventory')} aria-pressed={activeSheet === 'inventory'}>Inventory</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'passcode' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('passcode')} aria-pressed={activeSheet === 'passcode'}>Passcode</button>
            </>
          )}
          {activePrimaryMenu === 'comm' && (
            <>
              {COMM_TABS.map((tab) => (
                <button
                  className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'comm' && commState.tab === tab.id ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => selectCommTab(tab.id)}
                  disabled={commState.status === 'loading' && commState.tab === tab.id}
                  aria-pressed={activeSheet === 'comm' && commState.tab === tab.id}
                  key={tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </>
          )}
          {activePrimaryMenu === 'system' && (
            <>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'system' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('system')} aria-pressed={activeSheet === 'system'}>Diagnostics</button>
              <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'help' ? 'is-active' : ''}`} type="button" onClick={() => toggleSheet('help')} aria-pressed={activeSheet === 'help'}>Shortcuts</button>
            </>
          )}
        </div>
      </nav>
      {showPortalSidePanel && entityFetch.selectedPortal && (
        <aside className={`iitc-iris-portal-side-panel ${formatTeamClass(entityFetch.selectedPortal.team)} ${activeSidePanel ? 'iitc-iris-portal-side-panel-stacked' : ''}`} aria-label="Selected portal details">
          <div className="iitc-iris-portal-side-header">
            {entityFetch.selectedPortal.image ? (
              <button className="iitc-iris-selected-image-button" type="button" onClick={() => setPortalImageOpen(true)} title="Open portal image preview">
                <img
                  className="iitc-iris-selected-image"
                  src={entityFetch.selectedPortal.image}
                  alt=""
                />
              </button>
            ) : (
              <span className="iitc-iris-selected-image-placeholder" title="No portal image">No image</span>
            )}
            <div className="iitc-iris-portal-side-title">
              <span className="iitc-iris-selected-title-row">
                <span className="iitc-iris-selected-title" title={entityFetch.selectedPortal.guid}>
                  {entityFetch.selectedPortal.title || entityFetch.selectedPortal.guid}
                </span>
                <span className={`iitc-iris-status iitc-iris-panel-state ${getPanelStatusClass(selectedPortalDetailsStatus)}`}>
                  {selectedPortalDetailsStatus}
                </span>
              </span>
              {selectedPortalDetails?.owner && (
                <span className="iitc-iris-portal-owner-prominent" title={`Owner: ${selectedPortalDetails.owner}`}>
                  <small>owner</small>
                  <b className={getCommTeamClass(entityFetch.selectedPortal.team)}>{selectedPortalDetails.owner}</b>
                </span>
              )}
            </div>
            <span className="iitc-iris-panel-header-actions">
              <button className="iitc-iris-clear-selection" type="button" onClick={closeSheetToMap} title="Close portal details" aria-label="Close portal details">X</button>
            </span>
          </div>
          <div className="iitc-iris-portal-scroll-body">
          <div className="iitc-iris-portal-actions" aria-label="Selected portal actions">
            <button className="iitc-iris-portal-action" type="button" onClick={focusSelectedPortal} title="Center and zoom to this portal">Zoom</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copySelectedPortalTitle} title="Copy portal title">Title</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copySelectedPortalLink} title="Copy Intel portal link">Link</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copySelectedPortalGuid} title="Copy portal GUID">GUID</button>
            {selectedPortalHasMissions && (
              <button className="iitc-iris-portal-action" type="button" onClick={openSelectedPortalMissions} title="Fetch missions starting at this portal">Missions</button>
            )}
          </div>
          <div className="iitc-iris-portal-summary">
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">level</span>
              <b
                className="iitc-iris-portal-level-value"
                style={formatIitcColorVars(getIitcLevelColor(entityFetch.selectedPortal.level))}
              >
                {entityFetch.selectedPortal.isPlaceholder || entityFetch.selectedPortal.level === undefined ? '-' : `L${entityFetch.selectedPortal.level}`}
              </b>
            </span>
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">health</span>
              <b>{formatPortalHealth(entityFetch.selectedPortal)}</b>
              <span className="iitc-iris-summary-mini-track" aria-hidden="true">
                <span style={`width: ${formatPortalHealthPercent(entityFetch.selectedPortal)}%;`} />
              </span>
            </span>
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">res</span>
              <b>{entityFetch.selectedPortal.resCount !== undefined ? `${entityFetch.selectedPortal.resCount}/8` : '-'}</b>
            </span>
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">links</span>
              <b>{entityFetch.selectedPortal.links.count}</b>
            </span>
          </div>
          <div className="iitc-iris-health-track" title={`Portal health ${formatPortalHealth(entityFetch.selectedPortal)}`}>
            <span className="iitc-iris-health-fill" style={`width: ${formatPortalHealthPercent(entityFetch.selectedPortal)}%;`} />
          </div>
          <div className="iitc-iris-portal-panel">
            <div className="iitc-iris-portal-panel-header">
              <span className="iitc-iris-status">details</span>
              <span className="iitc-iris-panel-header-actions">
                {selectedPortalDetails?.error && (
                  <span className="iitc-iris-status iitc-iris-warning" title={selectedPortalDetails.error}>
                    {getAuthErrorMessage(selectedPortalDetails.status, selectedPortalDetails.error)}
                  </span>
                )}
                {selectedPortalDetailsStatus === 'auth' && (
                  inlineAuthActions
                )}
              </span>
            </div>
            {selectedPortalDetailsStatus !== 'ready' && (
              <div className="iitc-iris-empty-state">
                {selectedPortalDetailsStatus === 'loading' ? 'Fetching portal details...' : 'Waiting for portal details.'}
              </div>
            )}
            {selectedPortalDetails?.status === 'ready' && (
              <>
                <details className="iitc-iris-portal-section" open={portalSections.mods} onToggle={(event) => setPortalSectionOpen('mods', event.currentTarget.open)}>
                  <summary className="iitc-iris-section-summary">Mods</summary>
                  <div className="iitc-iris-mod-grid">
                    {Array.from({ length: 4 }, (_, index) => {
                      const mod = entityFetch.portalDetails?.mods?.[index];
                      const modStats = mod ? formatModStats(mod.stats) : '';
                      return (
                        <div
                          className={`iitc-iris-mod-slot ${mod ? '' : 'iitc-iris-empty-slot'}`}
                          key={`mod-${index}`}
                          style={formatIitcColorVars(getIitcRarityColor(mod?.rarity))}
                        >
                          {mod ? (
                            <>
                              <span className="iitc-iris-portal-mod-name">{mod.rarity.replace(/_/g, ' ')} {formatModName(mod.name)}</span>
                              <span className={`iitc-iris-status iitc-iris-agent-name ${getCommTeamClass(entityFetch.selectedPortal?.team)}`}>{mod.owner}</span>
                              {modStats && <span className="iitc-iris-status">{modStats}</span>}
                            </>
                          ) : (
                            <span className="iitc-iris-status">empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="iitc-iris-portal-section" open={portalSections.resonators} onToggle={(event) => setPortalSectionOpen('resonators', event.currentTarget.open)}>
                  <summary className="iitc-iris-section-summary">Resonators</summary>
                  <div className="iitc-iris-resonator-grid">
                    {RESONATOR_PANEL_ORDER.map((resonatorIndex, panelIndex) => {
                      if (resonatorIndex === null) {
                        return (
                          <span className="iitc-iris-resonator-center" key="portal-center" title={entityFetch.selectedPortal?.title || entityFetch.selectedPortal?.guid || 'selected portal'}>
                            portal
                          </span>
                        );
                      }
                      const resonator = entityFetch.portalDetails?.resonators?.[resonatorIndex];
                      const resonatorHealth = resonator ? formatResonatorEnergyPercent(resonator.level, resonator.energy) : 0;
                      return (
                        <span
                          className={`iitc-iris-resonator-slot ${resonator ? '' : 'iitc-iris-empty-slot'}`}
                          key={`resonator-${panelIndex}`}
                          style={resonator ? `${formatIitcColorVars(getIitcLevelColor(resonator.level)) ?? ''}` : undefined}
                          title={resonator ? `${resonator.owner} ${resonator.energy} XM, ${resonatorHealth}% charged` : 'empty resonator slot'}
                        >
                          {resonator ? (
                            <>
                              <span className="iitc-iris-resonator-level">L{resonator.level}</span>
                              <span className="iitc-iris-resonator-energy">{formatResonatorEnergy(resonator.energy)}</span>
                              <span className={`iitc-iris-resonator-owner ${getCommTeamClass(entityFetch.selectedPortal?.team)}`}>{resonator.owner}</span>
                              <span className="iitc-iris-resonator-percent">{resonatorHealth}%</span>
                              <span className="iitc-iris-resonator-fill" style={`width: ${resonatorHealth}%;`} />
                            </>
                          ) : (
                            <span className="iitc-iris-status">empty</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </details>
                <details className="iitc-iris-portal-section" open={portalSections.facts} onToggle={(event) => setPortalSectionOpen('facts', event.currentTarget.open)}>
                  <summary className="iitc-iris-section-summary">Facts</summary>
                  <div className="iitc-iris-portal-panel-grid iitc-iris-portal-facts">
                    <span className="iitc-iris-status">owner</span>
                    <span className={`iitc-iris-agent-name ${getCommTeamClass(entityFetch.selectedPortal.team)}`}>{selectedPortalDetails.owner || '-'}</span>
                    <span className="iitc-iris-status">mitigation</span>
                    <span>
                      {selectedPortalDetails.mitigation
                        ? `${Math.round(selectedPortalDetails.mitigation.total)} total, ${Math.round(selectedPortalDetails.mitigation.shields)} shields, ${Math.round(selectedPortalDetails.mitigation.links)} links`
                        : '-'}
                    </span>
                    <span className="iitc-iris-status">history</span>
                    <span>
                      {selectedPortalDetails.history
                        ? [
                          selectedPortalDetails.history.captured ? 'captured' : 'not captured',
                          selectedPortalDetails.history.visited ? 'visited' : 'not visited',
                          selectedPortalDetails.history.scoutControlled ? 'scout controlled' : 'not scout controlled',
                        ].join(' / ')
                        : '-'}
                    </span>
                    <span className="iitc-iris-status">topology</span>
                    <span>
                      {entityFetch.selectedPortal.links.count} links ({entityFetch.selectedPortal.links.outgoing} out/{entityFetch.selectedPortal.links.incoming} in), {entityFetch.selectedPortal.fields.count} fields
                    </span>
                    <span className="iitc-iris-status">markers</span>
                    <span>
                      {entityFetch.selectedPortal.ornaments.length} ornaments, {entityFetch.selectedPortal.artifacts.length} artifacts
                      {(entityFetch.selectedPortal.mission || entityFetch.selectedPortal.mission50plus) && ', mission'}
                    </span>
                    <span className="iitc-iris-status">missions</span>
                    <div>
                      {selectedPortalHasMissions ? (
                        <div className="iitc-iris-portal-mission-enrichment">
                          <span>
                            <small>missions</small>
                            <b>{selectedPortalMissionSummary}</b>
                          </span>
                          <span className="iitc-iris-portal-mission-meta">
                            {selectedPortalMissionState
                              ? selectedPortalMissionState.cached
                                ? 'cached'
                                : selectedPortalMissionState.elapsedMs !== undefined
                                  ? `request ${formatElapsedSeconds(selectedPortalMissionState.elapsedMs)}s`
                                  : selectedPortalMissionState.status
                              : 'from portal details'}
                          </span>
                          <button className="iitc-iris-portal-action" type="button" onClick={openSelectedPortalMissions} disabled={selectedPortalMissionState?.status === 'loading'} title="Open missions starting at this portal">
                            {selectedPortalMissionState?.status === 'loading' ? 'Loading' : 'Open'}
                          </button>
                        </div>
                      ) : '-'}
                    </div>
                  </div>
                </details>
                <div className="iitc-iris-panel-footer">
                  <span
                    className="iitc-iris-diagnostics-chip"
                    title={[
                      'request: /r/getPortalDetails',
                      `guid: ${entityFetch.selectedPortal.guid}`,
                    ].join('\n')}
                  >
                    {selectedPortalDetails.cached ? 'cached' : selectedPortalDetails.elapsedMs !== undefined ? `request ${formatElapsedSeconds(selectedPortalDetails.elapsedMs)}s` : 'request'}
                  </span>
                </div>
              </>
            )}
          </div>
          </div>
        </aside>
      )}
      {portalImageOpen && entityFetch.selectedPortal?.image && (
        <div className="iitc-iris-image-preview-backdrop" role="dialog" aria-modal="true" aria-label="Portal image preview" onClick={() => setPortalImageOpen(false)}>
          <div className="iitc-iris-image-preview" onClick={(event) => event.stopPropagation()}>
            <div className="iitc-iris-request-panel-header">
              <span className="iitc-iris-selected-title">{entityFetch.selectedPortal.title || 'Portal image'}</span>
              <span className="iitc-iris-panel-header-actions">
                <button className="iitc-iris-clear-selection" type="button" onClick={() => setPortalImageOpen(false)} title="Close image preview" aria-label="Close image preview">X</button>
              </span>
            </div>
            <img src={entityFetch.selectedPortal.image} alt={entityFetch.selectedPortal.title || 'Portal image'} />
            <div className="iitc-iris-image-preview-caption">
              <b>{entityFetch.selectedPortal.title || 'Selected portal'}</b>
              <span>{entityFetch.selectedPortal.guid}</span>
            </div>
          </div>
        </div>
      )}
      {activeSheet === 'help' && (
        <aside className="iitc-iris-request-side-panel iitc-iris-help-panel" aria-label="Shortcuts">
          <div className="iitc-iris-request-panel-header">
            <span className="iitc-iris-selected-title">Shortcuts</span>
            <span className="iitc-iris-panel-header-actions">
              <button className="iitc-iris-clear-selection" type="button" onClick={closeSheets} title="Close shortcuts" aria-label="Close shortcuts">X</button>
            </span>
          </div>
          <div className="iitc-iris-request-panel-body">
            <div className="iitc-iris-shortcut-grid">
              <span>Pan map</span><b>Arrow keys</b>
              <span>Zoom map</span><b>+ / -</b>
              <span>Toggle Search</span><b>/</b>
              <span>Close sheets</span><b>Esc</b>
              <span>Toggle Map</span><b>M</b>
              <span>Toggle Portal</span><b>P</b>
              <span>Toggle Agent</span><b>A</b>
              <span>Toggle COMM</span><b>C</b>
              <span>Toggle System</span><b>S</b>
              <span>Toggle Shortcuts</span><b>?</b>
              <span>Keyboard setting</span><b>System / Interaction</b>
              <span>Search result</span><b>Up / Down / Enter</b>
              <span>Zoom result</span><b>Shift+Enter</b>
            </div>
          </div>
        </aside>
      )}
      {activeSidePanelOption && (
        <aside className="iitc-iris-request-side-panel" aria-label={`${activeSidePanelOption.title} panel`}>
          <div className="iitc-iris-request-panel-header">
            <span className="iitc-iris-selected-title">{activeSidePanelOption.label}</span>
            <span className="iitc-iris-panel-header-actions">
              <span className={`iitc-iris-status iitc-iris-panel-state ${getPanelStatusClass(activeSidePanelStatus)}`}>
                {activeSidePanelStatus}
              </span>
              {activePanelNeedsAuth && (
                inlineAuthActions
              )}
	            <button className="iitc-iris-clear-selection" type="button" onClick={closeSidePanel} title={`Close ${activeSidePanelOption.title}`} aria-label={`Close ${activeSidePanelOption.title}`}>X</button>
            </span>
	          </div>
	          {activeSidePanel === 'agent' && (
	            <div className="iitc-iris-request-panel-body">
	              {agentState.status === 'ready' ? (
	                <>
	                  <div className="iitc-iris-agent-card">
	                    <div className="iitc-iris-agent-level">
	                      <b className={getCommTeamClass(agentState.team)}>{agentState.level ?? '-'}</b>
	                      <span>
	                        <strong className={getCommTeamClass(agentState.team)}>{agentState.nickname}</strong>
	                        <small>{agentState.team === 'R' ? 'Resistance' : agentState.team === 'E' ? 'Enlightened' : 'Neutral'}</small>
	                      </span>
	                      <span
	                        className={`iitc-iris-core-badge ${getSubscriptionStatusClass(agentState.subscription)}`}
	                        title={[
	                          formatSubscriptionLabel(agentState.subscription),
	                          agentState.subscription?.elapsedMs !== undefined ? `request: ${formatElapsedSeconds(agentState.subscription.elapsedMs)}s` : 'request: pending',
	                        ].join('\n')}
	                      >
	                        {formatSubscriptionBadge(agentState.subscription)}
	                      </span>
	                    </div>
	                    <div className="iitc-iris-panel-summary">
	                      <span><b>{formatInteger(agentState.ap)}</b><small>AP</small></span>
	                      <span><b>{formatInteger(agentState.energy)} / {formatInteger(agentState.xmCapacity)}</b><small>XM</small></span>
	                      <span><b>{formatInteger(agentState.availableInvites)}</b><small>invites</small></span>
	                    </div>
	                    <div className="iitc-iris-agent-progress">
	                      <div>
	                        <span>XM</span>
	                        <b>{agentState.xmPercent ?? 0}%</b>
	                      </div>
	                      <div className="iitc-iris-agent-progress-track">
	                        <span style={`width: ${agentState.xmPercent ?? 0}%;`} />
	                      </div>
	                    </div>
	                    <div className="iitc-iris-agent-progress">
	                      <div>
	                        <span>Level</span>
	                        <b>{agentState.maxLevel ? 'max' : `${agentState.levelPercent ?? 0}%`}</b>
	                      </div>
	                      <div className="iitc-iris-agent-progress-track">
	                        <span style={`width: ${agentState.levelPercent ?? 0}%;`} />
	                      </div>
	                    </div>
	                    {!agentState.maxLevel && (
	                      <span className="iitc-iris-status">{formatInteger(agentState.apToNextLevel)} AP to next level</span>
	                    )}
	                  </div>
	                  <div className="iitc-iris-panel-footer">
	                    <span
	                      className="iitc-iris-diagnostics-chip"
	                      title={[
	                        'source: window.PLAYER inline Intel data',
	                        `subscription: ${formatSubscriptionLabel(agentState.subscription)}`,
	                        agentState.subscription?.elapsedMs !== undefined ? `subscription request: ${formatElapsedSeconds(agentState.subscription.elapsedMs)}s` : 'subscription request: pending',
	                        'matches IITC sidebar static stats behavior',
	                        'reload page to refresh agent stats',
	                      ].join('\n')}
	                    >
	                      {formatSubscriptionLabel(agentState.subscription)}
	                    </span>
	                    {agentState.subscription?.elapsedMs !== undefined && (
	                      <span className="iitc-iris-diagnostics-chip">
	                        core {formatElapsedSeconds(agentState.subscription.elapsedMs)}s
	                      </span>
	                    )}
	                  </div>
	                </>
	              ) : (
	                <div className="iitc-iris-empty-state">
	                  Agent stats require an authenticated Intel session.
	                </div>
	              )}
	            </div>
	          )}
	          {activeSidePanel === 'comm' && (
	            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-segmented-row" role="tablist" aria-label="COMM channel">
                {COMM_TABS.map((tab) => (
                  <button
                    className={`iitc-iris-segmented-button ${commState.tab === tab.id ? 'is-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={commState.tab === tab.id}
                    onClick={() => selectCommTab(tab.id)}
                    disabled={commState.status === 'loading' && commState.tab === tab.id}
                    key={tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={() => refreshComm()} disabled={commState.status === 'loading'} title="Fetch COMM messages for the current map bounds">
                  {commState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
                <button className="iitc-iris-portal-action" type="button" onClick={requestOlderComm} disabled={commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0} title="Fetch older COMM messages before the current oldest timestamp">
                  Older
                </button>
                {(!commUserAtBottom || commNewBelow) && (
                  <button className="iitc-iris-portal-action" type="button" onClick={jumpCommToLatest} title="Jump to latest COMM message">
                    {commNewBelow ? 'New' : 'Latest'}
                  </button>
                )}
              </div>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatInteger(commState.messages)}</b><small>messages</small></span>
                <span><b>{formatInteger(commState.addedMessages)}</b><small>added</small></span>
                <span><b>{commState.oldestTimestamp !== undefined && commState.newestTimestamp !== undefined ? `${formatCommTime(commState.oldestTimestamp)} - ${formatCommTime(commState.newestTimestamp)}` : '-'}</b><small>range</small></span>
              </div>
              {commState.status === 'auth' && (
                <div className="iitc-iris-empty-state">COMM requires an authenticated Intel session.</div>
              )}
              {(commState.status === 'empty' || (!commState.recent?.length && commState.status !== 'loading' && commState.status !== 'idle' && commState.status !== 'auth')) && (
                <div className="iitc-iris-empty-state">No COMM messages for this channel and map bounds.</div>
              )}
              {commState.recent && commState.recent.length > 0 && (
                <div className="iitc-iris-comm-list iitc-iris-scroll-region" ref={commListRef} onScroll={handleCommScroll}>
                  {commState.requestOlder && commState.status === 'loading' && <span className="iitc-iris-comm-divider">loading older messages</span>}
                  {commState.requestOlder && commState.oldMessagesWereAdded && <span className="iitc-iris-comm-divider">older messages loaded</span>}
                  {commState.recent.map((message) => {
                    const displayParts = getCommDisplayParts(message);
                    return (
                      <div className={`iitc-iris-comm-row ${message.alert ? 'is-alert' : ''} ${message.narrowcast ? 'is-direct' : ''}`} key={message.id} title={formatCommContextTitle(message)}>
                        <span className={`iitc-iris-comm-meta ${getCommTeamClass(message.team)}`}>
                          <b>{formatCommTime(message.time)}</b>
                          <span className="iitc-iris-comm-tags">
                            {message.auto && <small>system</small>}
                            {message.alert && <small>alert</small>}
                            {message.narrowcast && <small>direct</small>}
                          </span>
                        </span>
                        <span className={`iitc-iris-comm-text ${message.narrowcast ? 'is-narrowcast' : ''}`}>
                          <span className={`iitc-iris-comm-actor ${getCommTeamClass(message.playerTeam || message.team)}`}>
                            {formatCommActor(message)}
                          </span>
                          {displayParts.length > 0 ? displayParts.map((part, index) => {
                            const key = `${message.id}-${index}`;
                            if (part.type === 'portal') {
                              return (
                                <button
                                  className="iitc-iris-comm-portal"
                                  type="button"
                                  title={part.portal?.address || part.text}
                                  onClick={() => selectCommPortal(part.portal?.latE6, part.portal?.lngE6, part.portal?.guid)}
                                  key={key}
                                >
                                  {part.text}
                                </button>
                              );
                            }
                            if (part.type === 'player') {
                              return (
                                <button
                                  className={`iitc-iris-comm-player ${getCommTeamClass(part.team)} ${part.at ? 'is-at' : ''}`}
                                  type="button"
                                  onClick={() => addCommNickname(part.text)}
                                  title={`Message ${part.text}`}
                                  key={key}
                                >
                                  {part.at ? '@' : ''}{part.text}
                                </button>
                              );
                            }
                            if (part.type === 'faction') {
                              return <span className={`iitc-iris-comm-faction ${getCommTeamClass(part.team)}`} key={key}>{part.text}</span>;
                            }
                            return <span className={getCommTeamClass(part.team)} key={key}>{part.text}</span>;
                          }) : (message.text || message.type)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <form
                className="iitc-iris-comm-send-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendComm();
                }}
              >
                <input
                  className="iitc-iris-passcode-input"
                  value={commDraft}
                  placeholder={commState.tab === 'faction' ? 'tell faction:' : commState.tab === 'all' ? 'broadcast:' : "can't send to alerts"}
                  disabled={commState.tab === 'alerts' || commState.sendStatus === 'sending'}
                  onInput={(event) => setCommDraft(event.currentTarget.value)}
                />
                <button className="iitc-iris-portal-action" type="submit" disabled={!commDraft.trim() || commState.tab === 'alerts' || commState.sendStatus === 'sending'}>
                  {commState.sendStatus === 'sending' ? 'Sending' : 'Send'}
                </button>
              </form>
              {(commState.sendStatus === 'sent' || commState.sendError) && (
                <span className={`iitc-iris-status ${commState.sendError ? 'iitc-iris-warning' : ''}`} title={commState.sendError}>
                  send {commState.sendError ? getAuthErrorMessage(commState.sendStatus, commState.sendError) : commState.sendStatus}
                </span>
              )}
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    `request: /r/getPlexts ${commState.tab}`,
                    `bounds: ${formatCommBounds(commState.bounds)}`,
                    `response: ${commState.responseMessages ?? '-'}`,
                    `older: ${commState.requestOlder ? (commState.oldMessagesWereAdded ? 'added' : 'none') : '-'}`,
                  ].join('\n')}
                >
                  {commState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(commState.elapsedMs)}s` : 'request'}
                </span>
                {commState.error && (
                  <span className="iitc-iris-warning" title={commState.error}>
                    {commState.status === 'auth' ? 'COMM requires an authenticated Intel session.' : getAuthErrorMessage(commState.status, commState.error)}
                  </span>
                )}
              </div>
            </div>
          )}
          {activeSidePanel === 'scores' && (
            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={refreshScores} disabled={scoresState.status === 'loading'} title="Fetch global and regional scores for the current map center">
                  {scoresState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
                <span className={`iitc-iris-status ${scoresState.status === 'error' || scoresState.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
                  {scoresState.status}
                </span>
              </div>
              <div className="iitc-iris-score-block">
                <div className="iitc-iris-score-heading">
                  <span>Global</span>
                  <span className="iitc-iris-status">{formatScoreLead(scoresState.game?.enlightened, scoresState.game?.resistance)}</span>
                </div>
                <div className="iitc-iris-score-bar" style={`--enl-percent: ${scoresState.game?.enlightenedPercent ?? 50}%;`}>
                  <span className="iitc-iris-score-bar-enl" />
                  <span className="iitc-iris-score-bar-res" />
                </div>
                <div className="iitc-iris-score-pair">
                  <span className="is-enlightened">ENL <b>{formatInteger(scoresState.game?.enlightened)}</b> MU <small>{formatPercent(scoresState.game?.enlightenedPercent)}</small></span>
                  <span className="is-resistance">RES <b>{formatInteger(scoresState.game?.resistance)}</b> MU <small>{formatPercent(scoresState.game?.resistancePercent)}</small></span>
                </div>
              </div>
              <div className="iitc-iris-score-block">
                <div className="iitc-iris-score-heading">
                  <span>{scoresState.region?.name || 'Region'}</span>
                  <span className="iitc-iris-status">
                    CP {scoresState.region?.lastCheckpoint !== undefined ? `${scoresState.region.lastCheckpoint} / ${scoresState.region.checkpoints ?? '-'}` : '-'}
                  </span>
                </div>
                <div className="iitc-iris-score-bar" style={`--enl-percent: ${
                  scoresState.region?.enlightenedAvg !== undefined && scoresState.region.resistanceAvg !== undefined
                    ? Math.round((scoresState.region.enlightenedAvg / Math.max(1, scoresState.region.enlightenedAvg + scoresState.region.resistanceAvg)) * 100)
                    : 50
                }%;`}>
                  <span className="iitc-iris-score-bar-enl" />
                  <span className="iitc-iris-score-bar-res" />
                </div>
                <div className="iitc-iris-score-pair">
                  <span className="is-enlightened">ENL <b>{formatInteger(scoresState.region?.enlightenedAvg)}</b> MU</span>
                  <span className="is-resistance">RES <b>{formatInteger(scoresState.region?.resistanceAvg)}</b> MU</span>
                </div>
              </div>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatScoreLead(scoresState.region?.enlightenedAvg, scoresState.region?.resistanceAvg)}</b><small>region lead</small></span>
                <span><b>{formatInteger(scoresState.region?.topAgents)}</b><small>top agents</small></span>
                <span><b>{scoresState.region?.center ? `${scoresState.region.center.latE6},${scoresState.region.center.lngE6}` : '-'}</b><small>center</small></span>
              </div>
              {scoresState.region?.topAgentList && scoresState.region.topAgentList.length > 0 && (
                <div className="iitc-iris-agent-list">
                  {scoresState.region.topAgentList.slice(0, 5).map((agent, index) => (
                    <span className="iitc-iris-agent-row" key={`${agent.nick}-${index}`}>
                      <small>{index + 1}</small>
                      <b className={getCommTeamClass(agent.team)}>{agent.nick}</b>
                    </span>
                  ))}
                </div>
              )}
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    'request: /r/getGameScore + /r/getRegionScoreDetails',
                    `center: ${scoresState.region?.center ? `${scoresState.region.center.latE6},${scoresState.region.center.lngE6}` : '-'}`,
                  ].join('\n')}
                >
                  {scoresState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(scoresState.elapsedMs)}s` : 'request'}
                </span>
                {(scoresState.error || scoresState.region?.error) && (
                  <span className="iitc-iris-warning" title={scoresState.error || scoresState.region?.error}>
                    {scoresState.status === 'auth' || scoresState.region?.status === 'auth'
                      ? 'Scores require an authenticated Intel session.'
                      : getAuthErrorMessage(scoresState.status, scoresState.error || scoresState.region?.error)}
                  </span>
                )}
              </div>
            </div>
          )}
          {activeSidePanel === 'missions' && (
            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={() => refreshMissions('view')} disabled={missionsState.status === 'loading'} title="Fetch top missions in the current map view">
                  View
                </button>
                <button className="iitc-iris-portal-action" type="button" onClick={() => refreshMissions('portal')} disabled={!entityFetch.selectedPortal || missionsState.status === 'loading'} title="Fetch top missions starting at the selected portal">
                  Portal
                </button>
                <a className="iitc-iris-portal-action iitc-iris-mission-create-link" href="https://missions.ingress.com/" target="_blank" rel="noreferrer" title="Open the Ingress Mission Authoring Tool">
                  Create
                </a>
                <button className="iitc-iris-portal-action" type="button" onClick={() => refreshMissions()} disabled={missionsState.status === 'loading'} title="Refresh current mission source">
                  {missionsState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
              </div>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatInteger(missionsState.missions.length)}</b><small>{missionsState.source === 'portal' ? 'portal missions' : 'view missions'}</small></span>
                <span><b>{missionsState.selectedMission?.waypoints.length ?? '-'}</b><small>waypoints</small></span>
                <span><b>{formatDistance(missionsState.selectedMission?.routeLengthMeters)}</b><small>length</small></span>
              </div>
              {missionsState.caption && (
                <div className="iitc-iris-inventory-selected" title={missionsState.portalGuid}>
                  <span className="iitc-iris-status">{missionsState.source === 'portal' ? 'portal' : 'view'}</span>
                  <b>{missionsState.caption}</b>
                </div>
              )}
              {missionsState.status === 'loading' && (
                <div className="iitc-iris-empty-state">
                  {missionsState.source === 'portal' ? 'Fetching missions starting at this portal...' : 'Fetching missions in the current map view...'}
                </div>
              )}
              {missionsState.status === 'empty' && (
                <div className="iitc-iris-empty-state">
                  {missionsState.source === 'portal' ? 'No missions start at this portal.' : 'No missions found in this map view.'}
                </div>
              )}
              {(missionsState.status === 'error' || missionsState.status === 'auth') && missionsState.missions.length === 0 && (
                <div className="iitc-iris-empty-state">
                  {missionsState.status === 'auth' ? 'Missions require an authenticated Intel session.' : 'Mission request failed.'}
                </div>
              )}
              <div className="iitc-iris-scroll-region iitc-iris-missions-scroll">
                {missionsState.missions.length > 0 && (
                  <div className="iitc-iris-mission-list">
                    {missionsState.missions.map((mission) => (
                      <div className="iitc-iris-mission-entry" key={mission.guid}>
                        <button
                          className={`iitc-iris-mission-row ${missionsState.selectedMission?.guid === mission.guid ? 'is-active' : ''}`}
                          type="button"
                          onClick={() => requestMissionDetails(mission.guid)}
                          disabled={missionsState.detailsStatus === 'loading' && missionsState.selectedMission?.guid === mission.guid}
                          title={mission.guid}
                        >
                          {mission.image && <img src={mission.image} alt="" loading="lazy" />}
                          <span>
                            <b>{mission.title}</b>
                            <small>{formatMissionRowMeta(mission)}</small>
                          </span>
                        </button>
                        {missionsState.selectedMission?.guid === mission.guid && renderSelectedMissionDetails()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    missionsState.source === 'portal' ? 'request: /r/getTopMissionsForPortal' : 'request: /r/getTopMissionsInBounds',
                    `portal: ${missionsState.portalGuid ?? '-'}`,
                  ].join('\n')}
                >
                  {missionsState.cached
                    ? 'cached'
                    : missionsState.elapsedMs !== undefined
                      ? `request ${formatElapsedSeconds(missionsState.elapsedMs)}s`
                      : 'request'}
                </span>
                {missionsState.detailsElapsedMs !== undefined && (
                  <span className="iitc-iris-diagnostics-chip" title="request: /r/getMissionDetails">
                    {missionsState.detailsCached ? 'details cached' : `details ${formatElapsedSeconds(missionsState.detailsElapsedMs)}s`}
                  </span>
                )}
                {missionsState.error && (
                  <span className="iitc-iris-warning" title={missionsState.error}>
                    {missionsState.status === 'auth' || missionsState.detailsStatus === 'auth'
                      ? 'Missions require an authenticated Intel session.'
                      : getAuthErrorMessage(missionsState.status, missionsState.error)}
                  </span>
                )}
              </div>
            </div>
          )}
          {activeSidePanel === 'inventory' && (
            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={refreshInventory} disabled={inventoryState.status === 'loading'} title="Fetch Intel inventory with lastQueryTimestamp 0">
                  {inventoryState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
                <span className={`iitc-iris-status ${inventoryState.status === 'error' || inventoryState.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
                  {inventoryState.status}
                </span>
                <span className={`iitc-iris-status ${getSubscriptionStatusClass(inventoryState.subscription)}`}>
                  {formatSubscriptionLabel(inventoryState.subscription)}
                </span>
              </div>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatInteger(inventoryState.items)} / 2500</b><small>items</small></span>
                <span><b>{formatInteger(inventoryState.keys)}</b><small>{formatInteger(inventoryState.portalsWithKeys)} portals</small></span>
                <span><b>{formatInteger(inventoryState.capsules)}</b><small>capsules</small></span>
              </div>
              <div className="iitc-iris-panel-summary">
                <span>
                  <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.total : '-'}</b>
                  <small>selected keys</small>
                </span>
                <span>
                  <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.loose : '-'}</b>
                  <small>loose</small>
                </span>
                <span>
                  <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.capsule : '-'}</b>
                  <small>capsule</small>
                </span>
              </div>
              {inventoryState.selectedPortalTitle && (
                <div className="iitc-iris-inventory-selected" title={inventoryState.selectedPortalGuid}>
                  <span className="iitc-iris-status">selected</span>
                  <b>{inventoryState.selectedPortalTitle}</b>
                </div>
              )}
              <div className="iitc-iris-scroll-region iitc-iris-inventory-scroll">
                {inventoryState.portalKeysForSelectedPortal && Object.keys(inventoryState.portalKeysForSelectedPortal.capsules).length > 0 && (
                  <div className="iitc-iris-inventory-section">
                    <span className="iitc-iris-status">Selected key capsules</span>
                    <div className="iitc-iris-inventory-list">
                      {Object.entries(inventoryState.portalKeysForSelectedPortal.capsules).map(([capsule, count]) => (
                        <div className="iitc-iris-inventory-row" key={capsule}>
                          <span>{capsule}</span>
                          <b>{count}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {inventoryState.topItems && inventoryState.topItems.length > 0 && (
                  <div className="iitc-iris-inventory-section">
                    <span className="iitc-iris-status">Top items</span>
                    <div className="iitc-iris-inventory-list">
                      {inventoryState.topItems.map((item) => (
                        <div
                          className="iitc-iris-inventory-row"
                          key={`${item.type}-${item.level ?? ''}-${item.rarity ?? ''}-${item.label}`}
                          style={formatIitcColorVars(getIitcItemColor(item))}
                        >
                          <span><b className="iitc-iris-item-badge">{formatItemBadge(item)}</b>{item.label}{item.level ? ` L${item.level}` : ''}</span>
                          <b>{item.count}</b>
                          {item.rarity && <small>{item.rarity.replace(/_/g, ' ')}</small>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {inventoryState.topKeys && inventoryState.topKeys.length > 0 && (
                  <div className="iitc-iris-inventory-section">
                    <span className="iitc-iris-status">Top keys</span>
                    <div className="iitc-iris-inventory-list">
                      {inventoryState.topKeys.map((key) => (
                        <button className="iitc-iris-inventory-row iitc-iris-inventory-key-row" type="button" key={key.portalGuid} title={key.portalGuid} onClick={() => zoomToAndShowPortal(key.portalGuid, undefined, undefined)}>
                          <span>{key.portalTitle || key.portalGuid}</span>
                          <b>{key.count}</b>
                          {key.capsule > 0 && <small>{key.capsule} capsule</small>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    'request: /r/getInventory lastQueryTimestamp=0',
                    'subscription request: /r/getHasActiveSubscription',
                    `subscription: ${formatSubscriptionLabel(inventoryState.subscription)}`,
                    `raw: ${formatInteger(inventoryState.rawItems)}`,
                    `selected portal: ${inventoryState.selectedPortalGuid ?? '-'}`,
                  ].join('\n')}
                >
                  {inventoryState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(inventoryState.elapsedMs)}s` : 'request'}
                </span>
                {inventoryState.subscription?.elapsedMs !== undefined && (
                  <span
                    className="iitc-iris-diagnostics-chip"
                    title="request: /r/getHasActiveSubscription"
                  >
                    core {formatElapsedSeconds(inventoryState.subscription.elapsedMs)}s
                  </span>
                )}
                {inventoryState.error && (
                  <span className="iitc-iris-warning" title={inventoryState.error}>
                    {inventoryState.status === 'auth'
                      ? 'Inventory requires an authenticated Intel session.'
                      : getAuthErrorMessage(inventoryState.status, inventoryState.error)}
                  </span>
                )}
              </div>
            </div>
          )}
          {activeSidePanel === 'passcode' && (
            <div className="iitc-iris-request-panel-body">
              <form
                className="iitc-iris-passcode-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  redeemPasscode();
                }}
              >
                <input
                  className="iitc-iris-passcode-input"
                  type="text"
                  value={passcodeDraft}
                  placeholder="passcode"
                  disabled={passcodeState.status === 'loading'}
                  onInput={(event) => setPasscodeDraft(event.currentTarget.value)}
                />
                <button className="iitc-iris-portal-action" type="submit" disabled={!passcodeDraft.trim() || passcodeState.status === 'loading'}>
                  {passcodeState.status === 'loading' ? 'Redeeming' : 'Redeem'}
                </button>
              </form>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatInteger(passcodeState.ap)}</b><small>AP</small></span>
                <span><b>{formatInteger(passcodeState.xm)}</b><small>XM</small></span>
                <span><b>{formatInteger(passcodeState.items?.reduce((sum, item) => sum + (item.count ?? 1), 0))}</b><small>items</small></span>
              </div>
              {passcodeState.other && passcodeState.other.length > 0 && (
                <div className="iitc-iris-inventory-list">
                  {passcodeState.other.map((reward) => (
                    <div className="iitc-iris-inventory-row" key={reward}>
                      <span>{reward}</span>
                      <b>1</b>
                    </div>
                  ))}
                </div>
              )}
              {passcodeState.items && passcodeState.items.length > 0 && (
                <div className="iitc-iris-inventory-list">
                  {passcodeState.items.map((item, index) => (
                    <div
                      className="iitc-iris-inventory-row"
                      key={`${item.label}-${item.level ?? ''}-${index}`}
                      style={formatIitcColorVars(getIitcLevelColor(item.level))}
                    >
                      <span><b className="iitc-iris-item-badge">{formatItemBadge(item)}</b>{item.label}{item.level ? ` L${item.level}` : ''}</span>
                      <b>{item.count ?? 1}</b>
                    </div>
                  ))}
                </div>
              )}
              {(passcodeState.status === 'empty' || passcodeState.error) && (
                <div className={passcodeState.error ? 'iitc-iris-warning' : 'iitc-iris-empty-state'}>
                  {passcodeState.error
                    ? passcodeState.status === 'auth'
                      ? 'Passcode redemption requires an authenticated Intel session.'
                      : getAuthErrorMessage(passcodeState.status, passcodeState.error)
                    : 'Passcode returned no rewards.'}
                </div>
              )}
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    'request: /r/redeemReward',
                    `passcode: ${passcodeState.passcode ?? '-'}`,
                  ].join('\n')}
                >
                  {passcodeState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(passcodeState.elapsedMs)}s` : 'request'}
                </span>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function createRoot(): HTMLElement {
  const existingRoot = document.getElementById('iitc-iris-root');
  if (existingRoot) return existingRoot;

  const root = document.createElement('div');
  root.id = 'iitc-iris-root';
  (document.body || document.documentElement).appendChild(root);
  return root;
}

function hasIntelDashboardBootstrap(): boolean {
  return document.querySelector('script[src*="gen_dashboard_"]') !== null;
}

function shouldBypassForIntelLogin(): boolean {
  try {
    const value = Number(window.sessionStorage.getItem(LOGIN_BYPASS_STORAGE_KEY) ?? 0);
    if (!Number.isFinite(value) || value <= Date.now() || hasIntelDashboardBootstrap()) {
      window.sessionStorage.removeItem(LOGIN_BYPASS_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function mount(): void {
  if (!document.body) {
    window.setTimeout(mount, 50);
    return;
  }

  if (shouldBypassForIntelLogin()) {
    window.setTimeout(mount, 1000);
    return;
  }

  const root = createRoot();
  render(<App />, root);
  injectScript(getExtensionUrl('page-map-runtime.js'));
  window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));

  if (window.__iitcIrisContentInitialized) return;
  window.__iitcIrisContentInitialized = true;

  const observer = new MutationObserver(() => {
    if (!document.getElementById('iitc-iris-root')) {
      render(<App />, createRoot());
      window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));
    }
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
}

mount();
