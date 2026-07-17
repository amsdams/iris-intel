import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisDataSourceSettings, type IitcIrisDrawToolsItem, type IitcIrisEntitySource, type IitcIrisHighlighterSettings, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLifecycleSettings, type IitcIrisMapTimingDiagnostics, type IitcIrisMessage, type IitcIrisMissionsState, type IitcIrisPasscodeState, type IitcIrisPlayerTrackerDiagnostics, type IitcIrisPortalAnalysis, type IitcIrisPortalDetailsState, type IitcIrisPortalHighlighterId, type IitcIrisQueueDiagnostics, type IitcIrisRequestDiagnostics, type IitcIrisRenderMutationDiagnostics, type IitcIrisRenderPolicy, type IitcIrisRenderQueueDiagnostics, type IitcIrisScoresState, type IitcIrisSearchState, type IitcIrisSelectedPortal} from './messages';
import {mapContextSelected, portalSelected, type IitcIrisMapContextSelection} from './selection-lifecycle';
import type {IitcIrisSheetId, IitcIrisSidePanelId} from './menu-registry';
import type {IitcBounds} from '@iris/iitc-core';

export interface CameraState {
  lat: number;
  lng: number;
  zoom: number;
  bounds: IitcBounds | null;
}

export interface EntityFetchState {
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

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export interface IitcIrisContentMessageContext {
  activeSidePanel: IitcIrisSidePanelId | null;
  baseLayerId: IitcIrisBaseLayerId;
  cameraZoom: number;
  dataSource: IitcIrisDataSourceSettings;
  highlighterSettings: IitcIrisHighlighterSettings;
  layerSettings: IitcIrisLayerSettings;
  lifecycleSettings: IitcIrisLifecycleSettings;
}

export interface IitcIrisContentMessageActions {
  setActiveSheet: StateSetter<IitcIrisSheetId>;
  setActiveSidePanel: StateSetter<IitcIrisSidePanelId | null>;
  setAgentState: StateSetter<IitcIrisAgentState>;
  setCamera: StateSetter<CameraState>;
  setCommState: StateSetter<IitcIrisCommState>;
  setDrawToolsImportStatus: StateSetter<string>;
  setDrawToolsItems: StateSetter<IitcIrisDrawToolsItem[]>;
  setEntityFetch: StateSetter<EntityFetchState>;
  setInventoryState: StateSetter<IitcIrisInventoryState>;
  setMapContext: StateSetter<IitcIrisMapContextSelection | null>;
  setMissionsState: StateSetter<IitcIrisMissionsState>;
  setPasscodeState: StateSetter<IitcIrisPasscodeState>;
  setPortalImageOpen: StateSetter<boolean>;
  setRequestDiagnostics: StateSetter<IitcIrisRequestDiagnostics>;
  setScoresState: StateSetter<IitcIrisScoresState>;
  setSearchState: StateSetter<IitcIrisSearchState>;
  setStatus: StateSetter<string>;
  storeActiveSheet: (value: IitcIrisSheetId) => void;
  storeSidePanelId: (value: IitcIrisSidePanelId | null) => void;
}

export function entityFetchStateFromMessage(message: IitcIrisMessage, current: EntityFetchState): EntityFetchState {
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

export function handleIitcIrisContentMessage(
  message: IitcIrisMessage,
  context: IitcIrisContentMessageContext,
  actions: IitcIrisContentMessageActions,
): void {
  if (typeof message.type === 'string' && message.type.startsWith('IRIS_')) {
    actions.setEntityFetch((current) => ({...current, collision: true}));
  }
  if (message.type === IITC_IRIS_MESSAGES.pageReady) {
    actions.setStatus('leaflet ready');
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt: performance.now(),
      layerSettings: context.layerSettings,
      baseLayerId: context.baseLayerId,
    } satisfies IitcIrisMessage, '*');
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      highlighterSettings: context.highlighterSettings,
    } satisfies IitcIrisMessage, '*');
    window.postMessage({
      type: IITC_IRIS_MESSAGES.dataSourceSettings,
      dataSource: context.dataSource,
    } satisfies IitcIrisMessage, '*');
    window.postMessage({
      type: IITC_IRIS_MESSAGES.lifecycleSettings,
      lifecycleSettings: context.lifecycleSettings,
    } satisfies IitcIrisMessage, '*');
    window.postMessage({
      type: IITC_IRIS_MESSAGES.drawTools,
      drawToolsAction: 'requestStatus',
    } satisfies IitcIrisMessage, '*');
  }
  if (message.type === IITC_IRIS_MESSAGES.mapMoved) {
    actions.setCamera((current) => ({
      lat: message.lat ?? current.lat,
      lng: message.lng ?? current.lng,
      zoom: message.zoom ?? current.zoom,
      bounds: message.bounds ?? current.bounds,
    }));
  }
  if (message.type === IITC_IRIS_MESSAGES.mapContext) {
    if (message.contextTarget === 'portal') {
      const effect = portalSelected(Boolean(context.activeSidePanel));
      actions.setMapContext(effect.mapContext);
      if (effect.cancelPanelRequests) {
        window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
      }
      actions.setPortalImageOpen(false);
      actions.setActiveSidePanel(null);
      actions.storeSidePanelId(null);
      actions.setActiveSheet(effect.activeSheet);
      actions.storeActiveSheet(effect.activeSheet);
    } else if (typeof message.lat === 'number' && typeof message.lng === 'number') {
      const effect = mapContextSelected(message, context.cameraZoom, Boolean(context.activeSidePanel));
      if (!effect) return;
      actions.setMapContext(effect.mapContext);
      if (effect.cancelPanelRequests) {
        window.postMessage({type: IITC_IRIS_MESSAGES.cancelPanelRequests} satisfies IitcIrisMessage, '*');
      }
      actions.setPortalImageOpen(false);
      actions.setActiveSidePanel(null);
      actions.storeSidePanelId(null);
      actions.setActiveSheet(effect.activeSheet);
      actions.storeActiveSheet(effect.activeSheet);
      actions.setStatus(effect.status);
    }
  }
  if (message.type === IITC_IRIS_MESSAGES.entityStatus) {
    actions.setEntityFetch((current) => entityFetchStateFromMessage(message, current));
    if (message.selectedPortal) actions.setMapContext(null);
    if (message.requestDiagnostics) actions.setRequestDiagnostics(message.requestDiagnostics);
    if (message.comm) actions.setCommState(message.comm);
  }
  if (message.type === IITC_IRIS_MESSAGES.commStatus && message.comm) {
    actions.setCommState(message.comm);
    if (message.requestDiagnostics) actions.setRequestDiagnostics(message.requestDiagnostics);
  }
  if (message.type === IITC_IRIS_MESSAGES.scoresStatus && message.scores) {
    actions.setScoresState(message.scores);
    if (message.requestDiagnostics) actions.setRequestDiagnostics(message.requestDiagnostics);
  }
  if (message.type === IITC_IRIS_MESSAGES.passcodeStatus && message.passcode) {
    actions.setPasscodeState(message.passcode);
    if (message.requestDiagnostics) actions.setRequestDiagnostics(message.requestDiagnostics);
  }
  if (message.type === IITC_IRIS_MESSAGES.inventoryStatus && message.inventory) {
    actions.setInventoryState(message.inventory);
    if (message.requestDiagnostics) actions.setRequestDiagnostics(message.requestDiagnostics);
  }
  if (message.type === IITC_IRIS_MESSAGES.missionsStatus && message.missions) {
    actions.setMissionsState(message.missions);
    if (message.requestDiagnostics) actions.setRequestDiagnostics(message.requestDiagnostics);
  }
  if (message.type === IITC_IRIS_MESSAGES.requestStatus && message.requestDiagnostics) {
    actions.setRequestDiagnostics(message.requestDiagnostics);
  }
  if (message.type === IITC_IRIS_MESSAGES.agentStatus && message.agent) {
    actions.setAgentState(message.agent);
  }
  if (message.type === IITC_IRIS_MESSAGES.searchStatus && message.search) {
    actions.setSearchState(message.search);
  }
  if (message.type === IITC_IRIS_MESSAGES.drawToolsStatus) {
    actions.setDrawToolsItems(message.drawToolsItems ?? []);
    if (message.drawToolsError) {
      actions.setDrawToolsImportStatus(message.drawToolsError);
    } else if (message.drawToolsStatusText) {
      actions.setDrawToolsImportStatus(message.drawToolsStatusText);
    }
  }
}
