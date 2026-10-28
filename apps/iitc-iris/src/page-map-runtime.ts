import {createMapDiagnostics} from './map/map-diagnostics';
import {createMapSettingsRuntime} from './map/map-settings-runtime';
import {createAgentRuntime} from './agent/agent-runtime';
import {DEFAULT_ZOOM} from './map/map-view-settings';
import {loadStoredMapView, loadUrlMapView, storeMapView, loadStoredBaseLayerId,
  storeBaseLayerId, syncIntelMapCookies, syncUrlMapView} from './map/map-view';
import {createMapSelectionRuntime} from './map/map-selection-runtime';
import {createMapContextActions} from './map/map-context-actions';
import {createPortalDetailsRuntime} from './portals/portal-details-runtime';
import {createCommRuntime, normalizeCommTab} from './comm/comm-runtime';
import {createScoresRuntime} from './map/scores/scores-runtime';
import {createPasscodeRuntime} from './agent/passcode/passcode-runtime';
import {createInventoryRuntime} from './agent/inventory/inventory-runtime';
import {createMissionsRuntime} from './map/missions/missions-runtime';
import {createPlayerTrackerRuntime} from './map/player-tracker/player-tracker-runtime';
import {createMapRequest} from './map/map-request';
import {createIntelRequest} from './intel/intel-request';
import {createMapRenderer} from './map/entities/map-renderer';
import {getLayerPane, type IitcIrisCoreLayerKey, type IitcIrisLayerPaneKey, type IitcIrisMapLayers} from './map/map-layers';
import {createSearchRuntime} from './map/search/search-runtime';
import {createDrawToolsRuntime} from './map/draw-tools/draw-tools-runtime';
import {createMissionOverlay} from './map/missions/mission-overlay';
import {createBaseLayerController} from './map/layers/base-layer-controller';
import {DEFAULT_BASE_LAYER_ID, normalizeBaseLayerId} from './map/layers/base-layer-settings';
import {createIitcIrisMapLifetime, type IitcIrisMapLifetime} from './map/map-runtime-lifetime';
import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisBaseLayerId, type IitcIrisDataSourceSettings, type IitcIrisLifecycleSettings, type IitcIrisMessage, type IitcIrisRenderEntities, type IitcIrisRenderPortal} from './messages';
import {type IitcGetEntitiesResponse, type IitcMapDataPlan} from '@iris/iitc-core';

const IITC_IRIS_ASSET_BASE_URL = ((): string => {
  const script = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : '';
  return script ? new URL('.', script).toString() : '';
})();
let mapLifetime: IitcIrisMapLifetime | undefined;
let bootRetryTimer: number | undefined;

let latestEntities: IitcIrisRenderEntities | undefined;

const portalHistoryByGuid = new Map<string, NonNullable<IitcIrisRenderPortal['history']>>();
let baseLayerId: IitcIrisBaseLayerId = DEFAULT_BASE_LAYER_ID;
let baseLayerController: ReturnType<typeof createBaseLayerController> | undefined;
let dataSource: IitcIrisDataSourceSettings = {mode: 'live'};
let lifecycleSettings: IitcIrisLifecycleSettings = {iitcMovementDelay: false};

let authRecoveryActive = false;

const mapSettings = createMapSettingsRuntime({
  getEntities: () => latestEntities,
  renderEntities: (...args) => renderEntities(...args),
  getSecondaryEntityRenderUpdate: (...args) => getSecondaryEntityRenderUpdate(...args),
  refreshPortalMarkerStylesForHighlighter: () => refreshPortalMarkerStylesForHighlighter(),
  renderLatestTileDebug,
  renderIitcDrawTools: () => renderIitcDrawTools(),
  renderPlayerTracker: () => renderPlayerTracker(),
  schedulePlayerTrackerRefresh: () => schedulePlayerTrackerRefresh(),
  recordInteractionUpdateDiagnostics: (...args) => diagnostics.recordInteractionUpdateDiagnostics(...args),
  recordLayerUpdateTiming: (...args) => diagnostics.recordLayerUpdateTiming(...args),
  scheduleInteractionFrameDiagnostics: (...args) => diagnostics.scheduleInteractionFrameDiagnostics(...args),
});
const diagnostics = createMapDiagnostics({
  getLifetime: () => mapLifetime,
  getEntities: () => latestEntities,
  getRequestSnapshot: () => mapRequests.getSnapshot(),
  getRenderDiagnostics: () => getRenderDiagnostics(),
  getRenderPolicy: () => getRenderPolicy(),
  getPortalKeyCount: (guid) => getPortalKeyCount(guid),
  setAuthRecoveryActive,
  getPlayerTrackerDiagnostics: () => playerTracker.getDiagnostics(),
  getHighlighterSettings: mapSettings.getHighlighterSettings,
  getBaseLayerId: () => baseLayerId,
  getDataSource: () => dataSource,
  getSelectedPortal: () => selection.getSelectedPortal(),
  getPortalDetails: () => portalDetails.getState(),
  getCommState: () => comm.getState(),
});
const {postEntityStatus, repostLatestEntityStatus, getIitcRequestDiagnostics, beginIitcRequest,
  recordStaleGenerationCacheWarmTileKeys} = diagnostics;
const {postAgentState} = createAgentRuntime(() => inventory.getSubscriptionState());
const {fetchIitcEndpointText, postIntelEndpoint} = createIntelRequest({getLifetime: () => mapLifetime, beginRequest: beginIitcRequest});
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
  onInventoryChanged: () => refreshKeyCountLabels(),
});
const {getPortalKeyCount, refreshInventory, refreshSubscriptionStatus, cancelActiveInventoryFetch} = inventory;

const {
  renderEntities, getPortalRadius, getRenderPolicy, isPortalVisible, isLinkVisible, isFieldVisible,
  getSecondaryEntityRenderUpdate, refreshPortalMarkerStylesForHighlighter, clearCoreEntityLayerGroup, clearEntityLayerIndexes,
  invalidateRenderContext, resetRenderDiagnostics, getRenderDiagnostics, refreshKeyCountLabels,
} = createMapRenderer({
  getMap: () => window.__iitcIrisMap,
  defaultZoom: DEFAULT_ZOOM,
  ensureLayers, clearRenderedLayers, addRenderedLayer,
  getEntities: () => latestEntities,
  onEntitiesChanged: (entities) => {
    latestEntities = entities;
    selection.resolvePendingPortalSelection(entities);
  },
  getLayerSettings: mapSettings.getLayerSettings,
  getHighlighterSettings: mapSettings.getHighlighterSettings,
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
  getLayerSettings: mapSettings.getLayerSettings,
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
  getLayerSettings: mapSettings.getLayerSettings,
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
    if (mapSettings.getLayerSettings().fields) coreLayerGroups.fields.addTo(map);
    if (mapSettings.getLayerSettings().links) coreLayerGroups.links.addTo(map);
    if (mapSettings.getLayerSettings().portals) coreLayerGroups.portals.addTo(map);
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
  if (!mapSettings.getLayerSettings().tiles) return;

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
    mapSettings.applyLayerSettings(event.data.layerSettings, event.data.sentAt);
  }
  if (event.data?.type === IITC_IRIS_MESSAGES.layerSettings && event.data.highlighterSettings) {
    mapSettings.applyHighlighterSettings(event.data.highlighterSettings, event.data.sentAt);
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
