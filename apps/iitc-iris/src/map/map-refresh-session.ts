import {
  appendIitcResponseBucketDiagnostics, applyIitcTileRequestResponseToQueue, classifyIitcTileDiagnostics,
  createIitcResponseBucketDiagnostics, createIitcTileQueueDiagnostics, createIitcTileQueueState,
  createIitcRenderQueueState, drainIitcRenderQueueBatch, getIitcRecoveredTileKeys, getIitcRequestQueueDelayMs,
  markIitcTileQueueComplete, markIitcTileQueueStale, markIitcTileRequestStarted,
  mergeIitcGetEntitiesResponses, pushIitcRenderQueueTile,
  type IitcDataCache, type IitcGetEntitiesResponse, type IitcMapTilePayload, type IitcTileQueueState,
} from '@iris/iitc-core';
import {appendRenderQueueDiagnostics, createEmptyRenderQueueDiagnostics, type TileDiagnostics} from './map-request-diagnostics';
import type {MapTileBatchResult} from './map-entity-transport';

const IITC_RENDER_BATCH_SIZE = 1_000_000_000;

interface MapRefreshSession {
  readonly queueState: IitcTileQueueState;
  readonly response: IitcGetEntitiesResponse;
  readonly cachedResponse: IitcGetEntitiesResponse | undefined;
  readonly batchCount: number;
  startRequest: (tileKeys: string[]) => void;
  markStale: () => void;
  markComplete: () => void;
  applyBatch: (result: MapTileBatchResult, startedAsRetry: boolean, countActiveRequest?: boolean) => {status: string; delayMs: number};
  getDiagnostics: (phase: 'initial' | 'progress' | 'complete', partialTileKeys?: string[]) => TileDiagnostics;
}

export function filterMapResponseToTiles(response: IitcGetEntitiesResponse, tileKeys: string[]): IitcGetEntitiesResponse {
  const allowedTileKeys = new Set(tileKeys);
  const map = Object.fromEntries(Object.entries(response.result?.map ?? {}).filter(([tileKey]) => allowedTileKeys.has(tileKey)));
  return {...response, result: {...response.result, map}};
}

/** One refresh's cache/queue/response accounting. No timers, network, generation checks or rendering callbacks. */
export function createMapRefreshSession(
  tileKeys: string[],
  cache: Pick<IitcDataCache<IitcMapTilePayload>, 'isFresh' | 'get' | 'store'>,
): MapRefreshSession {
  const responses: IitcGetEntitiesResponse[] = [];
  let renderQueue = createIitcRenderQueueState();
  let renderQueueDiagnostics = createEmptyRenderQueueDiagnostics();
  let bucketDiagnostics = createIitcResponseBucketDiagnostics();
  const freshCachedTileKeys: string[] = [];
  const staleCachedTileKeys: string[] = [];
  const queueTileKeys: string[] = [];
  for (const tileKey of tileKeys) {
    const freshness = cache.isFresh(tileKey);
    const cachedTile = freshness === true ? cache.get(tileKey) : undefined;
    if (cachedTile) {
      freshCachedTileKeys.push(tileKey);
      renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, cachedTile, 'cache-fresh');
    } else {
      queueTileKeys.push(tileKey);
    }
  }
  let queueState = createIitcTileQueueState(queueTileKeys);
  let batchCount = 0;
  const retriedTileKeys = new Set<string>();
  let retryRequests = 0;

  function drainRenderQueue(): IitcGetEntitiesResponse {
    renderQueueDiagnostics = {...renderQueueDiagnostics, queuedTiles: renderQueue.entries.length};
    const drained = drainIitcRenderQueueBatch(renderQueue, IITC_RENDER_BATCH_SIZE, mergeIitcGetEntitiesResponses(responses));
    renderQueue = drained.state;
    renderQueueDiagnostics = appendRenderQueueDiagnostics(renderQueueDiagnostics, drained.tileStatuses);
    responses.length = 0;
    responses.push(drained.response);
    return drained.response;
  }

  const cachedResponse = freshCachedTileKeys.length > 0 ? drainRenderQueue() : undefined;
  let mergedResponse = mergeIitcGetEntitiesResponses(responses);

  function applyBatch(result: MapTileBatchResult, startedAsRetry: boolean, countActiveRequest = true): {status: string; delayMs: number} {
    const previousStaleTileKeys = new Set(queueState.staleTileKeys);
    const wantedAtResponse = new Set(queueState.queuedTileKeys);
    const renderedTileKeys: string[] = [];
    if (result.response) {
      for (const tileKey of result.tileKeys) {
        const tile = result.response.result?.map?.[tileKey];
        if (tile && !tile.error) {
          cache.store(tileKey, tile);
          if (wantedAtResponse.has(tileKey)) {
            renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, tile, 'ok');
            renderedTileKeys.push(tileKey);
          }
        }
      }
    }
    const applied = applyIitcTileRequestResponseToQueue(queueState, result.response ?? null, result.tileKeys, result.response !== undefined, {
      staleTileKeys: queueState.queuedTileKeys.filter(tileKey => cache.get(tileKey) !== undefined), countActiveRequest,
    });
    queueState = applied.state;
    for (const tileKey of queueState.staleTileKeys) {
      if (previousStaleTileKeys.has(tileKey)) continue;
      const staleTile = cache.get(tileKey);
      if (staleTile) {
        staleCachedTileKeys.push(tileKey);
        renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, staleTile, 'cache-stale');
      }
    }
    bucketDiagnostics = appendIitcResponseBucketDiagnostics(bucketDiagnostics, result.response ?? null, result.tileKeys, result.response !== undefined);
    if (startedAsRetry) {
      retryRequests += 1;
      for (const tileKey of result.tileKeys) retriedTileKeys.add(tileKey);
    }
    if (result.response && renderedTileKeys.length > 0) responses.push(filterMapResponseToTiles(result.response, renderedTileKeys));
    mergedResponse = drainRenderQueue();
    batchCount += 1;
    return {status: startedAsRetry ? `retry ${retryRequests}` : `batch ${batchCount}`,
      delayMs: getIitcRequestQueueDelayMs(applied.classification.queueDelayReason)};
  }

  function getDiagnostics(phase: 'initial' | 'progress' | 'complete', partialTileKeys: string[] = []): TileDiagnostics {
    const classified = classifyIitcTileDiagnostics(mergedResponse, tileKeys);
    return {
      requestedTiles: tileKeys.length,
      ...classified,
      unaccountedTileKeys: phase === 'initial' ? [] : classified.unaccountedTileKeys,
      retryRequests,
      retriedTileKeys: [...retriedTileKeys],
      ...(phase === 'initial' ? {} : {recoveredTileKeys: getIitcRecoveredTileKeys([...retriedTileKeys], classified.nonEmptyTileKeys)}),
      ...bucketDiagnostics,
      cacheFreshTileKeys: freshCachedTileKeys,
      cacheStaleTileKeys: staleCachedTileKeys,
      ...(phase === 'complete' ? {partialTileKeys} : {}),
      queue: createIitcTileQueueDiagnostics(queueState, phase === 'complete' ? partialTileKeys : undefined),
      renderQueue: renderQueueDiagnostics,
    };
  }

  return {
    get queueState(): IitcTileQueueState { return queueState; },
    get response(): IitcGetEntitiesResponse { return mergedResponse; },
    get batchCount(): number { return batchCount; },
    cachedResponse,
    startRequest: (keys): void => {queueState = markIitcTileRequestStarted(queueState, keys);},
    markStale: (): void => {queueState = markIitcTileQueueStale(queueState);},
    markComplete: (): void => {queueState = markIitcTileQueueComplete(queueState);},
    applyBatch, getDiagnostics,
  };
}
