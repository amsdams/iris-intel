import {createMapSelectionRuntime} from './map/map-selection-runtime';
import {createMapContextActions} from './map/map-context-actions';
import {createPortalDetailsRuntime} from './portals/portal-details-runtime';
import {createCommRuntime, normalizeCommTab} from './comm/comm-runtime';
import {createScoresRuntime} from './map/scores-runtime';
import {createPasscodeRuntime} from './agent/passcode-runtime';
import {createInventoryRuntime} from './agent/inventory-runtime';
import {createMissionsRuntime} from './map/missions/missions-runtime';
import {createPlayerTrackerRuntime} from './map/player-tracker-runtime';
import {createMapRequest, type TileDiagnostics} from './map/map-request';
import {createIntelRequest, getCsrfToken, extractVersion, looksLikeHtml, isIitcAuthMessage, createIitcAuthError} from './intel/intel-request';
import {createMapRenderer} from './map/entities/map-renderer';
import {getLayerPane, type IitcIrisCoreLayerKey, type IitcIrisLayerPaneKey, type IitcIrisMapLayers} from './map/map-layers';
import {createSearchRuntime} from './map/search/search-runtime';
import {createDrawToolsRuntime} from './map/draw-tools/draw-tools-runtime';
import {createMissionOverlay} from './map/missions/mission-overlay';
import {createBaseLayerController} from './map/base-layer-controller';
import {DEFAULT_BASE_LAYER_ID, normalizeBaseLayerId} from './map/layers/base-layer-settings';
import {createIitcIrisMapLifetime, type IitcIrisMapLifetime} from './map/map-runtime-lifetime';
import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisDataSourceSettings, type IitcIrisHighlighterSettings, type IitcIrisInteractionUpdateTimingDiagnostics, type IitcIrisLayerSettings, type IitcIrisLayerUpdateTimingDiagnostics, type IitcIrisLifecycleSettings, type IitcIrisMessage, type IitcIrisRequestDiagnostics, type IitcIrisRenderEntities, type IitcIrisRenderPortal} from './messages';
import {DEFAULT_LAYER_SETTINGS} from './map/layers/layer-registry';
import {DEFAULT_HIGHLIGHTER_ID, PORTAL_HIGHLIGHTER_REGISTRY} from './map/layers/highlighter-registry';
import {getLayerUpdatePlan} from './map/layers/layer-update-routing';
import {
  beginIitcRequestDiagnostics,
  createIitcRequestDiagnosticsSnapshot,
  createIitcRequestDiagnosticsState,
  getIitcPortalAnalysis,
  finishIitcRequestDiagnostics,
  type IitcGetEntitiesResponse,
  type IitcMapDataPlan,
  type IitcRequestDiagnosticsState,
} from '@iris/iitc-core';

const DEFAULT_CENTER: [number, number] = [52.3730796, 4.8924534];
// Initial map overview; search navigation follows IITC's DEFAULT_ZOOM separately.
const DEFAULT_ZOOM = 11;
const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';

const MAX_INTERACTION_UPDATE_DIAGNOSTICS = 10;
const IITC_IRIS_ASSET_BASE_URL = ((): string => {
  const script = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : '';
  return script ? new URL('.', script).toString() : '';
})();
const DEFAULT_HIGHLIGHTER_SETTINGS: IitcIrisHighlighterSettings = {
  active: DEFAULT_HIGHLIGHTER_ID,
};
let mapLifetime: IitcIrisMapLifetime | undefined;
let bootRetryTimer: number | undefined;

let latestEntities: IitcIrisRenderEntities | undefined;
let latestInteractionUpdateDiagnostics: IitcIrisInteractionUpdateTimingDiagnostics[] = [];

const portalHistoryByGuid = new Map<string, NonNullable<IitcIrisRenderPortal['history']>>();
let layerSettings: IitcIrisLayerSettings = DEFAULT_LAYER_SETTINGS;
let highlighterSettings: IitcIrisHighlighterSettings = DEFAULT_HIGHLIGHTER_SETTINGS;
let baseLayerId: IitcIrisBaseLayerId = DEFAULT_BASE_LAYER_ID;
let baseLayerController: ReturnType<typeof createBaseLayerController> | undefined;
let dataSource: IitcIrisDataSourceSettings = {mode: 'live'};
let lifecycleSettings: IitcIrisLifecycleSettings = {iitcMovementDelay: false};

let authRecoveryActive = false;

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
const {fetchIitcEndpointText} = createIntelRequest({getLifetime: () => mapLifetime, beginRequest: beginIitcRequest});
const portalDetails = createPortalDetailsRuntime({
  getSelectedPortalGuid: () => selection.getSelectedPortalGuid(),
  getSelectedPortal: () => selection.getSelectedPortal(),
  portalHistoryByGuid, fetchIitcEndpointText, repostLatestEntityStatus,
  onDetailsLoaded: (details, state) => selection.applyPortalDetails(details, state),
});
const {cancelActivePortalDetailsFetch} = portalDetails;
const selection = createMapSelectionRuntime({
  getMap: () => window.__iitcIrisMap,
  getEntities: () => latestEntities,
  getPortalRadius: (level, placeholder) => getPortalRadius(level, placeholder),
  isPortalVisible: (portal) => isPortalVisible(portal),
  isLinkVisible: (link) => isLinkVisible(link),
  isFieldVisible: (field) => isFieldVisible(field),
  ensureLayers, clearRenderedLayers, addRenderedLayer,
  renderEntities: (entities) => renderEntities(entities),
  selectedPortalChanged: () => inventory.selectedPortalChanged(),
  refreshSelectedPortalDetails: portalDetails.refreshSelectedPortalDetails,
  clearPortalDetails: portalDetails.clearState, cancelActivePortalDetailsFetch, repostLatestEntityStatus,
});
const {selectPortal, renderSelectedPortal, renderSelectedMapObject, zoomToAndShowPortal,
  selectMissionWaypoint, clearPortalSelection} = selection;
const {openPortalContext, openMapContextAtPoint, openMissionWaypointContext, installContextLongPress,
  isPortalClickSuppressed} = createMapContextActions({
  getMap: () => window.__iitcIrisMap,
  getEntities: () => latestEntities,
  getPortalRadius: (level, placeholder) => getPortalRadius(level, placeholder),
  isPortalVisible: (portal) => isPortalVisible(portal),
  isLinkVisible: (link) => isLinkVisible(link),
  isFieldVisible: (field) => isFieldVisible(field),
  selectPortal, selectMapObject: selection.selectMapObject, clearSelectedMapObject: selection.clearSelectedMapObject,
  zoomToAndShowPortal, findPortalByGuidOrLatLng: selection.findPortalByGuidOrLatLng,
});

const {refreshScores, cancelActiveScoresFetch} = createScoresRuntime({
  getMapCenterE6, postIntelEndpoint, getIitcRequestDiagnostics,
});
const {redeemPasscode, cancelActivePasscodeFetch} = createPasscodeRuntime({
  postIntelEndpoint, getIitcRequestDiagnostics,
});
const inventory = createInventoryRuntime({
  getSelectedPortal: () => ({guid: selection.getSelectedPortalGuid(), title: selection.getSelectedPortal()?.title}),
  postIntelEndpoint, getIitcRequestDiagnostics, postAgentState,
});
const {getPortalKeyCount, refreshInventory, refreshSubscriptionStatus, cancelActiveInventoryFetch} = inventory;

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
    selection.resolvePendingPortalSelection(entities);
  },
  getLayerSettings: () => layerSettings,
  getHighlighterSettings: () => highlighterSettings,
  hasDetailedPortals: () => mapRequests.getSnapshot().plan?.tileParams.hasPortals ?? false,
  hasPendingPortalSelection: selection.hasPendingPortalSelection,
  getPortalHistory: (guid) => portalHistoryByGuid.get(guid),
  getPortalKeyCount,
  isPortalClickSuppressed,
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
  getSelectedMission: () => missions.getState().selectedMission,
  getPortalRadius,
  isPortalClickSuppressed,
  selectMissionWaypoint,
  openMissionWaypointContext,
  clearLayers: () => clearRenderedLayers(ensureLayers().missions),
  addLayer: (layer) => addRenderedLayer(ensureLayers().missions, layer),
  pane: getLayerPane('missions'),
});

const missions = createMissionsRuntime({
  getMap: () => window.__iitcIrisMap,
  getSelectedPortal: () => ({guid: selection.getSelectedPortalGuid(), title: selection.getSelectedPortal()?.title}),
  postIntelEndpoint, getIitcRequestDiagnostics, clearMissionOverlay, renderMissionOverlay, panToMissionStart,
});
const {refreshMissions, refreshMissionDetails} = missions;

const comm = createCommRuntime({
  getMap: () => window.__iitcIrisMap,
  getLifetime: () => mapLifetime,
  getMapCenterE6, fetchIitcEndpointText, getIitcRequestDiagnostics,
  onPublicMessages: (messages) => {
    processPlayerTrackerCommMessages(messages);
    renderPlayerTracker();
  },
});
const {refreshComm, sendComm, cancelActiveCommFetch} = comm;

const playerTracker = createPlayerTrackerRuntime({
  getMap: () => window.__iitcIrisMap,
  getLifetime: () => mapLifetime,
  getLayerSettings: () => layerSettings,
  isAuthRecoveryActive: () => authRecoveryActive && dataSource.mode === 'live',
  getCommRequest: comm.getPlayerTrackerCommRequest,
  applyCommResponse: comm.applyPlayerTrackerCommResponse,
  clearLayers: () => clearRenderedLayers(ensureLayers().playerTracker),
  addLayer: (layer) => addRenderedLayer(ensureLayers().playerTracker, layer),
  repostLatestEntityStatus, zoomToAndShowPortal,
  defaultZoom: DEFAULT_ZOOM,
  assetBaseUrl: IITC_IRIS_ASSET_BASE_URL,
  pane: getLayerPane('playerTracker'),
});
const {renderPlayerTracker, processPlayerTrackerCommMessages, schedulePlayerTrackerRefresh, clearPlayerTrackerRefreshTimer} = playerTracker;

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

function cancelActivePanelRequests(): void {
  cancelActivePortalDetailsFetch();
  cancelActiveCommFetch();
  cancelActiveScoresFetch();
  cancelActivePasscodeFetch();
  cancelActiveInventoryFetch();
  missions.cancelRequests();
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
  playerTracker.clearMarkers();
  clearRenderedLayers(layers.missions);
  clearRenderedLayers(layers.userLocation);
  clearEntityLayerIndexes(layers);
  resetRenderDiagnostics();
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
    subscription: inventory.getSubscriptionState(),
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
    playerTracker: playerTracker.getDiagnostics(),
    portalAnalysis,
    highlighterSettings,
    highlighterIds: PORTAL_HIGHLIGHTER_REGISTRY.map((highlighter) => highlighter.id),
    baseLayerId,
    dataSource,
    renderPolicy: getRenderPolicy(),
    selectedPortal: selection.getSelectedPortal(),
    portalDetails: portalDetails.getState(),
    comm: comm.getState(),
  } satisfies IitcIrisMessage, '*');
}

function setAuthRecoveryActive(active: boolean): void {
  authRecoveryActive = active;
  if (active) {
    mapRequests.cancelScheduledRefresh();
    clearPlayerTrackerRefreshTimer();
  }
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
    playerTracker.dispose();
    inventory.dispose();
    mapRequests.dispose();
    invalidateSearch();
    baseLayerController?.dispose();
    baseLayerController = undefined;
    latestEntities = undefined;
    invalidateRenderContext();
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
