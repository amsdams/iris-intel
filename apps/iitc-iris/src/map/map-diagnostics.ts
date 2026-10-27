import {beginIitcRequestDiagnostics, createIitcRequestDiagnosticsSnapshot, createIitcRequestDiagnosticsState,
  finishIitcRequestDiagnostics, getIitcPortalAnalysis, type IitcMapDataPlan, type IitcRequestDiagnosticsState} from '@iris/iitc-core';
import {IITC_IRIS_MESSAGES, type IitcIrisBaseLayerId, type IitcIrisDataSourceSettings, type IitcIrisHighlighterSettings,
  type IitcIrisInteractionUpdateTimingDiagnostics, type IitcIrisLayerUpdateTimingDiagnostics, type IitcIrisMessage,
  type IitcIrisRenderEntities, type IitcIrisRenderPortal, type IitcIrisRequestDiagnostics} from '../messages';
import {isIitcAuthMessage} from '../intel/intel-request';
import {PORTAL_HIGHLIGHTER_REGISTRY} from './layers/highlighter-registry';
import type {createMapRequest, TileDiagnostics} from './map-request';
import type {createMapRenderer} from './entities/map-renderer';
import type {createMapSelectionRuntime} from './map-selection-runtime';
import type {createPortalDetailsRuntime} from '../portals/portal-details-runtime';
import type {createCommRuntime} from '../comm/comm-runtime';
import type {createPlayerTrackerRuntime} from './player-tracker/player-tracker-runtime';
import type {IitcIrisMapLifetime} from './map-runtime-lifetime';

interface MapDiagnosticsOptions {
  getLifetime: () => IitcIrisMapLifetime | undefined;
  getEntities: () => IitcIrisRenderEntities | undefined;
  getRequestSnapshot: ReturnType<typeof createMapRequest>['getSnapshot'];
  getRenderDiagnostics: ReturnType<typeof createMapRenderer>['getRenderDiagnostics'];
  getRenderPolicy: ReturnType<typeof createMapRenderer>['getRenderPolicy'];
  getPortalKeyCount: (guid: string) => number | undefined;
  setAuthRecoveryActive: (active: boolean) => void;
  getPlayerTrackerDiagnostics: ReturnType<typeof createPlayerTrackerRuntime>['getDiagnostics'];
  getHighlighterSettings: () => IitcIrisHighlighterSettings;
  getBaseLayerId: () => IitcIrisBaseLayerId;
  getDataSource: () => IitcIrisDataSourceSettings;
  getSelectedPortal: ReturnType<typeof createMapSelectionRuntime>['getSelectedPortal'];
  getPortalDetails: ReturnType<typeof createPortalDetailsRuntime>['getState'];
  getCommState: ReturnType<typeof createCommRuntime>['getState'];
}

const MAX_INTERACTION_UPDATE_DIAGNOSTICS = 10;

interface MapDiagnostics {
  postEntityStatus: (status: string, entities?: IitcIrisRenderEntities, tileDiagnostics?: TileDiagnostics) => void;
  repostLatestEntityStatus: () => void;
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
  beginIitcRequest: (endpoint: string, group?: string) => () => void;
  recordStaleGenerationCacheWarmTileKeys: (tileKeys: string[]) => void;
  recordInteractionUpdateDiagnostics: (update: IitcIrisInteractionUpdateTimingDiagnostics) => void;
  scheduleInteractionFrameDiagnostics: (update: IitcIrisInteractionUpdateTimingDiagnostics, runtimeStartedAt: number,
    sentAt?: number, mirror?: IitcIrisLayerUpdateTimingDiagnostics) => void;
  recordLayerUpdateTiming: (layerUpdate: IitcIrisLayerUpdateTimingDiagnostics) => void;
}

/** Retained page snapshots; frame callbacks still belong to the active map lifetime. */
export function createMapDiagnostics(options: MapDiagnosticsOptions): MapDiagnostics {
  const {getRenderDiagnostics, getRenderPolicy, getPortalKeyCount, setAuthRecoveryActive} = options;
  let latestInteractionUpdateDiagnostics: IitcIrisInteractionUpdateTimingDiagnostics[] = [];
  let requestDiagnosticsState: IitcRequestDiagnosticsState = createIitcRequestDiagnosticsState();
  let latestEntityStatus = 'idle';
  let latestTileDiagnostics: TileDiagnostics | undefined;

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
    options.getLifetime()?.requestFrame(() => {
      const firstFrameAt = performance.now();
      const firstAnimationFrameMs = roundTimingMs(firstFrameAt - runtimeStartedAt);
      update.firstAnimationFrameMs = firstAnimationFrameMs;
      if (mirror) mirror.firstAnimationFrameMs = firstAnimationFrameMs;
      if (sentAt !== undefined) {
        const sentToFirstAnimationFrameMs = roundTimingMs(Math.max(0, firstFrameAt - sentAt));
        update.sentToFirstAnimationFrameMs = sentToFirstAnimationFrameMs;
        if (mirror) mirror.sentToFirstAnimationFrameMs = sentToFirstAnimationFrameMs;
      }

      options.getLifetime()?.requestFrame(() => {
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

  function repostLatestEntityStatus(): void {
    const latestEntities = options.getEntities();
    if (!latestEntities || !latestTileDiagnostics) return;
    postEntityStatus(latestEntityStatus, latestEntities, latestTileDiagnostics);
  }

  function getIitcRequestDiagnostics(): IitcIrisRequestDiagnostics {
    return createIitcRequestDiagnosticsSnapshot(requestDiagnosticsState, performance.now());
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
    const {plan: latestPlan, artifacts: latestArtifactDiagnostics} = options.getRequestSnapshot();
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
      playerTracker: options.getPlayerTrackerDiagnostics(),
      portalAnalysis,
      highlighterSettings: options.getHighlighterSettings(),
      highlighterIds: PORTAL_HIGHLIGHTER_REGISTRY.map((highlighter) => highlighter.id),
      baseLayerId: options.getBaseLayerId(),
      dataSource: options.getDataSource(),
      renderPolicy: getRenderPolicy(),
      selectedPortal: options.getSelectedPortal(),
      portalDetails: options.getPortalDetails(),
      comm: options.getCommState(),
    } satisfies IitcIrisMessage, '*');
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
    const latestEntities = options.getEntities();
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

  function recordLayerUpdateTiming(layerUpdate: IitcIrisLayerUpdateTimingDiagnostics): void {
    if (latestTileDiagnostics) {
      latestTileDiagnostics = {
        ...latestTileDiagnostics,
        timing: {...(latestTileDiagnostics.timing ?? {}), layerUpdate},
      };
    }
  }

  return {postEntityStatus, repostLatestEntityStatus, getIitcRequestDiagnostics, beginIitcRequest,
    recordStaleGenerationCacheWarmTileKeys, recordInteractionUpdateDiagnostics, scheduleInteractionFrameDiagnostics,
    recordLayerUpdateTiming};
}
