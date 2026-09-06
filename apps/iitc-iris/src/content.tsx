import {h, render} from 'preact';
import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import './iitc-iris.css';
import {formatElapsedSeconds, getPanelStatusClass} from './ui-status';
import {
  DEFAULT_LAYER_SETTINGS,
  LAYER_REGISTRY_DIAGNOSTICS,
  type IitcIrisBooleanLayerSettingKey,
} from './layer-registry';
import {normalizePortalHighlighterId, PORTAL_HIGHLIGHTER_REGISTRY} from './highlighter-registry';
import {
  AGENT_MENU_SHEET_REGISTRY,
  getPrimaryMenuId,
  isSheetId,
  isSidePanelId,
  MAP_MENU_SHEET_REGISTRY,
  PRIMARY_MENU_REGISTRY,
  SELECTED_MENU_SHEET_REGISTRY,
  SIDE_PANEL_REGISTRY,
  SYSTEM_MENU_SHEET_REGISTRY,
  type IitcIrisPrimaryMenuId,
  type IitcIrisSheetId,
  type IitcIrisSidePanelId,
} from './menu-registry';
import {
  DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS,
  PORTAL_DETAIL_SECTION_REGISTRY,
  type IitcIrisPortalDetailSectionId,
} from './portal-detail-section-registry';
import {
  getSelectionView,
  type IitcIrisMapContextSelection,
} from './selection-lifecycle';
import {handleIitcIrisContentMessage, type CameraState, type EntityFetchState} from './content-message-adapter';
import {handleIitcIrisContentKeyDown, type IitcIrisPanDirection} from './content-keyboard-shortcuts';
import {copyIitcIrisText} from './content-feedback';
import {closeIitcIrisSheet, openIitcIrisSheet, toggleIitcIrisSheet} from './content-sheet-navigation';
import {getIitcIrisPrimaryMenuEffect} from './content-primary-menu';
import {IitcIrisAgentPanel} from './agent-panel';
import {IITC_IRIS_COMM_TABS} from './comm-panel-controls';
import {IitcIrisCommPanel} from './comm-panel';
import {IitcIrisInventoryPanel} from './inventory-panel';
import {IitcIrisMissionsPanel} from './missions-panel';
import {IitcIrisPasscodePanel} from './passcode-panel';
import {IitcIrisPortalDetailsPanel} from './portal-details-panel';
import {IitcIrisSearchPanel} from './search-panel';
import {IitcIrisScoresPanel} from './scores-panel';
import {IitcIrisDrawToolsPanel} from './draw-tools-panel';
import {IitcIrisSystemDiagnosticsPanel} from './system-diagnostics-panel';
import {
  filterPortalsList,
  PortalsListLevelFilter,
  PortalsListSortField,
  PortalsListTeamFilter,
  SortOrder,
  sortPortalsList,
  summarizePortalsList,
} from './content-portal-analysis';
import {IitcIrisPortalCountsPanel} from './portal-counts-panel';
import {IitcIrisPortalsListPanel} from './portals-list-panel';
import {IitcIrisScoreboardPanel} from './scoreboard-panel';
import {IitcIrisLayersPanel} from './layers-panel';
import {IitcIrisMapContextPanel, IitcIrisMapNavigationPanel} from './map-controls-panel';
import {IitcIrisHelpPanel} from './help-panel';
import {
  DRAW_TOOLS_DEFAULT_COLOR,
  getDrawToolsItemCenter,
  isSupportedDrawToolsItem,
  stripDrawToolsStorageIndex,
  type DrawToolsTarget,
} from './content-draw-tools';
import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisCommTab, type IitcIrisDataSourceSettings, type IitcIrisDrawToolsItem, type IitcIrisDrawToolsLatLng, type IitcIrisHighlighterSettings, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLifecycleSettings, type IitcIrisMapContextPortalAnchor, type IitcIrisMapTimingDiagnostics, type IitcIrisMessage, type IitcIrisMissionSource, type IitcIrisMissionsState, type IitcIrisPasscodeState, type IitcIrisPortalHighlighterId, type IitcIrisRequestDiagnostics, type IitcIrisRenderMutationDiagnostics, type IitcIrisRenderPolicy, type IitcIrisRenderQueueDiagnostics, type IitcIrisScoresState, type IitcIrisSearchResult, type IitcIrisSearchState, type IitcIrisSelectedPortal} from './messages';
import {
  createIitcMapDataPlan,
  IITC_MAX_REQUESTS,
  IITC_MAX_TILE_RETRIES,
  IITC_NUM_TILES_PER_REQUEST,
  normalizeIitcDrawToolsLabel,
  parseIitcDrawToolsLayer,
  serializeIitcDrawToolsLayer,
  type IitcMapDataPlan,
} from '@iris/iitc-core';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const IITC_PAN_CONTROL_OFFSET_PX = 500;
const LOGIN_BYPASS_STORAGE_KEY = 'iitc-iris:login-bypass-until';
const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';
const LOGIN_BYPASS_MS = 5 * 60 * 1000;
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
const VIEW_PRESETS = [
  {id: 'amsterdam-z10', label: 'AMS 10', lat: 52.3730796, lng: 4.8924534, zoom: 10},
  {id: 'amsterdam-z15', label: 'AMS 15', lat: 52.3730796, lng: 4.8924534, zoom: 15},
  {id: 'damrak-z15', label: 'DAM 15', lat: 52.3761096, lng: 4.8980545, zoom: 15},
] as const;
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
const SIDE_PANEL_OPTIONS = SIDE_PANEL_REGISTRY;
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

type SidePanelId = IitcIrisSidePanelId;
type SheetId = IitcIrisSheetId;
type PrimaryMenuId = IitcIrisPrimaryMenuId;
type PortalSectionId = IitcIrisPortalDetailSectionId;
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

function isCommTab(value: string | null): value is IitcIrisCommTab {
  return value === 'all' || value === 'faction' || value === 'alerts';
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
    return Object.fromEntries(
      PORTAL_DETAIL_SECTION_REGISTRY.map((entry) => [
        entry.id,
        typeof parsed[entry.id] === 'boolean' ? parsed[entry.id] : entry.defaultOpen,
      ]),
    ) as Record<PortalSectionId, boolean>;
  } catch {
    return DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS;
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

function formatSelectedPortal(portal: IitcIrisSelectedPortal | null): string {
  if (!portal) return 'none';
  const label = portal.title || portal.guid.slice(0, 8);
  const level = portal.isPlaceholder || portal.level === undefined ? 'P' : `L${portal.level}`;
  return `${label} ${portal.team}${level}`;
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

function formatMapObjectDistance(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters)) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
  return `${Math.round(meters)} m`;
}

function formatRenderMutationSummary(mutation: IitcIrisRenderMutationDiagnostics | null): string {
  if (!mutation) return 'render -';
  const portals = mutation.portals;
  return `${mutation.mode === 'incremental' ? 'inc' : 'full'} p +${portals.added}/-${portals.removed}/~${portals.unchanged}/r${portals.replaced}`;
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
  const [mapContext, setMapContext] = useState<IitcIrisMapContextSelection | null>(null);
  const [drawToolsLinkStart, setDrawToolsLinkStart] = useState<IitcIrisDrawToolsLatLng | null>(null);
  const [drawToolsItems, setDrawToolsItems] = useState<IitcIrisDrawToolsItem[]>([]);
  const [drawToolsImportText, setDrawToolsImportText] = useState('');
  const [drawToolsImportMerge, setDrawToolsImportMerge] = useState(true);
  const [drawToolsImportStatus, setDrawToolsImportStatus] = useState('');
  const [drawToolsClearConfirm, setDrawToolsClearConfirm] = useState<'polyline' | 'marker' | null>(null);
  const [drawToolsMarkerLabel, setDrawToolsMarkerLabel] = useState('');
  const [editingDrawToolsMarkerIndex, setEditingDrawToolsMarkerIndex] = useState<number | null>(null);
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
    highlighterIds: PORTAL_HIGHLIGHTER_REGISTRY.map((entry) => entry.id),
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
  const selectedPortalMissionState = entityFetch.selectedPortal &&
    missionsState.source === 'portal' &&
    missionsState.portalGuid === entityFetch.selectedPortal.guid
    ? missionsState
    : null;
  const {
    hasSelectedObject,
    selectedPrimaryLabel,
    activeSelectedSheet,
    selectedKind,
    showPortalSidePanel,
  } = getSelectionView({selectedPortal: entityFetch.selectedPortal, mapContext}, activeSheet);
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
    copyIitcIrisText(JSON.stringify(dockDiagnostics, null, 2), {setStatus: setCopyStatus, successStatus: 'json copied'});
  };

  const copyIntelUrl = (): void => {
    copyIitcIrisText(intelUrl, {setStatus: setCopyStatus, successStatus: 'url copied'});
  };

  const copyMapContextLatLng = (): void => {
    if (!mapContext) return;
    copyIitcIrisText(`${mapContext.lat.toFixed(6)},${mapContext.lng.toFixed(6)}`, {setStatus: setCopyStatus, successStatus: 'coords copied'});
  };

  const copyMapContextUrl = (): void => {
    if (!mapContext) return;
    const url = `https://intel.ingress.com/intel?ll=${mapContext.lat.toFixed(6)},${mapContext.lng.toFixed(6)}&z=${Math.round(mapContext.zoom)}`;
    copyIitcIrisText(url, {setStatus: setCopyStatus, successStatus: 'context url copied'});
  };

  const copyMapContextGuid = (): void => {
    if (!mapContext?.guid) return;
    copyIitcIrisText(mapContext.guid, {setStatus: setCopyStatus, successStatus: `${mapContext.target} guid copied`});
  };

  const copyMapContextPortalGuids = (): void => {
    if (!mapContext?.portalGuids?.length) return;
    copyIitcIrisText(mapContext.portalGuids.join('\n'), {setStatus: setCopyStatus, successStatus: 'anchor guids copied'});
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
    const target = getDrawToolsTarget();
    if (!target) return;
    const label = normalizeIitcDrawToolsLabel(drawToolsMarkerLabel) ?? normalizeIitcDrawToolsLabel(target.label);
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'addMarker',
      drawToolsColor: color,
      drawToolsLabel: label ?? '',
      drawToolsLatLngs: [{lat: target.lat, lng: target.lng}],
    });
    setStatus('draw marker added');
  };

  const renameDrawToolsMarker = (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string): void => {
    const normalizedLabel = normalizeIitcDrawToolsLabel(label);
    if (normalizedLabel === item.label) return;
    postDrawToolsAction({
      drawToolsAction: 'rename',
      drawToolsIndex: item.storageIndex,
      drawToolsLabel: normalizedLabel ?? '',
    });
    setStatus(normalizedLabel ? 'draw marker renamed' : 'draw marker label cleared');
  };

  const saveDrawToolsMarkerLabel = (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string): void => {
    renameDrawToolsMarker(item, label);
    setEditingDrawToolsMarkerIndex(null);
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
    copyIitcIrisText(serializeIitcDrawToolsLayer(items), {
      setStatus: setDrawToolsImportStatus,
      successStatus: itemType === 'polyline' ? 'links copied' : itemType === 'marker' ? 'markers copied' : 'draw tools JSON copied',
      successTimeoutMs: 1400,
      failureTimeoutMs: 1800,
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
    copyIitcIrisText(portalUrl, {setStatus: setCopyStatus, successStatus: 'portal link copied'});
  };

  const copySelectedPortalGuid = (): void => {
    if (!entityFetch.selectedPortal) return;
    copyIitcIrisText(entityFetch.selectedPortal.guid, {setStatus: setCopyStatus, successStatus: 'portal guid copied'});
  };

  const copySelectedPortalTitle = (): void => {
    if (!entityFetch.selectedPortal) return;
    copyIitcIrisText(entityFetch.selectedPortal.title || entityFetch.selectedPortal.guid, {setStatus: setCopyStatus, successStatus: 'portal title copied'});
  };

  const toggleDebugDock = (): void => {
    setDebugDockVisible((current) => {
      const next = !current;
      storeDebugDockVisible(next);
      return next;
    });
  };

  const closeSheetToMap = useCallback((): void => {
    const effect = closeIitcIrisSheet({activeSheet, activeSidePanel});
    if (effect.cancelPanelRequests) {
      window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
    }
    setActiveSidePanel(effect.activeSidePanel);
    setActiveSheet(effect.activeSheet);
    storeSidePanelId(effect.activeSidePanel);
    storeActiveSheet(effect.activeSheet);
  }, [activeSheet, activeSidePanel]);

  const closeSidePanel = useCallback((): void => {
    closeSheetToMap();
  }, [closeSheetToMap]);

  const openSheet = useCallback((sheet: SheetId): void => {
    const effect = openIitcIrisSheet({activeSheet, activeSidePanel}, sheet);
    if (effect.cancelPanelRequests) {
      window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
    }
    setActiveSheet(effect.activeSheet);
    storeActiveSheet(effect.activeSheet);
    setActiveSidePanel(effect.activeSidePanel);
    storeSidePanelId(effect.activeSidePanel);
  }, [activeSheet, activeSidePanel]);

  const toggleSheet = useCallback((sheet: SheetId): void => {
    const effect = toggleIitcIrisSheet({activeSheet, activeSidePanel}, sheet);
    if (effect.cancelPanelRequests) {
      window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
    }
    setActiveSheet(effect.activeSheet);
    storeActiveSheet(effect.activeSheet);
    setActiveSidePanel(effect.activeSidePanel);
    storeSidePanelId(effect.activeSidePanel);
  }, [activeSheet, activeSidePanel]);

  const refreshComm = useCallback((tab: IitcIrisCommTab = commState.tab, older = false): void => {
    storeCommTab(tab);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestComm,
      commTab: tab,
      commOlder: older,
    } satisfies IitcIrisMessage, '*');
  }, [commState.tab]);

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

  const refreshMissions = useCallback((source: IitcIrisMissionSource = missionsState.source ?? 'view'): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestMissions,
      missionSource: source,
    } satisfies IitcIrisMessage, '*');
  }, [missionsState.source]);

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

  const setMapView = useCallback((lat: number, lng: number, zoom = camera.zoom): void => {
    const clamped = clampView({lat, lng, zoom});
    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: clamped.lat,
      lng: clamped.lng,
      zoom: clamped.zoom ?? camera.zoom,
    } satisfies IitcIrisMessage, '*');
  }, [camera.zoom]);

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

  const selectCommPortal = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    selectPortalByLatLng(latE6, lngE6, portalGuid);
  };

  const panMap = useCallback((direction: IitcIrisPanDirection): void => {
    const offsetX = direction === 'east' ? IITC_PAN_CONTROL_OFFSET_PX : direction === 'west' ? -IITC_PAN_CONTROL_OFFSET_PX : 0;
    const offsetY = direction === 'south' ? IITC_PAN_CONTROL_OFFSET_PX : direction === 'north' ? -IITC_PAN_CONTROL_OFFSET_PX : 0;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.panBy,
      panX: offsetX,
      panY: offsetY,
    } satisfies IitcIrisMessage, '*');
  }, []);

  const zoomMap = useCallback((delta: number): void => {
    setMapView(camera.lat, camera.lng, camera.zoom + delta);
  }, [camera.lat, camera.lng, camera.zoom, setMapView]);

  const clearPortalSelection = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.clearPortalSelection,
    } satisfies IitcIrisMessage, '*');
  };

  const closeSheets = useCallback((): void => {
    setPortalImageOpen(false);
    openSheet('map');
  }, [openSheet]);

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
  const openCommPanel = useCallback((tab?: IitcIrisCommTab): void => {
    if (tab) refreshComm(tab);
    openSheet('comm');
  }, [openSheet, refreshComm]);

  const selectCommTab = (tab: IitcIrisCommTab): void => {
    if (activeSheet === 'comm' && commState.tab === tab) return;
    refreshComm(tab);
    if (activeSheet !== 'comm') openSheet('comm');
  };

  const toggleCommPanel = useCallback((tab?: IitcIrisCommTab): void => {
    if (activeSheet === 'comm' && (!tab || commState.tab === tab)) {
      closeSheetToMap();
      return;
    }
    openCommPanel(tab);
  }, [activeSheet, closeSheetToMap, commState.tab, openCommPanel]);

  const toggleMissionsSheet = (source: IitcIrisMissionSource): void => {
    if (activeSheet === 'missions' && missionsState.source === source) {
      closeSheetToMap();
      return;
    }
    openSheet('missions');
    refreshMissions(source);
  };

  const togglePrimaryMenu = useCallback((menu: PrimaryMenuId): void => {
    const effect = getIitcIrisPrimaryMenuEffect(menu, {activePrimaryMenu, activeSelectedSheet, activeSheet, hasSelectedObject});
    if (effect.kind === 'closeSheet') {
      closeSheetToMap();
    } else if (effect.kind === 'openSheet') {
      openSheet(effect.sheet);
    } else if (effect.kind === 'toggleComm') {
      toggleCommPanel();
    } else if (effect.kind === 'toggleSheet') {
      toggleSheet(effect.sheet);
    }
  }, [activePrimaryMenu, activeSelectedSheet, activeSheet, closeSheetToMap, hasSelectedObject, openSheet, toggleCommPanel, toggleSheet]);

  const renderSheetTab = (sheet: SheetId, label: string, onClick?: () => void, active = activeSheet === sheet): h.JSX.Element => (
    <button
      className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${active ? 'is-active' : ''}`}
      type="button"
      onClick={onClick ?? ((): void => toggleSheet(sheet))}
      aria-pressed={active}
      key={sheet}
    >
      {label}
    </button>
  );

  const renderPrimaryMenuTab = (menu: typeof PRIMARY_MENU_REGISTRY[number]): h.JSX.Element => {
    const label = menu.id === 'selected' ? selectedPrimaryLabel : menu.label;
    return (
      <button
        className={`iitc-iris-sheet-tab ${activePrimaryMenu === menu.id ? 'is-active' : ''}`}
        type="button"
        onClick={() => togglePrimaryMenu(menu.id)}
        disabled={menu.id === 'selected' && !hasSelectedObject}
        aria-pressed={activePrimaryMenu === menu.id}
        title={`${label} menu (${menu.shortcut})`}
        key={menu.id}
      >
        {label}
      </button>
    );
  };

  const renderSelectedSheetTab = (entry: typeof SELECTED_MENU_SHEET_REGISTRY[number]): h.JSX.Element | null => {
    if (!entry.selectedKind || selectedKind !== entry.selectedKind) return null;
    const openSelectedSheet = entry.id === 'selectedLink' || entry.id === 'selectedField'
      ? (): void => openSheet(entry.id)
      : undefined;
    return renderSheetTab(entry.id, entry.label, openSelectedSheet);
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
      handleIitcIrisContentMessage(event.data, {
        activeSidePanel,
        baseLayerId,
        cameraZoom: camera.zoom,
        dataSource,
        highlighterSettings,
        layerSettings,
        lifecycleSettings,
      }, {
        setActiveSheet,
        setActiveSidePanel,
        setAgentState,
        setCamera,
        setCommState,
        setDrawToolsImportStatus,
        setDrawToolsItems,
        setEntityFetch,
        setInventoryState,
        setMapContext,
        setMissionsState,
        setPasscodeState,
        setPortalImageOpen,
        setRequestDiagnostics,
        setScoresState,
        setSearchState,
        setStatus,
        storeActiveSheet,
        storeSidePanelId,
      });
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, [activeSidePanel, baseLayerId, camera.zoom, dataSource, highlighterSettings, layerSettings, lifecycleSettings]);

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
  }, [activeSidePanel, entityFetch.selectedPortal?.guid, missionsState.portalGuid, missionsState.source, missionsState.status, refreshMissions]);

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
      handleIitcIrisContentKeyDown(event, {
        hasSelectedObject,
        portalImageOpen,
        shortcutsEnabled,
        closeSheets,
        closePortalImage: () => setPortalImageOpen(false),
        panMap,
        togglePrimaryMenu,
        toggleSheet,
        zoomMap,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => window.removeEventListener('keydown', onKeyDown);
  }, [closeSheets, hasSelectedObject, panMap, portalImageOpen, shortcutsEnabled, togglePrimaryMenu, toggleSheet, zoomMap]);

  const setDataSource = (id: typeof DATA_SOURCE_OPTIONS[number]['id']): void => {
    setDataSourceId(id);
    const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id);
    if (!option || option.mode === 'live') return;
    setMapView(option.lat, option.lng, option.zoom);
  };
  const activeSearchResult = searchState.results.filter((result) => result.type !== 'empty')[activeSearchResultIndex];
  const drawToolsTarget = getDrawToolsTarget();
  const drawToolsTargetDefaultLabel = drawToolsTarget?.label ?? '';
  const drawToolsLinkItems = drawToolsItems.filter((item) => item.type === 'polyline');
  const drawToolsMarkerItems = drawToolsItems.filter((item) => item.type === 'marker');

  useEffect(() => {
    setDrawToolsMarkerLabel(drawToolsTargetDefaultLabel);
  }, [drawToolsTargetDefaultLabel]);

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
        <IitcIrisSearchPanel
          activeSearchResultIndex={activeSearchResultIndex}
          clearSearch={clearSearch}
          closeSearch={() => openSheet('map')}
          handleSearchKeyDown={handleSearchKeyDown}
          previewSearchResult={previewSearchResult}
          requestSearch={requestSearch}
          searchState={searchState}
          searchTerm={searchTerm}
          selectSearchResult={selectSearchResult}
          setActiveSearchResultIndex={setActiveSearchResultIndex}
          setSearchTerm={setSearchTerm}
        />
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
        {activeSheet === 'view' && (
          <IitcIrisMapNavigationPanel
            canPan={canPan}
            geolocationStatus={geolocationStatus}
            locateBrowserPosition={locateBrowserPosition}
            panMap={panMap}
            zoomMap={zoomMap}
          />
        )}
        {mapContext && (
          (activeSheet === 'view' && mapContext.target === 'map') ||
          (activeSheet === 'selectedLink' && mapContext.target === 'link') ||
          (activeSheet === 'selectedField' && mapContext.target === 'field')
        ) && (
          <IitcIrisMapContextPanel
            centerMapContext={centerMapContext}
            copyMapContextGuid={copyMapContextGuid}
            copyMapContextLatLng={copyMapContextLatLng}
            copyMapContextPortalGuids={copyMapContextPortalGuids}
            copyMapContextUrl={copyMapContextUrl}
            formatMapObjectDistance={formatMapObjectDistance}
            formatTeamLabel={formatTeamLabel}
            mapContext={mapContext}
            selectMapContextAnchor={selectMapContextAnchor}
          />
        )}
        {activeSheet === 'drawLinks' && <IitcIrisDrawToolsPanel
          allItemsCount={drawToolsItems.length}
          clearConfirm={drawToolsClearConfirm}
          editingMarkerIndex={editingDrawToolsMarkerIndex}
          importMerge={drawToolsImportMerge}
          importStatus={drawToolsImportStatus}
          importText={drawToolsImportText}
          linkItems={drawToolsLinkItems}
          linkStart={drawToolsLinkStart}
          markerItems={drawToolsMarkerItems}
          markerLabel={drawToolsMarkerLabel}
          mode="links"
          target={drawToolsTarget}
          addLinkPoint={addDrawToolsLinkPoint}
          addMarker={addDrawToolsMarker}
          centerItem={centerDrawToolsItem}
          clearItems={clearDrawToolsItems}
          copyItems={copyDrawToolsItems}
          deleteAtContext={deleteDrawToolsAtContext}
          deleteItem={deleteDrawToolsItem}
          importItems={importDrawToolsItems}
          saveMarkerLabel={saveDrawToolsMarkerLabel}
          setEditingMarkerIndex={setEditingDrawToolsMarkerIndex}
          setImportMerge={setDrawToolsImportMerge}
          setImportText={setDrawToolsImportText}
          setLinkStart={setDrawToolsLinkStart}
          setMarkerLabel={setDrawToolsMarkerLabel}
          undoItem={undoDrawToolsItem}
        />}
        {activeSheet === 'drawMarkers' && <IitcIrisDrawToolsPanel
          allItemsCount={drawToolsItems.length}
          clearConfirm={drawToolsClearConfirm}
          editingMarkerIndex={editingDrawToolsMarkerIndex}
          importMerge={drawToolsImportMerge}
          importStatus={drawToolsImportStatus}
          importText={drawToolsImportText}
          linkItems={drawToolsLinkItems}
          linkStart={drawToolsLinkStart}
          markerItems={drawToolsMarkerItems}
          markerLabel={drawToolsMarkerLabel}
          mode="markers"
          target={drawToolsTarget}
          addLinkPoint={addDrawToolsLinkPoint}
          addMarker={addDrawToolsMarker}
          centerItem={centerDrawToolsItem}
          clearItems={clearDrawToolsItems}
          copyItems={copyDrawToolsItems}
          deleteAtContext={deleteDrawToolsAtContext}
          deleteItem={deleteDrawToolsItem}
          importItems={importDrawToolsItems}
          saveMarkerLabel={saveDrawToolsMarkerLabel}
          setEditingMarkerIndex={setEditingDrawToolsMarkerIndex}
          setImportMerge={setDrawToolsImportMerge}
          setImportText={setDrawToolsImportText}
          setLinkStart={setDrawToolsLinkStart}
          setMarkerLabel={setDrawToolsMarkerLabel}
          undoItem={undoDrawToolsItem}
        />}
        {activeSheet === 'portalCounts' && (
          <IitcIrisPortalCountsPanel portalAnalysis={portalAnalysis} />
        )}
        {activeSheet === 'portalsList' && (
          <IitcIrisPortalsListPanel
            cameraZoom={camera.zoom}
            portalAnalysis={portalAnalysis}
            portalsListLevelFilter={portalsListLevelFilter}
            portalsListSortBy={portalsListSortBy}
            portalsListSortOrder={portalsListSortOrder}
            portalsListSummary={portalsListSummary}
            portalsListTeamFilter={portalsListTeamFilter}
            portalsListTextFilter={portalsListTextFilter}
            sortedPortalsList={sortedPortalsList}
            setPortalsListLevelFilter={setPortalsListLevelFilter}
            setPortalsListTeamFilter={setPortalsListTeamFilter}
            setPortalsListTextFilter={setPortalsListTextFilter}
            sortPortalsListBy={sortPortalsListBy}
            zoomToAndShowPortal={zoomToAndShowPortal}
          />
        )}
        {activeSheet === 'scoreboard' && (
          <IitcIrisScoreboardPanel portalAnalysis={portalAnalysis} />
        )}
        {activeSheet === 'layers' && (
          <IitcIrisLayersPanel
            baseLayerId={baseLayerId}
            highlighterSettings={highlighterSettings}
            layerSettings={layerSettings}
            selectBaseLayer={setBaseLayerId}
            selectPortalHighlighter={selectPortalHighlighter}
            toggleLayerSetting={toggleLayerSetting}
          />
        )}
      </aside>
      {activeSheet === 'system' && (
        <aside className="iitc-iris-system-panel" aria-label="System controls">
          <div className="iitc-iris-panel-topbar">
            <span className="iitc-iris-selected-title">System</span>
            <span className="iitc-iris-panel-header-actions">
              <span className="iitc-iris-status">UI and diagnostics</span>
            </span>
          </div>
          <IitcIrisSystemDiagnosticsPanel
            activeByEndpoint={requestDiagnostics.activeByEndpoint}
            camera={camera}
            debugDockVisible={debugDockVisible}
            detailOverlaysActive={detailOverlaysActive}
            entityFetch={entityFetch}
            innerStatus={innerStatus}
            plan={plan}
            requestBatches={requestBatches}
            selectedPortalLabel={entityFetch.selectedPortal ? formatSelectedPortal(entityFetch.selectedPortal) : null}
            status={status}
            summaryMode={summaryMode}
            clearPortalSelection={clearPortalSelection}
            formatRenderMutationSummary={formatRenderMutationSummary}
            openIntelLogin={openIntelLogin}
            toggleDebugDock={toggleDebugDock}
          />
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
          {PRIMARY_MENU_REGISTRY.map(renderPrimaryMenuTab)}
        </div>
        <div className="iitc-iris-sheet-tabbar-secondary">
          {activePrimaryMenu === 'map' && (
            <>
              {MAP_MENU_SHEET_REGISTRY.map((entry) => (
                entry.id === 'missions'
                  ? renderSheetTab(entry.id, entry.label, () => toggleMissionsSheet('view'), activeSheet === 'missions' && missionsState.source !== 'portal')
                  : renderSheetTab(entry.id, entry.label)
              ))}
            </>
          )}
          {activePrimaryMenu === 'selected' && (
            <>
              {SELECTED_MENU_SHEET_REGISTRY.map(renderSelectedSheetTab)}
              {selectedKind === 'portal' && <button className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${activeSheet === 'missions' && missionsState.source === 'portal' ? 'is-active' : ''}`} type="button" onClick={() => toggleMissionsSheet('portal')} aria-pressed={activeSheet === 'missions' && missionsState.source === 'portal'}>Missions</button>}
            </>
          )}
          {activePrimaryMenu === 'agent' && (
            <>
              {AGENT_MENU_SHEET_REGISTRY.map((entry) => renderSheetTab(entry.id, entry.label))}
            </>
          )}
          {activePrimaryMenu === 'comm' && (
            <>
              {IITC_IRIS_COMM_TABS.map((tab) => (
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
              {SYSTEM_MENU_SHEET_REGISTRY.map((entry) => renderSheetTab(entry.id, entry.label))}
            </>
          )}
        </div>
      </nav>
      {showPortalSidePanel && entityFetch.selectedPortal && (
        <IitcIrisPortalDetailsPanel
          activeSidePanel={activeSidePanel}
          closePortalDetails={closeSheetToMap}
          copySelectedPortalGuid={copySelectedPortalGuid}
          copySelectedPortalLink={copySelectedPortalLink}
          copySelectedPortalTitle={copySelectedPortalTitle}
          focusSelectedPortal={focusSelectedPortal}
          inlineAuthActions={inlineAuthActions}
          openPortalImage={() => setPortalImageOpen(true)}
          openSelectedPortalMissions={openSelectedPortalMissions}
          portal={entityFetch.selectedPortal}
          portalDetails={selectedPortalDetails}
          portalMissionState={selectedPortalMissionState}
          portalSections={portalSections}
          setPortalSectionOpen={setPortalSectionOpen}
        />
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
        <IitcIrisHelpPanel closeHelp={closeSheets} />
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
	            <IitcIrisAgentPanel agentState={agentState} />
          )}
          {activeSidePanel === 'comm' && (
            <IitcIrisCommPanel
              addNickname={addCommNickname}
              commDraft={commDraft}
              commListRef={commListRef as import('preact').RefObject<HTMLDivElement>}
              commNewBelow={commNewBelow}
              commState={commState}
              commUserAtBottom={commUserAtBottom}
              jumpToLatest={jumpCommToLatest}
              onDraftChange={setCommDraft}
              onScroll={handleCommScroll}
              refresh={refreshComm}
              requestOlder={requestOlderComm}
              selectPortal={selectCommPortal}
              selectTab={selectCommTab}
              send={sendComm}
            />
          )}
          {activeSidePanel === 'scores' && (
            <IitcIrisScoresPanel refresh={refreshScores} scoresState={scoresState} />
          )}
          {activeSidePanel === 'missions' && (
            <IitcIrisMissionsPanel
              cameraZoom={camera.zoom}
              hasSelectedPortal={Boolean(entityFetch.selectedPortal)}
              missionsState={missionsState}
              refreshMissions={refreshMissions}
              requestMissionDetails={requestMissionDetails}
              zoomToAndShowPortal={zoomToAndShowPortal}
              zoomToMission={zoomToMission}
            />
          )}
          {activeSidePanel === 'inventory' && (
            <IitcIrisInventoryPanel
              inventoryState={inventoryState}
              refresh={refreshInventory}
              zoomToAndShowPortal={zoomToAndShowPortal}
            />
          )}
          {activeSidePanel === 'passcode' && (
            <IitcIrisPasscodePanel
              onDraftChange={setPasscodeDraft}
              passcodeDraft={passcodeDraft}
              passcodeState={passcodeState}
              redeem={redeemPasscode}
            />
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
