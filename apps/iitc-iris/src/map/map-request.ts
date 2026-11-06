import type {Map as LeafletMap} from 'leaflet';
import {
  classifyIitcTileDiagnostics,
  createIitcResponseBucketDiagnostics,
  createIitcTileQueueRequestBatches,
  createIitcMapDataPlan,
  getIitcTileQueueRefillDecision,
  IitcDataCache,
  getIitcMapRefreshDelayMs,
  type IitcMapTilePayload,
  type IitcRawGameEntity,
  type IitcGetEntitiesResponse, type IitcMapDataPlan,
} from '@iris/iitc-core';
import type {
  IitcIrisDataSourceSettings, IitcIrisLifecycleSettings, IitcIrisMapTimingDiagnostics,
  IitcIrisRenderEntities, IitcIrisRenderPortal,
} from '../messages';
import {createMissingIntelVersionError, extractVersion, isIitcAuthError, type IntelRequest} from '../intel/intel-request';
import type {IitcIrisMapLifetime} from './map-runtime-lifetime';
import {createMapEntityTransport, type MapTileBatchResult} from './map-entity-transport';
import {createMapRefreshSession, filterMapResponseToTiles} from './map-refresh-session';
import {createArtifactFetchDiagnostics,
  type TileDiagnostics, type ArtifactFetchDiagnostics} from './map-request-diagnostics';
import {adaptMapEntities, getArtifactTypes} from './map-entity-adapter';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const FAST_MOVE_REFRESH_DELAY_MS = 250;
const FAST_DOWNLOAD_DELAY_MS = 0;
const IITC_MOVE_REFRESH_DELAY_MS = 400;
const IITC_DOWNLOAD_DELAY_MS = 1000;
const ENABLE_STALE_GENERATION_CACHE_WARMING = false;

interface MapRequestOptions {
  getMap: () => Pick<LeafletMap, 'getBounds' | 'getCenter' | 'getZoom'> | undefined;
  getLifetime: () => IitcIrisMapLifetime | undefined;
  getDataSource: () => IitcIrisDataSourceSettings;
  getLifecycleSettings: () => IitcIrisLifecycleSettings;
  isAuthRecoveryActive: () => boolean;
  isIdle?: () => boolean;
  getEntities: () => IitcIrisRenderEntities | undefined;
  portalHistoryByGuid: Map<string, NonNullable<IitcIrisRenderPortal['history']>>;
  fetchIitcEndpointText: IntelRequest['fetchIitcEndpointText'];
  renderEntities: (entities: IitcIrisRenderEntities) => void;
  renderTileDebug: (plan: IitcMapDataPlan, response: IitcGetEntitiesResponse) => void;
  clearAllRenderedLayers: () => void;
  postEntityStatus: (status: string, entities?: IitcIrisRenderEntities, diagnostics?: TileDiagnostics) => void;
  recordStaleGenerationCacheWarmTileKeys: (tileKeys: string[]) => void;
}

interface MapRequestSnapshot {
  plan: IitcMapDataPlan | undefined;
  response: IitcGetEntitiesResponse | undefined;
  artifacts: ArtifactFetchDiagnostics;
}

interface MapRequest {
  refreshEntities: () => Promise<void>;
  scheduleEntityRefresh: (delayMs?: number) => void;
  cancelActiveEntityFetch: () => void;
  cancelScheduledRefresh: () => void;
  resumeRefresh: () => void;
  getMoveRefreshDelayMs: () => number;
  mapMoveStart: () => void;
  mapMoveEnd: () => void;
  resetForDataSourceChange: () => void;
  dispose: () => void;
  getSnapshot: () => MapRequestSnapshot;
}

/** Coordinate existing IITC-shaped cache, tile/refill/render queues and generation ownership. */
export function createMapRequest({
  getMap, getLifetime, getDataSource, getLifecycleSettings, isAuthRecoveryActive, isIdle = (): boolean => false, getEntities, portalHistoryByGuid,
  fetchIitcEndpointText, renderEntities, renderTileDebug, clearAllRenderedLayers, postEntityStatus,
  recordStaleGenerationCacheWarmTileKeys,
}: MapRequestOptions): MapRequest {
  let latestFetchGeneration = 0;
  let latestRequestKey = '';
  let latestPlan: IitcMapDataPlan | undefined;
  let latestResponse: IitcGetEntitiesResponse | undefined;
  let latestWantedTileKeys = new Set<string>();
  let activeMapDataRefreshBridge: ActiveMapDataRefreshBridge | undefined;
  const mapDataCache = new IitcDataCache<IitcMapTilePayload>();
  let refreshTimer: number | undefined;
  let periodicTimer: number | undefined;
  let mapMoveInProgress = false;
  let currentFetchAbortController: AbortController | undefined;
  interface ActiveMapDataRefreshBridge {
    generation: number;
    processExternalBatch(result: MapTileBatchResult): boolean;
  }
  let latestArtifactDiagnostics = createArtifactFetchDiagnostics();
  const {fetchEntityBatchResult, fetchFixtureResponse, fetchArtifactPortals} = createMapEntityTransport({getLifetime, fetchIitcEndpointText});

  function cancelActiveEntityFetch(): void {
    currentFetchAbortController?.abort();
    currentFetchAbortController = undefined;
  }

  function createPlanFromMap(): IitcMapDataPlan | null {
    const map = getMap();
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

  function prepareRenderEntities(response: IitcGetEntitiesResponse, generation: number, artifactEntities: IitcRawGameEntity[] = []): IitcIrisRenderEntities {
    const {entities, historyUpdates} = adaptMapEntities(response, generation, portalHistoryByGuid, artifactEntities);
    for (const [guid, history] of historyUpdates) portalHistoryByGuid.set(guid, history);
    return entities;
  }

  function resetArtifactDiagnostics(status = 'disabled'): void {
    latestArtifactDiagnostics = createArtifactFetchDiagnostics(status);
  }

  async function waitForIitcQueueDelay(delayMs: number, generation: number, signal: AbortSignal): Promise<boolean> {
    const lifetime = getLifetime();
    if (!lifetime || lifetime.signal.aborted || signal.aborted) return false;
    if (delayMs <= 0) return generation === latestFetchGeneration && !signal.aborted;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (value: boolean): void => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        lifetime.signal.removeEventListener('abort', onAbort);
        lifetime.cancelScheduled(timer);
        resolve(value);
      };
      const onAbort = (): void => finish(false);
      const timer = lifetime.schedule(() => finish(generation === latestFetchGeneration && !signal.aborted), delayMs);
      signal.addEventListener('abort', onAbort, {once: true});
      lifetime.signal.addEventListener('abort', onAbort, {once: true});
    });
  }

  function storeSuccessfulTilePayloads(response: IitcGetEntitiesResponse | undefined, tileKeys: string[]): string[] {
    const storedTileKeys: string[] = [];
    if (!response) return storedTileKeys;
    for (const tileKey of tileKeys) {
      const tile = response.result?.map?.[tileKey];
      if (tile && !tile.error) {
        mapDataCache.store(tileKey, tile);
        storedTileKeys.push(tileKey);
      }
    }
    return storedTileKeys;
  }

  function storeWantedSuccessfulTilePayloads(response: IitcGetEntitiesResponse | undefined, tileKeys: string[]): string[] {
    return storeSuccessfulTilePayloads(
      response,
      tileKeys.filter((tileKey) => latestWantedTileKeys.has(tileKey)),
    );
  }

  function getMoveRefreshDelayMs(): number {
    return getLifecycleSettings().iitcMovementDelay ? IITC_MOVE_REFRESH_DELAY_MS : FAST_MOVE_REFRESH_DELAY_MS;
  }

  function getDownloadDelayMs(): number {
    return getLifecycleSettings().iitcMovementDelay ? IITC_DOWNLOAD_DELAY_MS : FAST_DOWNLOAD_DELAY_MS;
  }

  async function fetchArtifactEntitiesForRender(version: string, signal: AbortSignal, generation: number): Promise<IitcRawGameEntity[]> {
    if (generation !== latestFetchGeneration) return [];
    const startTime = performance.now();
    latestArtifactDiagnostics = createArtifactFetchDiagnostics('loading');

    try {
      const entities = await fetchArtifactPortals(version, signal);
      signal.throwIfAborted();
      if (generation !== latestFetchGeneration) return [];
      latestArtifactDiagnostics = {
        status: entities.length > 0 ? 'ready' : 'empty',
        portalCount: entities.length,
        types: getArtifactTypes(entities),
        elapsedMs: performance.now() - startTime,
      };
      return entities;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (isIitcAuthError(error)) throw error;
      if (generation !== latestFetchGeneration) return [];
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

  function scheduleEntityRefresh(delayMs = FAST_MOVE_REFRESH_DELAY_MS): void {
    const dataSource = getDataSource();
    getLifetime()?.cancelScheduled(refreshTimer);
    getLifetime()?.cancelScheduled(periodicTimer);
    if (isAuthRecoveryActive() && dataSource.mode === 'live') return;
    refreshTimer = getLifetime()?.schedule(() => {
      void refreshEntities();
    }, delayMs);
  }

  async function refreshEntities(): Promise<void> {
    const dataSource = getDataSource();
    const refreshStartTime = performance.now();
    let generation = latestFetchGeneration;
    let abortController: AbortController | undefined;
    let authError = false;
    try {
      const plan = createPlanFromMap();
      if (!plan || plan.tileKeys.length === 0) return;

      const requestKey = plan.tileKeys.join('|');
      const sourceKey = dataSource.mode === 'fixture' ? `fixture:${dataSource.id}` : 'live';
      const refreshKey = `${sourceKey}|${requestKey}`;
      if (refreshKey === latestRequestKey) return;

      latestRequestKey = refreshKey;

      generation = latestFetchGeneration + 1;
      latestFetchGeneration = generation;

      if (dataSource.mode === 'fixture') {
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
          renderQueue: null,
          entitySource: 'fixture',
        });
        const fixtureResponse = await fetchFixtureResponse(dataSource);
        if (generation !== latestFetchGeneration) return;
        const entities = prepareRenderEntities(fixtureResponse, generation);
        const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyIitcTileDiagnostics(fixtureResponse, plan.tileKeys);
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
          renderQueue: null,
          entitySource: 'fixture',
        });
        return;
      }

      const version = extractVersion();
      if (!version) throw createMissingIntelVersionError('getEntities');
      abortController = new AbortController();
      const liveAbortController = abortController;
      currentFetchAbortController = abortController;
      latestPlan = plan;
      latestWantedTileKeys = new Set(plan.tileKeys);
      const timingDiagnostics: IitcIrisMapTimingDiagnostics = {
        movementDelayMs: getMoveRefreshDelayMs(),
      };
      let artifactEntitiesPromise: Promise<IitcRawGameEntity[]> | undefined;
      const getArtifactEntitiesPromise = (): Promise<IitcRawGameEntity[]> => {
        artifactEntitiesPromise ??= fetchArtifactEntitiesForRender(version, liveAbortController.signal, generation);
        return artifactEntitiesPromise;
      };
      const session = createMapRefreshSession(plan.tileKeys, mapDataCache);
      let firstRenderElapsedMs: number | undefined;
      let lastProgressRenderTime = 0;
      const renderLiveProgress = (response: IitcGetEntitiesResponse, entities: IitcIrisRenderEntities, force = false): IitcIrisRenderEntities | undefined => {
        if (mapMoveInProgress) return getEntities();
        const now = performance.now();
        if (!force && firstRenderElapsedMs !== undefined && now - lastProgressRenderTime < 500) return getEntities();
        renderEntities(entities);
        renderTileDebug(plan, response);
        lastProgressRenderTime = now;
        if (firstRenderElapsedMs === undefined) {
          firstRenderElapsedMs = now - refreshStartTime;
          void getArtifactEntitiesPromise().catch(() => []);
        }
        return entities;
      };
      let progressEntities: IitcIrisRenderEntities | undefined;
      if (session.cachedResponse) {
        const entities = prepareRenderEntities(session.cachedResponse, generation);
        latestPlan = plan;
        progressEntities = renderLiveProgress(session.cachedResponse, entities, true);
        timingDiagnostics.cacheMs = performance.now() - refreshStartTime;
      }
      postEntityStatus(`fetching ${plan.tileKeys.length} tiles`, progressEntities, {
        ...session.getDiagnostics('initial'),
        firstRenderElapsedMs,
        viewportBounds: plan.viewportBounds,
        timing: timingDiagnostics,
      });

      const processCompletedBatch = (result: MapTileBatchResult, startedAsRetry: boolean, countActiveRequest = true): number => {
        if (result.error && isIitcAuthError(result.error)) throw result.error;
        const {status, delayMs} = session.applyBatch(result, startedAsRetry, countActiveRequest);
        const entities = prepareRenderEntities(session.response, generation);
        const diagnostics = session.getDiagnostics('progress');
        const statusEntities = renderLiveProgress(session.response, entities, session.batchCount === 1);
        postEntityStatus(status, statusEntities, {
          ...diagnostics,
          firstRenderElapsedMs,
          viewportBounds: plan.viewportBounds,
          timing: timingDiagnostics,
        });
        return delayMs;
      };
      activeMapDataRefreshBridge = {
        generation,
        processExternalBatch: (result): boolean => {
          if (generation !== latestFetchGeneration) return false;
          const wantedTileKeys = result.tileKeys.filter((tileKey) => session.queueState.queuedTileKeys.includes(tileKey));
          if (wantedTileKeys.length === 0) return false;
          processCompletedBatch({
            ...result,
            tileKeys: wantedTileKeys,
            response: result.response ? filterMapResponseToTiles(result.response, wantedTileKeys) : undefined,
          }, false, false);
          return true;
        },
      };
      timingDiagnostics.downloadDelayMs = session.queueState.queuedTileKeys.length > 0 ? getDownloadDelayMs() : 0;
      const runIitcRefillQueue = async (): Promise<boolean> => {
        const inFlight = new Map<number, Promise<{id: number; result: MapTileBatchResult; startedAsRetry: boolean}>>();
        let requestId = 0;
        let nextRefillAt = 0;
        const fillOpenRequestSlots = (): void => {
          const batches = createIitcTileQueueRequestBatches(session.queueState);
          for (const batch of batches) {
            const startedAsRetry = batch.some((tileKey) => (session.queueState.tileErrorCount[tileKey] ?? 0) > 0);
            session.startRequest(batch);
            const id = requestId;
            requestId += 1;
            inFlight.set(id, fetchEntityBatchResult(batch, version, liveAbortController.signal)
              .then((result) => ({id, result, startedAsRetry})));
          }
        };

        fillOpenRequestSlots();
        while (inFlight.size > 0) {
          const settled = await Promise.race(inFlight.values());
          inFlight.delete(settled.id);
          if (generation !== latestFetchGeneration) {
            const deliveredToCurrentRefresh = activeMapDataRefreshBridge?.generation === latestFetchGeneration
              ? activeMapDataRefreshBridge.processExternalBatch(settled.result)
              : false;
            if (deliveredToCurrentRefresh) {
              session.markStale();
              return false;
            }
            const warmedTileKeys = ENABLE_STALE_GENERATION_CACHE_WARMING
              ? storeSuccessfulTilePayloads(settled.result.response, settled.result.tileKeys)
              : storeWantedSuccessfulTilePayloads(settled.result.response, settled.result.tileKeys);
            recordStaleGenerationCacheWarmTileKeys(warmedTileKeys);
            session.markStale();
            return false;
          }
          const queueDelayMs = processCompletedBatch(settled.result, settled.startedAsRetry);
          if (queueDelayMs > 0) {
            nextRefillAt = Math.max(nextRefillAt, performance.now() + queueDelayMs);
          }
          const refillDecision = getIitcTileQueueRefillDecision({
            nowMs: performance.now(),
            nextRefillAtMs: nextRefillAt,
            inFlightRequests: inFlight.size,
          });
          if (!refillDecision.shouldRefill && refillDecision.waitMs === 0) continue;
          if (refillDecision.waitMs > 0) {
            const shouldContinue = await waitForIitcQueueDelay(refillDecision.waitMs, generation, liveAbortController.signal);
            if (!shouldContinue) {
              session.markStale();
              return false;
            }
            nextRefillAt = 0;
          }
          fillOpenRequestSlots();
        }
        return true;
      };
      if (timingDiagnostics.downloadDelayMs > 0) {
        const shouldContinue = await waitForIitcQueueDelay(timingDiagnostics.downloadDelayMs, generation, liveAbortController.signal);
        if (!shouldContinue) {
          session.markStale();
          if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
          return;
        }
      }
      const initialStartTime = performance.now();
      if (!(await runIitcRefillQueue())) {
        if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
        return;
      }
      timingDiagnostics.initialMs = performance.now() - initialStartTime;

      if (generation !== latestFetchGeneration) {
        session.markStale();
        if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
        return;
      }
      const artifactWaitStartTime = performance.now();
      const artifactEntities = await getArtifactEntitiesPromise();
      timingDiagnostics.artifactWaitMs = performance.now() - artifactWaitStartTime;
      if (generation !== latestFetchGeneration) {
        session.markStale();
        if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
        return;
      }
      const entities = prepareRenderEntities(session.response, generation, artifactEntities);
      session.markComplete();
      const partialTileKeys = plan.tileParams.hasPortals ? [] : [...session.queueState.failedTileKeys];
      const diagnostics = session.getDiagnostics('complete', partialTileKeys);
      latestPlan = plan;
      latestResponse = session.response;
      renderEntities(entities);
      renderTileDebug(plan, session.response);
      timingDiagnostics.totalMs = performance.now() - refreshStartTime;
      postEntityStatus('entities ready', entities, {
        ...diagnostics,
        elapsedMs: performance.now() - refreshStartTime,
        firstRenderElapsedMs,
        viewportBounds: plan.viewportBounds,
        timing: timingDiagnostics,
      });
      if (generation === latestFetchGeneration) latestWantedTileKeys = new Set();
      if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
      if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
    } catch (error) {
      authError = isIitcAuthError(error);
      if (generation !== latestFetchGeneration || (error instanceof DOMException && error.name === 'AbortError')) {
        if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
        if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
        return;
      }
      if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
      if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
      latestRequestKey = '';
      clearAllRenderedLayers();
      postEntityStatus(error instanceof Error ? error.message : String(error));
    } finally {
      const lifetime = getLifetime();
      if (generation === latestFetchGeneration && dataSource.mode === 'live' && !mapMoveInProgress && !currentFetchAbortController && !authError &&
        lifetime && !lifetime.signal.aborted && !isAuthRecoveryActive()) {
        lifetime.cancelScheduled(periodicTimer);
        periodicTimer = lifetime.schedule(() => {
          periodicTimer = undefined;
          if (isIdle() || isAuthRecoveryActive() || mapMoveInProgress) return;
          latestRequestKey = '';
          void refreshEntities();
        }, getIitcMapRefreshDelayMs(getMap()?.getZoom() ?? 11, performance.now() - refreshStartTime));
      }
    }
  }

  return {
    refreshEntities, scheduleEntityRefresh, cancelActiveEntityFetch, getMoveRefreshDelayMs,
    cancelScheduledRefresh: (): void => {
      getLifetime()?.cancelScheduled(refreshTimer);
      getLifetime()?.cancelScheduled(periodicTimer);
    },
    resumeRefresh: (): void => {
      if (getDataSource().mode !== 'live' || isAuthRecoveryActive() || currentFetchAbortController) return;
      latestRequestKey = '';
      scheduleEntityRefresh(5000);
    },
    mapMoveStart: (): void => {
      mapMoveInProgress = true;
      latestFetchGeneration += 1;
      latestRequestKey = '';
      latestWantedTileKeys = new Set();
      getLifetime()?.cancelScheduled(refreshTimer);
      getLifetime()?.cancelScheduled(periodicTimer);
    },
    mapMoveEnd: (): void => {
      mapMoveInProgress = false;
      latestFetchGeneration += 1;
      latestRequestKey = '';
    },
    resetForDataSourceChange: (): void => {
      getLifetime()?.cancelScheduled(periodicTimer);
      latestFetchGeneration += 1;
      latestRequestKey = '';
      cancelActiveEntityFetch();
    },
    dispose: (): void => {
      getLifetime()?.cancelScheduled(periodicTimer);
      cancelActiveEntityFetch();
      latestFetchGeneration += 1;
      latestRequestKey = '';
      latestWantedTileKeys.clear();
      activeMapDataRefreshBridge = undefined;
      refreshTimer = undefined;
      periodicTimer = undefined;
      mapMoveInProgress = false;
      latestPlan = undefined;
      latestResponse = undefined;
    },
    getSnapshot: (): MapRequestSnapshot => ({plan: latestPlan, response: latestResponse, artifacts: latestArtifactDiagnostics}),
  };
}
