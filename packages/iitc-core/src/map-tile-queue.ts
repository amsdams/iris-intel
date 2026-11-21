import type {IitcGetEntitiesResponse} from './entity-decode';
import {classifyIitcTileRequestResponse, getIitcReturnedEmptyTileKeys, type IitcRequestQueueDelayReason, type IitcTileRequestResponseClassification} from './map-tile-response';

export const IITC_MAX_REQUESTS = 5;
export const IITC_NUM_TILES_PER_REQUEST = 25;
export const IITC_MAX_TILE_RETRIES = 5;
export const IITC_LIVE_COMPAT_TILES_PER_REQUEST = 5;
export const IITC_EMPTY_TILE_RETRY_BATCH_SIZE = 1;
export const IITC_EMPTY_TILE_RETRY_LIMIT = 40;
export const IITC_RUN_QUEUE_DELAY_MS = 0;
export const IITC_BAD_REQUEST_RUN_QUEUE_DELAY_MS = 5_000;
export const IITC_EMPTY_RESPONSE_RUN_QUEUE_DELAY_MS = 5_000;
export const IITC_TIMEOUT_REQUEST_RUN_QUEUE_DELAY_MS = 0;

export interface IitcRequestBatchOptions {
  maxRequests?: number;
  tilesPerRequest?: number;
  activeRequestCount?: number;
  tileErrorCount?: Record<string, number>;
  maxTileRetries?: number;
}

export interface IitcEmptyTileRetryOptions {
  retryLimit?: number;
  retryBatchSize?: number;
}

export interface IitcTileQueueState {
  queuedTileKeys: string[];
  requestedTileKeys: string[];
  successTileKeys: string[];
  failedTileKeys: string[];
  staleTileKeys: string[];
  tileErrorCount: Record<string, number>;
  activeRequestCount: number;
}

export interface IitcTileQueueApplyOptions {
  maxTileRetries?: number;
  staleTileKeys?: string[];
  retryReturnedEmptyTiles?: boolean;
  countActiveRequest?: boolean;
}

export interface IitcTileQueueApplyResult {
  state: IitcTileQueueState;
  classification: IitcTileRequestResponseClassification;
}

export interface IitcTileQueueRequestBatchOptions extends IitcRequestBatchOptions {
  pendingTileKeys?: string[];
}

export interface IitcTileQueueRefillDecisionOptions {
  nowMs: number;
  nextRefillAtMs: number;
  inFlightRequests: number;
}

export interface IitcTileQueueRefillDecision {
  shouldRefill: boolean;
  waitMs: number;
}

export interface IitcTileQueueDiagnostics {
  queuedTiles: number;
  requestedTiles: number;
  successTiles: number;
  failedTiles: number;
  partialTiles?: number;
  staleTiles: number;
  activeRequests: number;
  tileErrorCount: Record<string, number>;
}

export function getIitcRequestQueueDelayMs(reason: IitcRequestQueueDelayReason): number {
  if (reason === 'error') return IITC_BAD_REQUEST_RUN_QUEUE_DELAY_MS;
  if (reason === 'unaccounted') return IITC_EMPTY_RESPONSE_RUN_QUEUE_DELAY_MS;
  if (reason === 'timeout') return IITC_TIMEOUT_REQUEST_RUN_QUEUE_DELAY_MS;
  return IITC_RUN_QUEUE_DELAY_MS;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function removeMany(values: string[], toRemove: string[]): string[] {
  const removeSet = new Set(toRemove);
  return values.filter((value) => !removeSet.has(value));
}

function moveToEnd(values: string[], value: string): string[] {
  return [...values.filter((entry) => entry !== value), value];
}

export function createIitcTileQueueState(tileKeys: string[]): IitcTileQueueState {
  return {
    queuedTileKeys: unique(tileKeys),
    requestedTileKeys: [],
    successTileKeys: [],
    failedTileKeys: [],
    staleTileKeys: [],
    tileErrorCount: {},
    activeRequestCount: 0,
  };
}

export function markIitcTileRequestStarted(state: IitcTileQueueState, tileKeys: string[]): IitcTileQueueState {
  return {
    ...state,
    requestedTileKeys: unique([...state.requestedTileKeys, ...tileKeys]),
    activeRequestCount: state.activeRequestCount + 1,
  };
}

export function markIitcTileQueueStale(state: IitcTileQueueState): IitcTileQueueState {
  const staleTileKeys = unique([
    ...state.staleTileKeys,
    ...state.queuedTileKeys,
    ...state.requestedTileKeys,
  ]);

  return {
    ...state,
    queuedTileKeys: [],
    requestedTileKeys: [],
    staleTileKeys,
    activeRequestCount: 0,
  };
}

export function markIitcTileQueueComplete(state: IitcTileQueueState): IitcTileQueueState {
  const unresolvedTileKeys = unique([
    ...state.queuedTileKeys,
    ...state.requestedTileKeys,
  ]);

  return {
    ...state,
    queuedTileKeys: [],
    requestedTileKeys: [],
    failedTileKeys: unique([...state.failedTileKeys, ...unresolvedTileKeys]),
    activeRequestCount: 0,
  };
}

function requeueIitcTile(state: IitcTileQueueState, tileKey: string, isError: boolean, options: IitcTileQueueApplyOptions): IitcTileQueueState {
  if (!state.queuedTileKeys.includes(tileKey)) return state;

  const maxTileRetries = options.maxTileRetries ?? IITC_MAX_TILE_RETRIES;
  const tileErrorCount = {...state.tileErrorCount};
  let retryLimitHit = false;

  if (isError) {
    tileErrorCount[tileKey] = (tileErrorCount[tileKey] ?? 0) + 1;
    retryLimitHit = tileErrorCount[tileKey] > maxTileRetries;
  }

  if (!retryLimitHit) {
    return {
      ...state,
      tileErrorCount,
      queuedTileKeys: moveToEnd(state.queuedTileKeys, tileKey),
    };
  }

  const hasStaleTile = options.staleTileKeys?.includes(tileKey) ?? false;
  return {
    ...state,
    tileErrorCount,
    queuedTileKeys: removeMany(state.queuedTileKeys, [tileKey]),
    staleTileKeys: hasStaleTile ? unique([...state.staleTileKeys, tileKey]) : state.staleTileKeys,
    failedTileKeys: hasStaleTile ? state.failedTileKeys : unique([...state.failedTileKeys, tileKey]),
  };
}

export function applyIitcTileRequestResponseToQueue(
  state: IitcTileQueueState,
  response: IitcGetEntitiesResponse | null | undefined,
  requestedTileKeys: string[],
  success = true,
  options: IitcTileQueueApplyOptions = {},
): IitcTileQueueApplyResult {
  const classification = classifyIitcTileRequestResponse(response, requestedTileKeys, success);
  const returnedEmptyRetryTileKeys = options.retryReturnedEmptyTiles && response
    ? getIitcReturnedEmptyTileKeys(response, requestedTileKeys)
    : [];
  const queuedTileKeySet = new Set(state.queuedTileKeys);
  const successTileKeys = removeMany(classification.successTileKeys, returnedEmptyRetryTileKeys)
    .filter((tileKey) => queuedTileKeySet.has(tileKey));
  let nextState: IitcTileQueueState = {
    ...state,
    activeRequestCount: options.countActiveRequest === false
      ? state.activeRequestCount
      : Math.max(0, state.activeRequestCount - 1),
    requestedTileKeys: removeMany(state.requestedTileKeys, requestedTileKeys),
    queuedTileKeys: removeMany(state.queuedTileKeys, successTileKeys),
    successTileKeys: unique([...state.successTileKeys, ...successTileKeys]),
  };

  for (const tileKey of returnedEmptyRetryTileKeys) {
    nextState = requeueIitcTile(nextState, tileKey, false, options);
  }
  for (const tileKey of classification.serverRetryTileKeys) {
    nextState = requeueIitcTile(nextState, tileKey, false, options);
  }
  for (const tileKey of classification.timeoutTileKeys) {
    nextState = requeueIitcTile(nextState, tileKey, true, options);
  }
  for (const tileKey of classification.errorTileKeys) {
    nextState = requeueIitcTile(nextState, tileKey, true, options);
  }
  for (const tileKey of classification.unaccountedTileKeys) {
    nextState = requeueIitcTile(nextState, tileKey, true, options);
  }

  return {state: nextState, classification};
}

export function createIitcTileQueueRequestBatches(
  state: IitcTileQueueState,
  options: IitcTileQueueRequestBatchOptions = {},
): string[][] {
  const requestedTileKeySet = new Set(state.requestedTileKeys);
  const allowedTileKeys = options.pendingTileKeys ? new Set(options.pendingTileKeys) : null;
  const pendingTileKeys = state.queuedTileKeys.filter((tileKey) =>
    !requestedTileKeySet.has(tileKey) &&
    (!allowedTileKeys || allowedTileKeys.has(tileKey)));

  return createIitcRequestBatches(pendingTileKeys, {
    ...options,
    activeRequestCount: options.activeRequestCount ?? state.activeRequestCount,
    tileErrorCount: options.tileErrorCount ?? state.tileErrorCount,
  });
}

export function getIitcTileQueueRefillDecision(options: IitcTileQueueRefillDecisionOptions): IitcTileQueueRefillDecision {
  const waitMs = Math.max(0, options.nextRefillAtMs - options.nowMs);
  if (waitMs === 0) return {shouldRefill: true, waitMs: 0};
  if (options.inFlightRequests > 0) return {shouldRefill: false, waitMs: 0};
  return {shouldRefill: false, waitMs};
}

export function createIitcTileQueueDiagnostics(
  state: IitcTileQueueState,
  partialTileKeys: string[] = [],
): IitcTileQueueDiagnostics {
  const partialTileKeySet = new Set(partialTileKeys);
  return {
    queuedTiles: state.queuedTileKeys.length,
    requestedTiles: state.requestedTileKeys.length,
    successTiles: state.successTileKeys.length,
    failedTiles: state.failedTileKeys.filter((tileKey) => !partialTileKeySet.has(tileKey)).length,
    partialTiles: partialTileKeys.length,
    staleTiles: state.staleTileKeys.length,
    activeRequests: state.activeRequestCount,
    tileErrorCount: state.tileErrorCount,
  };
}

export function createIitcRequestBatches(tileKeys: string[], options: IitcRequestBatchOptions = {}): string[][] {
  const maxRequests = options.maxRequests ?? IITC_MAX_REQUESTS;
  const tilesPerRequest = options.tilesPerRequest ?? IITC_NUM_TILES_PER_REQUEST;
  const requestBuckets = Math.max(0, maxRequests - (options.activeRequestCount ?? 0));
  const pendingTiles = [...tileKeys];
  const batches: string[][] = [];

  if (pendingTiles.length === 0 || requestBuckets === 0) return batches;

  const requestBucketSize = Math.min(tilesPerRequest, Math.max(5, Math.ceil(pendingTiles.length / requestBuckets)));

  for (let bucket = 0; bucket < requestBuckets; bucket += 1) {
    let numTilesThisRequest = Math.min(requestBucketSize, pendingTiles.length);
    let retryTotal = options.tileErrorCount?.[pendingTiles[0]] ?? 0;

    for (let i = 1; i < numTilesThisRequest; i += 1) {
      retryTotal += options.tileErrorCount?.[pendingTiles[i]] ?? 0;
      if (retryTotal > (options.maxTileRetries ?? IITC_MAX_TILE_RETRIES)) {
        numTilesThisRequest = i;
        break;
      }
    }

    const batch = pendingTiles.splice(0, numTilesThisRequest);
    if (batch.length > 0) batches.push(batch);
  }

  return batches;
}

export function createIitcSequentialTileBatches(tileKeys: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  for (let index = 0; index < tileKeys.length; index += safeBatchSize) {
    batches.push(tileKeys.slice(index, index + safeBatchSize));
  }
  return batches;
}

export function createIitcLiveCompatRequestBatches(tileKeys: string[]): string[][] {
  return createIitcSequentialTileBatches(tileKeys, IITC_LIVE_COMPAT_TILES_PER_REQUEST);
}

export function createIitcEmptyTileRetryBatches(tileKeys: string[], options: IitcEmptyTileRetryOptions = {}): string[][] {
  const retryLimit = Math.max(0, Math.floor(options.retryLimit ?? IITC_EMPTY_TILE_RETRY_LIMIT));
  const retryBatchSize = Math.max(1, Math.floor(options.retryBatchSize ?? IITC_EMPTY_TILE_RETRY_BATCH_SIZE));
  return createIitcSequentialTileBatches(tileKeys.slice(0, retryLimit), retryBatchSize);
}
