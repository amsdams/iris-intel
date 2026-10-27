import {createMapRequest, type TileDiagnostics} from './map/map-request';
import {createIntelRequest, getCsrfToken, extractVersion, looksLikeHtml, isIitcAuthMessage, isIitcAuthError, createIitcAuthError} from './intel/intel-request';
import {createMapRenderer} from './map/entities/map-renderer';
import {getLayerPane, type IitcIrisCoreLayerKey, type IitcIrisLayerPaneKey, type IitcIrisMapLayers} from './map/map-layers';
import {createSearchRuntime} from './map/search/search-runtime';
import {createDrawToolsRuntime} from './map/draw-tools/draw-tools-runtime';
import {createMissionOverlay} from './map/missions/mission-overlay';
import {createBaseLayerController} from './map/base-layer-controller';
import {DEFAULT_BASE_LAYER_ID, normalizeBaseLayerId} from './map/layers/base-layer-settings';
import {createPlayerTrackerMarkers, type PlayerTrackerMarkerGroup} from './map/player-tracker-markers';
import {createPlayerTrackerGroupPopup} from './map/player-tracker-group-popup';
import {createIitcIrisMapLifetime, type IitcIrisMapLifetime} from './map/map-runtime-lifetime';
import L, {type Layer as LeafletLayer, type LeafletMouseEvent, type Map as LeafletMap} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisDataSourceSettings, type IitcIrisHighlighterSettings, type IitcIrisInteractionUpdateTimingDiagnostics, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLayerUpdateTimingDiagnostics, type IitcIrisLifecycleSettings, type IitcIrisMapContextPortalAnchor, type IitcIrisMessage, type IitcIrisMissionDetails, type IitcIrisMissionSource, type IitcIrisMissionSummary, type IitcIrisMissionWaypoint, type IitcIrisMissionsState, type IitcIrisPasscodeRewardItem, type IitcIrisPasscodeState, type IitcIrisPortalDetailsState, type IitcIrisRequestDiagnostics, type IitcIrisRenderEntities, type IitcIrisRenderField, type IitcIrisRenderLink, type IitcIrisRenderPortal, type IitcIrisScoresState, type IitcIrisSelectedPortal, type IitcIrisSubscriptionState} from './messages';
import {DEFAULT_LAYER_SETTINGS} from './map/layers/layer-registry';
import {DEFAULT_HIGHLIGHTER_ID, PORTAL_HIGHLIGHTER_REGISTRY} from './map/layers/highlighter-registry';
import {getLayerUpdatePlan} from './map/layers/layer-update-routing';
import {createIitcIrisMapContextMessage, installIitcIrisContextGestures} from './map/map-context-runtime';
import {convertIitcGeodesicLatLngs, createIitcGeodesicPolygon, createIitcGeodesicPolyline} from './map/leaflet-geodesic';
import {
  beginIitcRequestDiagnostics,
  createIitcRequestDiagnosticsSnapshot,
  createIitcRequestDiagnosticsState,
  createIitcCommChannelData,
  genIitcCommSendPlextPostData,
  getIitcCommChannelMessages,
  getIitcInventoryPortalKeyCount,
  getIitcMissionBounds,
  getIitcMapContextFieldPerimeterMeters,
  getIitcMapContextFieldPortalAnchors,
  getIitcMapContextFieldPortalGuids,
  getIitcMapContextLinkDistanceMeters,
  getIitcMapContextLinkPortalAnchors,
  getIitcMapContextLinkPortalGuids,
  getIitcPortalAnalysis,
  applyIitcPlayerTrackerCommMessages,
  getIitcPlayerTrackerDiagnostics,
  getIitcPlayerTrackerLatLng,
  getIitcPlayerTrackerEventOpacity,
  getIitcPlayerTrackerTraceAgeBucket,
  findIitcPortalByGuidOrLatLng,
  finishIitcRequestDiagnostics,
  isIitcPlayerTrackerEnabled,
  isIitcPlayerTrackerTeamVisible,
  isIitcPlayerTrackerVisibleForZoom,
  IITC_PLAYER_TRACKER_LINE_COLOR,
  IITC_PLAYER_TRACKER_MAX_DISPLAY_EVENTS,
  IITC_PLAYER_TRACKER_MAX_TIME,
  IITC_PLAYER_TRACKER_MIN_ZOOM,
  parseIitcInventoryResponse,
  parseIitcMissionDetailsResponse,
  parseIitcTopMissionsResponse,
  planIitcPortalLinkNavigation,
  planIitcMapContextPoint,
  pruneIitcPlayerTrackerStored,
  renderIitcCommMarkup,
  resolveIitcPendingPortalSelection,
  summarizeIitcInventory,
  planIitcCommRequest,
  applyIitcCommResponse,
  createIitcCommAuthState,
  createIitcCommErrorState,
  createIitcCommLoadingState,
  createIitcCommSuccessState,
  applyIitcPortalDetailsResponse,
  createIitcPortalDetailsAuthState,
  createIitcPortalDetailsErrorState,
  createIitcPortalDetailsLoadingState,
  formatIitcMissionDuration,
  getIitcCachedPortalDetails,
  type IitcCommChannel,
  type IitcCommChannelData,
  type IitcCommMessage,
  type IitcGetEntitiesResponse,
  type IitcInventorySummary,
  type IitcMissionDetails as CoreIitcMissionDetails,
  type IitcMissionSummary as CoreIitcMissionSummary,
  type IitcMapDataPlan,
  type IitcPortalDetailsCache,
  type IitcPortalDetailsResponse,
  type IitcPlayerTrackerDiagnostics,
  type IitcPlayerTrackerStored,
  type IitcRequestDiagnosticsState,
  writeIitcPortalDetailsCache,
} from '@iris/iitc-core';

const DEFAULT_CENTER: [number, number] = [52.3730796, 4.8924534];
// Initial map overview; search navigation follows IITC's DEFAULT_ZOOM separately.
const DEFAULT_ZOOM = 11;
const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';

const LONG_PRESS_MS = 600;
const LONG_PRESS_MOVE_TOLERANCE_PX = 12;
const LONG_PRESS_CLICK_SUPPRESS_MS = 700;
const PORTAL_CONTEXT_HIT_TOLERANCE_PX = 10;
const LINK_CONTEXT_HIT_TOLERANCE_PX = 7;
const PLAYER_TRACKER_COMM_REFRESH_MS = 120_000;
const MAX_INTERACTION_UPDATE_DIAGNOSTICS = 10;
const MISSION_DETAILS_CACHE_MS = 3 * 24 * 60 * 60 * 1000;
const PORTAL_MISSIONS_CACHE_MS = 21 * 24 * 60 * 60 * 1000;
const MISSION_DETAILS_CACHE_STORAGE_KEY = 'iitc-iris:missions:details-cache';
const PORTAL_MISSIONS_CACHE_STORAGE_KEY = 'iitc-iris:missions:portal-cache';
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
const DEFAULT_HIGHLIGHTER_SETTINGS: IitcIrisHighlighterSettings = {
  active: DEFAULT_HIGHLIGHTER_ID,
};
let mapLifetime: IitcIrisMapLifetime | undefined;
let bootRetryTimer: number | undefined;

let latestEntities: IitcIrisRenderEntities | undefined;
let latestInteractionUpdateDiagnostics: IitcIrisInteractionUpdateTimingDiagnostics[] = [];

let selectedPortalGuid: string | undefined;
let selectedPortal: IitcIrisSelectedPortal | null = null;
let selectedMapObject: {type: 'link' | 'field'; guid: string} | null = null;
let pendingPortalSelection: {guid?: string; lat?: number; lng?: number} | null = null;
let latestPortalDetails: IitcIrisPortalDetailsState | null = null;
let suppressPortalClickUntil = 0;
let lastContextPostAt = 0;
const portalDetailsCache: IitcPortalDetailsCache = new Map();
const portalHistoryByGuid = new Map<string, NonNullable<IitcIrisRenderPortal['history']>>();
let layerSettings: IitcIrisLayerSettings = DEFAULT_LAYER_SETTINGS;
let highlighterSettings: IitcIrisHighlighterSettings = DEFAULT_HIGHLIGHTER_SETTINGS;
let baseLayerId: IitcIrisBaseLayerId = DEFAULT_BASE_LAYER_ID;
let baseLayerController: ReturnType<typeof createBaseLayerController> | undefined;
let dataSource: IitcIrisDataSourceSettings = {mode: 'live'};
let lifecycleSettings: IitcIrisLifecycleSettings = {iitcMovementDelay: false};

let authRecoveryActive = false;

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
const playerTrackerMarkers = createPlayerTrackerMarkers({
  createMarker: (group, now) => {
    const {name, player} = group.members[0];
    const last = player.events[player.events.length - 1];
    const marker = createPlayerTrackerMarker(group.latLng, name, player.team,
      getIitcPlayerTrackerEventOpacity(last.time, now), last.time);
    marker.setIcon(getPlayerTrackerGroupIcon(group));
    marker.options.title = getPlayerTrackerGroupTitle(group);
    marker.options.keyboard = group.members.length > 1;
    const map = window.__iitcIrisMap;
    if (map) marker.addTo(map);
    return marker;
  },
  createPopup: (group, selectedName, select) => createPlayerTrackerGroupPopup(
    group, selectedName, select, createPlayerTrackerPopup, formatPlayerTrackerAgo),
  updateMarker: (marker, group, previous) => {
    if (group.members.length !== previous.members.length || getPlayerTrackerGroupTeam(group) !== getPlayerTrackerGroupTeam(previous)) {
      marker.setIcon(getPlayerTrackerGroupIcon(group));
    }
    const title = getPlayerTrackerGroupTitle(group);
    marker.options.title = title;
    const icon = marker.getElement();
    if (icon) icon.title = title;
  },
});
let requestDiagnosticsState: IitcRequestDiagnosticsState = createIitcRequestDiagnosticsState();

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

const {
  renderEntities, getPortalRadius, getRenderPolicy, isPortalVisible, isLinkVisible, isFieldVisible,
  getSecondaryEntityRenderUpdate, refreshPortalMarkerStylesForHighlighter, clearCoreEntityLayerGroup, clearEntityLayerIndexes,
  invalidateRenderContext, resetRenderDiagnostics, getRenderDiagnostics,
} = createMapRenderer({
  getMap: () => window.__iitcIrisMap,
  defaultZoom: DEFAULT_ZOOM,
  ensureLayers, clearRenderedLayers, addRenderedLayer,
  getEntities: () => latestEntities,
  onEntitiesChanged: (entities) => {
    latestEntities = entities;
    if (pendingPortalSelection) {
      const portal = resolveIitcPendingPortalSelection(pendingPortalSelection, entities.portals);
      if (portal) selectPortal(portal, false);
    }
  },
  getLayerSettings: () => layerSettings,
  getHighlighterSettings: () => highlighterSettings,
  hasDetailedPortals: () => mapRequests.getSnapshot().plan?.tileParams.hasPortals ?? false,
  hasPendingPortalSelection: () => pendingPortalSelection !== null,
  getPortalHistory: (guid) => portalHistoryByGuid.get(guid),
  getPortalKeyCount,
  isPortalClickSuppressed: () => Date.now() < suppressPortalClickUntil,
  selectPortal, openPortalContext, renderSelectedPortal, renderSelectedMapObject,
  renderIitcDrawTools: () => renderIitcDrawTools(),
});

const {runSearch, clearSearch, previewSearchResult, selectSearchResult, invalidateSearch} = createSearchRuntime({
  getMap: () => window.__iitcIrisMap,
  getLifetime: () => mapLifetime,
  getPortals: () => latestEntities?.portals ?? [],
  getPortalRadius,
  selectPortal,
  clearLayers: () => clearRenderedLayers(ensureLayers().search),
  addLayer: (layer) => addRenderedLayer(ensureLayers().search, layer),
  pane: getLayerPane('search'),
});

const {applyIitcDrawToolsAction, renderIitcDrawTools, postIitcDrawToolsStatus} = createDrawToolsRuntime({
  getMap: () => window.__iitcIrisMap,
  getEntities: () => latestEntities,
  getLayerSettings: () => layerSettings,
  hasIncompletePortalData: () => mapRequests.getSnapshot().plan?.tileParams.hasPortals === false,
  isLinkVisible,
  clearLayers: () => clearRenderedLayers(ensureLayers().drawnItems),
  addLayer: (layer) => addRenderedLayer(ensureLayers().drawnItems, layer),
  pane: getLayerPane('drawnItems'),
});

const {clearMissionOverlay, renderMissionOverlay, panToMissionStart, zoomToSelectedMission} = createMissionOverlay({
  getMap: () => window.__iitcIrisMap,
  getPortals: () => latestEntities?.portals ?? [],
  getSelectedMission: () => latestMissionsState.selectedMission,
  getPortalRadius,
  isPortalClickSuppressed: () => Date.now() < suppressPortalClickUntil,
  selectMissionWaypoint,
  openMissionWaypointContext,
  clearLayers: () => clearRenderedLayers(ensureLayers().missions),
  addLayer: (layer) => addRenderedLayer(ensureLayers().missions, layer),
  pane: getLayerPane('missions'),
});

const {fetchIitcEndpointText} = createIntelRequest({getLifetime: () => mapLifetime, beginRequest: beginIitcRequest});
const mapRequests = createMapRequest({
  getMap: () => window.__iitcIrisMap,
  getLifetime: () => mapLifetime,
  getDataSource: () => dataSource,
  getLifecycleSettings: () => lifecycleSettings,
  isAuthRecoveryActive: () => authRecoveryActive,
  getEntities: () => latestEntities,
  portalHistoryByGuid, fetchIitcEndpointText, renderEntities, renderTileDebug, clearAllRenderedLayers,
  postEntityStatus, recordStaleGenerationCacheWarmTileKeys,
});
const {scheduleEntityRefresh, getMoveRefreshDelayMs, cancelActiveEntityFetch} = mapRequests;

function roundTimingMs(value: number): number {
  return Math.round(value * 10) / 10;
}

function recordInteractionUpdateDiagnostics(update: IitcIrisInteractionUpdateTimingDiagnostics): void {
  latestInteractionUpdateDiagnostics = [
    ...latestInteractionUpdateDiagnostics,
    update,
  ].slice(-MAX_INTERACTION_UPDATE_DIAGNOSTICS);
}

function scheduleInteractionFrameDiagnostics(
  update: IitcIrisInteractionUpdateTimingDiagnostics,
  runtimeStartedAt: number,
  sentAt?: number,
  mirror?: IitcIrisLayerUpdateTimingDiagnostics,
): void {
  mapLifetime?.requestFrame(() => {
    const firstFrameAt = performance.now();
    const firstAnimationFrameMs = roundTimingMs(firstFrameAt - runtimeStartedAt);
    update.firstAnimationFrameMs = firstAnimationFrameMs;
    if (mirror) mirror.firstAnimationFrameMs = firstAnimationFrameMs;
    if (sentAt !== undefined) {
      const sentToFirstAnimationFrameMs = roundTimingMs(Math.max(0, firstFrameAt - sentAt));
      update.sentToFirstAnimationFrameMs = sentToFirstAnimationFrameMs;
      if (mirror) mirror.sentToFirstAnimationFrameMs = sentToFirstAnimationFrameMs;
    }

    mapLifetime?.requestFrame(() => {
      const secondFrameAt = performance.now();
      const secondAnimationFrameMs = roundTimingMs(secondFrameAt - runtimeStartedAt);
      update.secondAnimationFrameMs = secondAnimationFrameMs;
      if (mirror) mirror.secondAnimationFrameMs = secondAnimationFrameMs;
      if (sentAt !== undefined) {
        const sentToSecondAnimationFrameMs = roundTimingMs(Math.max(0, secondFrameAt - sentAt));
        update.sentToSecondAnimationFrameMs = sentToSecondAnimationFrameMs;
        if (mirror) mirror.sentToSecondAnimationFrameMs = sentToSecondAnimationFrameMs;
      }
      repostLatestEntityStatus();
    });
  });
}

let latestEntityStatus = 'idle';
let latestTileDiagnostics: TileDiagnostics | undefined;
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

function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = window.localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    return normalizeBaseLayerId(value);
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
  baseLayerController?.select(normalizeBaseLayerId(nextBaseLayerId));
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
  mapRequests.mapMoveStart();
}

function postMapMoved(): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  mapRequests.mapMoveEnd();
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
  scheduleEntityRefresh(getMoveRefreshDelayMs());
  schedulePlayerTrackerRefresh();
}

declare global {
  interface Window {
    __iitcIrisMap?: LeafletMap;
    __iitcIrisMapContainer?: HTMLElement;
    __iitcIrisLayers?: IitcIrisMapLayers;
  }
}

function toLatLng(latE6: number, lngE6: number): [number, number] {
  return [latE6 / 1e6, lngE6 / 1e6];
}

function getPortalKeyCount(portalGuid: string): number | undefined {
  if (!latestInventorySummary) return undefined;
  return getIitcInventoryPortalKeyCount(latestInventorySummary, portalGuid)?.count ?? 0;
}

function ensureLayers(): NonNullable<Window['__iitcIrisLayers']> {
  if (window.__iitcIrisLayers) return window.__iitcIrisLayers;
  const map = window.__iitcIrisMap;
  const coreLayerGroups: Record<IitcIrisCoreLayerKey, L.LayerGroup> = {
    fields: L.layerGroup(),
    links: L.layerGroup(),
    portals: L.layerGroup(),
  };
  if (map) {
    if (layerSettings.fields) coreLayerGroups.fields.addTo(map);
    if (layerSettings.links) coreLayerGroups.links.addTo(map);
    if (layerSettings.portals) coreLayerGroups.portals.addTo(map);
  }

  window.__iitcIrisLayers = {
    tiles: [],
    fields: [],
    links: [],
    portals: [],
    coreLayerGroups,
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
    entityLayerIndex: {
      fields: new Map<string, LeafletLayer[]>(),
      links: new Map<string, LeafletLayer[]>(),
      portals: new Map<string, LeafletLayer[]>(),
    },
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

function clearAllRenderedLayers(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.tiles);
  clearCoreEntityLayerGroup(layers, 'fields');
  clearCoreEntityLayerGroup(layers, 'links');
  clearCoreEntityLayerGroup(layers, 'portals');
  clearRenderedLayers(layers.selectedPortal);
  clearRenderedLayers(layers.selectedMapObject);
  clearRenderedLayers(layers.ornaments);
  clearRenderedLayers(layers.artifacts);
  clearRenderedLayers(layers.labels);
  clearRenderedLayers(layers.drawnItems);
  clearRenderedLayers(layers.playerTracker);
  playerTrackerMarkers.clear();
  clearRenderedLayers(layers.missions);
  clearRenderedLayers(layers.userLocation);
  clearEntityLayerIndexes(layers);
  resetRenderDiagnostics();
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

function renderSelectedPortal(): void {
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
  if (!isPortalVisible(portal)) return;
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
  const plan = planIitcMapContextPoint({lat, lng, zoom: map?.getZoom(), portal});
  window.postMessage(createIitcIrisMapContextMessage(plan.payload), '*');
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
  const plan = planIitcMapContextPoint({lat, lng, zoom: map?.getZoom(), [contextTarget]: object});
  window.postMessage(createIitcIrisMapContextMessage(plan.payload), '*');
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

function getPortalLabelByGuid(guid: string | undefined, fallback: string): string {
  if (!guid || !latestEntities) return fallback;
  const portal = latestEntities.portals.find((candidate) => candidate.guid === guid);
  return portal?.title || guid;
}

function getLinkPortalGuids(link: IitcIrisRenderLink): string[] {
  return getIitcMapContextLinkPortalGuids(link);
}

function getLinkPortalAnchors(link: IitcIrisRenderLink): IitcIrisMapContextPortalAnchor[] {
  return getIitcMapContextLinkPortalAnchors(link, getPortalLabelByGuid);
}

function getLinkDistanceMeters(link: IitcIrisRenderLink): number {
  return getIitcMapContextLinkDistanceMeters(link);
}

function getFieldPortalGuids(field: IitcIrisRenderField): string[] {
  return getIitcMapContextFieldPortalGuids(field);
}

function getFieldPortalAnchors(field: IitcIrisRenderField): IitcIrisMapContextPortalAnchor[] {
  return getIitcMapContextFieldPortalAnchors(field, getPortalLabelByGuid);
}

function getFieldPerimeterMeters(field: IitcIrisRenderField): number | undefined {
  return getIitcMapContextFieldPerimeterMeters(field);
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
  return findIitcPortalByGuidOrLatLng(latestEntities?.portals ?? [], {guid, lat, lng});
}

function selectPortalByLatLng(lat: number | undefined, lng: number | undefined): IitcIrisRenderPortal | undefined {
  const plan = planIitcPortalLinkNavigation(latestEntities?.portals ?? [], {lat, lng});
  if (plan.portal) {
    selectPortal(plan.portal);
    return plan.portal;
  }
  if (plan.pendingSelection) pendingPortalSelection = plan.pendingSelection;
  return undefined;
}

function zoomToAndShowPortal(guid: string | undefined, lat: number | undefined, lng: number | undefined, zoom: number | undefined): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  const selectedPortal = guid ? undefined : selectPortalByLatLng(lat, lng);
  if (selectedPortal) {
    map.setView(toLatLng(selectedPortal.latE6, selectedPortal.lngE6), zoom ?? Math.max(map.getZoom(), 15));
    return;
  }
  const plan = planIitcPortalLinkNavigation(latestEntities?.portals ?? [], {guid, lat, lng, zoom});
  if (plan.portal) {
    const latLng = toLatLng(plan.portal.latE6, plan.portal.lngE6);
    map.setView(latLng, plan.focus?.zoom ?? Math.max(map.getZoom(), 15));
    selectPortal(plan.portal);
    return;
  }
  if (plan.pendingSelection) pendingPortalSelection = plan.pendingSelection;
  if (!plan.focus) {
    return;
  }
  map.setView([plan.focus.lat, plan.focus.lng], plan.focus.zoom ?? Math.max(map.getZoom(), 15));
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
  const {plan: latestPlan, response: latestResponse} = mapRequests.getSnapshot();
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

function createPlayerTrackerMarker(latLng: [number, number], playerName: string, team: IitcIrisRenderPortal['team'], opacity: number, latestTime: number): L.Marker {
  const icon = getPlayerTrackerMarkerIcon(team, playerName);
  return L.marker(latLng, {
    icon,
    opacity,
    keyboard: false,
    pane: getLayerPane('playerTracker'),
    title: `${playerName}, ${formatPlayerTrackerAgo(latestTime)} ago`,
  });
}

function getPlayerTrackerMarkerIcon(team: IitcIrisRenderPortal['team'], playerName: string): L.Icon | L.DivIcon {
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

function getPlayerTrackerGroupTeam(group: PlayerTrackerMarkerGroup): string {
  const team = group.members[0].player.team;
  return group.members.every(member => member.player.team === team) ? team : 'mixed';
}

function getPlayerTrackerGroupTitle(group: PlayerTrackerMarkerGroup): string {
  if (group.members.length > 1) return `${group.members.length} agents last seen here`;
  const {name, player} = group.members[0];
  return `${name}, ${formatPlayerTrackerAgo(player.events[player.events.length - 1].time)} ago`;
}

function getPlayerTrackerGroupIcon(group: PlayerTrackerMarkerGroup): L.Icon | L.DivIcon {
  if (group.members.length === 1) {
    const {name, player} = group.members[0];
    return getPlayerTrackerMarkerIcon(player.team, name);
  }
  return L.divIcon({
    className: `iitc-iris-player-tracker-count iitc-iris-player-tracker-marker-${getPlayerTrackerGroupTeam(group)}`,
    html: `<span>${group.members.length}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

function renderPlayerTracker(): void {
  const layers = ensureLayers();
  clearRenderedLayers(layers.playerTracker);
  playerTrackerStored = pruneIitcPlayerTrackerStored(playerTrackerStored);

  if (!isPlayerTrackerVisible()) {
    playerTrackerMarkers.clear();
    updatePlayerTrackerDiagnostics(0, 0);
    repostLatestEntityStatus();
    return;
  }

  const now = Date.now();
  let traces = 0;
  const visiblePlayers: IitcPlayerTrackerStored = {};

  for (const [playerName, player] of Object.entries(playerTrackerStored)) {
    if (player.events.length === 0) continue;
    if (!isIitcPlayerTrackerTeamVisible(player.team, layerSettings)) continue;

    for (let index = 1; index < player.events.length; index += 1) {
      const current = player.events[index];
      const previous = player.events[index - 1];
      const currentLatLng = getIitcPlayerTrackerLatLng(current);
      const previousLatLng = getIitcPlayerTrackerLatLng(previous);
      if (currentLatLng[0] === previousLatLng[0] && currentLatLng[1] === previousLatLng[1]) continue;
      const ageBucket = getIitcPlayerTrackerTraceAgeBucket(current.time, now);
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

    visiblePlayers[playerName] = player;
  }

  const markers = playerTrackerMarkers.render(visiblePlayers, now);
  updatePlayerTrackerDiagnostics(markers, traces);
  repostLatestEntityStatus();
}

function repostLatestEntityStatus(): void {
  if (!latestEntities || !latestTileDiagnostics) return;
  postEntityStatus(latestEntityStatus, latestEntities, latestTileDiagnostics);
}

function getIitcRequestDiagnostics(): IitcIrisRequestDiagnostics {
  return createIitcRequestDiagnosticsSnapshot(requestDiagnosticsState, performance.now());
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
  const result = beginIitcRequestDiagnostics(requestDiagnosticsState, endpoint, performance.now(), group);
  requestDiagnosticsState = result.state;
  postRequestDiagnostics();
  return () => {
    const nextState = finishIitcRequestDiagnostics(requestDiagnosticsState, result.request.id);
    if (nextState === requestDiagnosticsState) return;
    requestDiagnosticsState = nextState;
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
    abortController.signal.throwIfAborted();
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
    abortController.signal.throwIfAborted();
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

function isPlayerTrackerVisible(): boolean {
  const map = window.__iitcIrisMap;
  return isIitcPlayerTrackerVisibleForZoom(layerSettings, map?.getZoom(), IITC_PLAYER_TRACKER_MIN_ZOOM);
}

function updatePlayerTrackerDiagnostics(markers = playerTrackerDiagnostics.markers, traces = playerTrackerDiagnostics.traces): void {
  playerTrackerDiagnostics = getIitcPlayerTrackerDiagnostics(playerTrackerStored, {
    enabled: isIitcPlayerTrackerEnabled(layerSettings),
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
    mapLifetime?.cancelScheduled(playerTrackerRefreshTimer);
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
  playerTrackerRefreshTimer = mapLifetime?.schedule(() => {
    playerTrackerRefreshTimer = undefined;
    void refreshPlayerTrackerComm();
  }, delayMs);
}

function processPlayerTrackerCommMessages(messages: IitcCommMessage[]): void {
  const result = applyIitcPlayerTrackerCommMessages({
    messages,
    stored: playerTrackerStored,
    processedGuids: playerTrackerProcessedCommGuids,
    latestCommTime: playerTrackerLatestCommTime,
  });
  playerTrackerProcessedCommGuids.clear();
  for (const guid of result.processedGuids) playerTrackerProcessedCommGuids.add(guid);
  playerTrackerStored = result.stored;
  playerTrackerLatestCommTime = result.latestCommTime;
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
  if (event.data?.type === IITC_IRIS_MESSAGES.panBy) {
    const map = window.__iitcIrisMap;
    if (!map || typeof event.data.panX !== 'number' || typeof event.data.panY !== 'number') return;
    map.panBy([event.data.panX, event.data.panY]);
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
    selectSearchResult(event.data.searchResult);
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
    const layerUpdateStartedAt = performance.now();
    const sentAt = event.data.sentAt;
    const previousLayerSettings = layerSettings;
    layerSettings = event.data.layerSettings;
    const layerUpdatePlan = getLayerUpdatePlan(previousLayerSettings, layerSettings);
    const layerUpdateTiming: IitcIrisLayerUpdateTimingDiagnostics = {
      changedKeys: layerUpdatePlan.changedKeys.map(String),
    };
    if (sentAt !== undefined) {
      layerUpdateTiming.dispatchDelayMs = roundTimingMs(Math.max(0, layerUpdateStartedAt - sentAt));
    }

    if (latestEntities && layerUpdatePlan.renderEntities) {
      renderEntities(latestEntities, {
        previousLayerSettings,
        changedLayerKeys: layerUpdatePlan.changedKeys,
        secondaryUpdate: getSecondaryEntityRenderUpdate(layerUpdatePlan.changedKeys),
        timing: layerUpdateTiming,
      });
    }
    if (layerUpdatePlan.renderTileDebug) renderLatestTileDebug();
    if (layerUpdatePlan.renderDrawTools) renderIitcDrawTools();
    if (layerUpdatePlan.renderPlayerTracker) {
      renderPlayerTracker();
      schedulePlayerTrackerRefresh();
    }
    layerUpdateTiming.totalMs = roundTimingMs(performance.now() - layerUpdateStartedAt);
    const interactionUpdate: IitcIrisInteractionUpdateTimingDiagnostics = {
      kind: 'layer',
      at: Date.now(),
      ...layerUpdateTiming,
    };
    recordInteractionUpdateDiagnostics(interactionUpdate);
    if (latestTileDiagnostics) {
      latestTileDiagnostics = {
        ...latestTileDiagnostics,
        timing: {
          ...(latestTileDiagnostics.timing ?? {}),
          layerUpdate: layerUpdateTiming,
        },
      };
    }
    scheduleInteractionFrameDiagnostics(interactionUpdate, layerUpdateStartedAt, sentAt, layerUpdateTiming);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.layerSettings && event.data.highlighterSettings) {
    const highlighterUpdateStartedAt = performance.now();
    const sentAt = event.data.sentAt;
    highlighterSettings = event.data.highlighterSettings;
    const highlighterUpdateTiming: IitcIrisInteractionUpdateTimingDiagnostics = {
      kind: 'highlighter',
      at: Date.now(),
      activeHighlighter: highlighterSettings.active,
      renderPath: 'none',
    };
    if (sentAt !== undefined) {
      highlighterUpdateTiming.dispatchDelayMs = roundTimingMs(Math.max(0, highlighterUpdateStartedAt - sentAt));
    }
    if (latestEntities) {
      const renderStartedAt = performance.now();
      const refreshedExistingStyles = refreshPortalMarkerStylesForHighlighter();
      if (refreshedExistingStyles) {
        highlighterUpdateTiming.renderPath = 'style-refresh';
      } else {
        renderEntities(latestEntities);
        highlighterUpdateTiming.renderPath = 'full-render';
      }
      highlighterUpdateTiming.renderEntitiesMs = roundTimingMs(performance.now() - renderStartedAt);
    }
    highlighterUpdateTiming.totalMs = roundTimingMs(performance.now() - highlighterUpdateStartedAt);
    recordInteractionUpdateDiagnostics(highlighterUpdateTiming);
    scheduleInteractionFrameDiagnostics(highlighterUpdateTiming, highlighterUpdateStartedAt, sentAt);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.layerSettings && event.data.baseLayerId) {
    setBaseLayer(event.data.baseLayerId);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.dataSourceSettings && event.data.dataSource) {
    dataSource = event.data.dataSource;
    mapRequests.resetForDataSourceChange();
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
  const {plan: latestPlan, artifacts: latestArtifactDiagnostics} = mapRequests.getSnapshot();
  const portals = entities?.portals ?? [];
  const artifactCounts = countRenderArtifacts(portals);
  const {ornaments: latestOrnamentDiagnostics, mutation: latestRenderMutationDiagnostics} = getRenderDiagnostics();
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
    renderMutation: latestRenderMutationDiagnostics,
    timing: {
      ...(tileDiagnostics.timing ?? {}),
      interactionUpdates: latestInteractionUpdateDiagnostics,
    },
    requestDiagnostics: getIitcRequestDiagnostics(),
    playerTracker: playerTrackerDiagnostics,
    portalAnalysis,
    highlighterSettings,
    highlighterIds: PORTAL_HIGHLIGHTER_REGISTRY.map((highlighter) => highlighter.id),
    baseLayerId,
    dataSource,
    renderPolicy: getRenderPolicy(),
    selectedPortal,
    portalDetails: latestPortalDetails,
    comm: latestCommState,
  } satisfies IitcIrisMessage, '*');
}

function setAuthRecoveryActive(active: boolean): void {
  authRecoveryActive = active;
  if (active) {
    mapRequests.cancelScheduledRefresh();
    clearPlayerTrackerRefreshTimer();
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
  const postData = planIitcCommRequest({
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
    if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`, {cause: error});
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
    if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`, {cause: error});
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
      abortController.signal.throwIfAborted();
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
      if (currentSubscriptionAbortController === abortController) {
        currentSubscriptionAbortController = undefined;
        currentSubscriptionPromise = undefined;
      }
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
    abortController.signal.throwIfAborted();
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
    abortController.signal.throwIfAborted();
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
    abortController.signal.throwIfAborted();
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
  const lifetime = mapLifetime;
  if (!lifetime) return;
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
    lifetime.signal.throwIfAborted();
    latestCommState = {
      ...latestCommState,
      tab,
      sendStatus: 'sent',
      sendError: undefined,
    };
    postCommState();
    await refreshComm(tab);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
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
    latestCommState = createIitcCommAuthState({
      channel: tab,
      channelData: commChannelsData[tab],
      getOlderMsgs,
      bounds,
      error: 'missing Intel version',
    });
    postCommState();
    return;
  }

  const abortController = new AbortController();
  currentCommAbortController = abortController;
  const startedAt = performance.now();
  latestCommState = {
    ...latestCommState,
    ...createIitcCommLoadingState({
      channel: tab,
      channelData: commChannelsData[tab],
      getOlderMsgs,
      bounds,
      toPreview: toCommMessagePreview,
    }),
  };
  postCommState();

  try {
    const response = await fetchComm(version, tab, bounds, getOlderMsgs, abortController.signal);
    abortController.signal.throwIfAborted();
    const elapsedMs = performance.now() - startedAt;
    const isAscendingOrder = !getOlderMsgs && commChannelsData[tab].newestTimestamp > -1;
    const writeResult = applyIitcCommResponse(response, commChannelsData[tab], getOlderMsgs, isAscendingOrder, tab);
    commChannelsData[tab] = writeResult.channelData;
    const commMessages = getIitcCommChannelMessages(commChannelsData[tab]);
    if (tab === 'all') {
      processPlayerTrackerCommMessages(commMessages);
      renderPlayerTracker();
    }
    latestCommState = createIitcCommSuccessState({
      channel: tab,
      applyResult: writeResult,
      getOlderMsgs,
      elapsedMs,
      bounds,
      toPreview: toCommMessagePreview,
    });
    postCommState();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    latestCommState = createIitcCommErrorState({
      channel: tab,
      channelData: commChannelsData[tab],
      getOlderMsgs,
      elapsedMs: performance.now() - startedAt,
      bounds,
      error: error instanceof Error ? error.message : String(error),
      status: isIitcAuthError(error) ? 'auth' : 'error',
    });
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
    abortController.signal.throwIfAborted();
    const writeResult = applyIitcCommResponse(response, commChannelsData.all, false, commChannelsData.all.newestTimestamp > -1, 'all');
    commChannelsData.all = writeResult.channelData;
    const messages = getIitcCommChannelMessages(commChannelsData.all);
    processPlayerTrackerCommMessages(messages);
    renderPlayerTracker();
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      renderPlayerTracker();
    }
  } finally {
    if (currentPlayerTrackerCommAbortController === abortController) {
      currentPlayerTrackerCommAbortController = undefined;
      if (isPlayerTrackerVisible()) schedulePlayerTrackerRefresh(PLAYER_TRACKER_COMM_REFRESH_MS);
    }
  }
}

async function refreshSelectedPortalDetails(guid: string): Promise<void> {
  cancelActivePortalDetailsFetch();
  const cachedDetails = getIitcCachedPortalDetails(portalDetailsCache, guid);
  if (cachedDetails) {
    latestPortalDetails = cachedDetails;
    repostLatestEntityStatus();
  }
  const version = extractVersion();
  if (!version) {
    latestPortalDetails = createIitcPortalDetailsAuthState(guid, 'missing Intel version');
    repostLatestEntityStatus();
    return;
  }

  const abortController = new AbortController();
  currentPortalDetailsAbortController = abortController;
  const startedAt = performance.now();
  if (!cachedDetails) {
    latestPortalDetails = createIitcPortalDetailsLoadingState(guid);
    repostLatestEntityStatus();
  }

  try {
    const response = await fetchPortalDetails(guid, version, abortController.signal);
    abortController.signal.throwIfAborted();
    if (selectedPortalGuid !== guid) return;
    const linkCount = selectedPortal?.links.count ?? 0;
    const applyResult = applyIitcPortalDetailsResponse({
      response,
      guid,
      linkCount,
      elapsedMs: performance.now() - startedAt,
    });
    const details = applyResult.details;
    if (!details) {
      latestPortalDetails = applyResult.state;
    } else {
      latestPortalDetails = applyResult.state;
      writeIitcPortalDetailsCache(portalDetailsCache, guid, latestPortalDetails);
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
    const elapsedMs = performance.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : String(error);
    latestPortalDetails = isIitcAuthError(error)
      ? createIitcPortalDetailsAuthState(guid, errorMessage)
      : createIitcPortalDetailsErrorState(guid, elapsedMs, errorMessage);
    repostLatestEntityStatus();
  } finally {
    if (currentPortalDetailsAbortController === abortController) currentPortalDetailsAbortController = undefined;
  }
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

function installContextLongPress(map: LeafletMap): () => void {
  return installIitcIrisContextGestures(map, {
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
  window.clearTimeout(bootRetryTimer);
  bootRetryTimer = undefined;
  const container = document.getElementById('iitc-iris-map');
  if (!container) {
    bootRetryTimer = window.setTimeout(boot, 50);
    return;
  }
  if (mapLifetime && window.__iitcIrisPageRuntimeInitialized && window.__iitcIrisMapContainer === container && window.__iitcIrisMap) return;

  // Dispose the old map before creating resources for its replacement.
  if (mapLifetime) mapLifetime.dispose();
  else window.__iitcIrisMap?.remove();

  const storedView = loadUrlMapView() ?? loadStoredMapView();
  const map = L.map(container, {
    zoomControl: false,
    preferCanvas: true,
    tapHold: true,
  }).setView([storedView.lat, storedView.lng], storedView.zoom);

  window.__iitcIrisMap = map;
  window.__iitcIrisPageRuntimeInitialized = true;
  const removeGestures = installContextLongPress(map);
  mapLifetime = createIitcIrisMapLifetime(map, () => {
    removeGestures();
    cancelActiveEntityFetch();
    cancelActivePanelRequests();
    cancelActivePlayerTrackerFetch();
    currentSubscriptionAbortController?.abort();
    currentSubscriptionAbortController = undefined;
    currentSubscriptionPromise = undefined;
    if (latestSubscriptionState.status === 'loading') latestSubscriptionState = {status: 'unknown'};
    mapRequests.dispose();
    invalidateSearch();
    playerTrackerRefreshTimer = undefined;
    baseLayerController?.dispose();
    baseLayerController = undefined;
    latestEntities = undefined;
    invalidateRenderContext();
    playerTrackerMarkers.clear();
    window.__iitcIrisLayers = undefined;
    window.__iitcIrisMap = undefined;
    window.__iitcIrisMapContainer = undefined;
    window.__iitcIrisPageRuntimeInitialized = false;
    mapLifetime = undefined;
  });
  window.__iitcIrisMapContainer = container;
  createIitcIrisPanes(map);

  baseLayerController = createBaseLayerController(map, IITC_IRIS_ASSET_BASE_URL, (status) => {
    baseLayerId = status.baseLayerId;
    storeBaseLayerId(baseLayerId);
    window.postMessage({type: IITC_IRIS_MESSAGES.baseLayerStatus, ...status}, '*');
  });
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
  mapLifetime.schedule(() => {
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

// The page bridge survives map replacement; map-specific resources belong to mapLifetime.
window.addEventListener('IITC_IRIS_CONTAINER_READY', boot);
window.addEventListener('message', handleMessage);
boot();
