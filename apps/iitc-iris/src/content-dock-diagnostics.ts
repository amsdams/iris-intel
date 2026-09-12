import {formatElapsedSeconds} from './ui-status';
import {
  LAYER_REGISTRY_DIAGNOSTICS,
} from './layer-registry';
import {IITC_MAX_REQUESTS, IITC_NUM_TILES_PER_REQUEST, IITC_MAX_TILE_RETRIES} from '@iris/iitc-core';
import type {
  CameraState,
  EntityFetchState,
} from './content-message-adapter';
import type {
  IitcIrisAgentState,
  IitcIrisBaseLayerId,
  IitcIrisCommState,
  IitcIrisInventoryState,
  IitcIrisLayerSettings,
  IitcIrisLifecycleSettings,
  IitcIrisMissionsState,
  IitcIrisPasscodeState,
  IitcIrisRequestDiagnostics,
  IitcIrisScoresState,
} from './messages';
import type {IitcIrisSidePanelId} from './menu-registry';
import type {IitcMapDataPlan} from '@iris/iitc-core';
import type {createDataSourceSettings} from './content-storage-settings';

export interface DockDiagnosticsParams {
  status: string;
  intelUrl: string;
  camera: CameraState;
  plan: IitcMapDataPlan | null;
  summaryMode: string;
  requestBatches: number[];
  entityFetch: EntityFetchState;
  baseLayerId: IitcIrisBaseLayerId;
  dataSource: ReturnType<typeof createDataSourceSettings>;
  requestDiagnostics: IitcIrisRequestDiagnostics;
  lifecycleSettings: IitcIrisLifecycleSettings;
  layerSettings: IitcIrisLayerSettings;
  activeSidePanel: IitcIrisSidePanelId | null;
  agentState: IitcIrisAgentState;
  commState: IitcIrisCommState;
  scoresState: IitcIrisScoresState;
  missionsState: IitcIrisMissionsState;
  passcodeState: IitcIrisPasscodeState;
  inventoryState: IitcIrisInventoryState;
}

export function createDockDiagnostics({
  status,
  intelUrl,
  camera,
  plan,
  summaryMode,
  requestBatches,
  entityFetch,
  baseLayerId,
  dataSource,
  requestDiagnostics,
  lifecycleSettings,
  layerSettings,
  activeSidePanel,
  agentState,
  commState,
  scoresState,
  missionsState,
  passcodeState,
  inventoryState,
}: DockDiagnosticsParams): Record<string, unknown> {
  return {
    app: 'IITC IRIS',
    status,
    intelUrl,
    camera: {
      lat: camera.lat,
      lng: camera.lng,
      zoom: camera.zoom,
      bounds: camera.bounds,
    },
    plan: plan
      ? {
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
        }
      : null,
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
        elapsedSeconds:
          entityFetch.artifactFetchElapsedMs === null
            ? null
            : Number(formatElapsedSeconds(entityFetch.artifactFetchElapsedMs)),
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
      elapsedSeconds:
        entityFetch.elapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.elapsedMs)),
      firstRenderMs: entityFetch.firstRenderElapsedMs,
      firstRenderSeconds:
        entityFetch.firstRenderElapsedMs === null
          ? null
          : Number(formatElapsedSeconds(entityFetch.firstRenderElapsedMs)),
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
}
