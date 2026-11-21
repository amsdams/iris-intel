import type {IitcGetEntitiesResponse, IitcMapTilePayload} from './entity-decode';

export interface IitcReturnedTileSummary {
  returnedTiles: number;
  nonEmptyTiles: number;
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
}

export interface IitcTileResponseClassificationOptions {
  retryReturnedEmptyTiles?: boolean;
  retryUnaccountedTiles?: boolean;
}

export interface IitcTileResponseClassification extends IitcReturnedTileSummary {
  requestedTiles: number;
  returnedTileKeys: string[];
  unaccountedTileKeys: string[];
  successTileKeys: string[];
  retryTileKeys: string[];
}

export type IitcRequestQueueDelayReason = 'normal' | 'server-retry' | 'timeout' | 'error' | 'unaccounted';

export interface IitcTileRequestResponseClassification {
  requestedTiles: number;
  returnedTileKeys: string[];
  successTileKeys: string[];
  serverRetryTileKeys: string[];
  timeoutTileKeys: string[];
  errorTileKeys: string[];
  unaccountedTileKeys: string[];
  retryTileKeys: string[];
  queueDelayReason: IitcRequestQueueDelayReason;
}

export interface IitcResponseBucketDiagnostics {
  serverRetryTileKeys: string[];
  timeoutTileKeys: string[];
  errorTileKeys: string[];
  responseRetryTileKeys: string[];
  queueDelayReasons: IitcRequestQueueDelayReason[];
}

export interface IitcTileDiagnosticsClassification {
  returnedTiles: number;
  nonEmptyTiles: number;
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
  unaccountedTileKeys: string[];
}

export function createIitcResponseBucketDiagnostics(): IitcResponseBucketDiagnostics {
  return {
    serverRetryTileKeys: [],
    timeoutTileKeys: [],
    errorTileKeys: [],
    responseRetryTileKeys: [],
    queueDelayReasons: [],
  };
}

export function appendIitcResponseBucketDiagnostics(
  diagnostics: IitcResponseBucketDiagnostics,
  response: IitcGetEntitiesResponse | null | undefined,
  tileKeys: string[],
  success = true,
): IitcResponseBucketDiagnostics {
  const classification = classifyIitcTileRequestResponse(response, tileKeys, success);
  return {
    serverRetryTileKeys: [...diagnostics.serverRetryTileKeys, ...classification.serverRetryTileKeys],
    timeoutTileKeys: [...diagnostics.timeoutTileKeys, ...classification.timeoutTileKeys],
    errorTileKeys: [...diagnostics.errorTileKeys, ...classification.errorTileKeys],
    responseRetryTileKeys: [...diagnostics.responseRetryTileKeys, ...classification.retryTileKeys],
    queueDelayReasons: classification.queueDelayReason === 'normal'
      ? diagnostics.queueDelayReasons
      : [...diagnostics.queueDelayReasons, classification.queueDelayReason],
  };
}

export function countIitcTileEntities(tile: IitcMapTilePayload | undefined): number {
  return tile?.gameEntities?.length ?? 0;
}

function isIitcTileError(tile: IitcMapTilePayload | undefined): boolean {
  return typeof tile?.error === 'string' && tile.error.length > 0;
}

export function mergeIitcGetEntitiesResponses(responses: IitcGetEntitiesResponse[]): IitcGetEntitiesResponse {
  const map: NonNullable<NonNullable<IitcGetEntitiesResponse['result']>['map']> = {};

  for (const response of responses) {
    for (const [tileKey, tile] of Object.entries(response.result?.map ?? {})) {
      const existing = map[tileKey];
      if (!existing || countIitcTileEntities(tile) > countIitcTileEntities(existing)) {
        map[tileKey] = tile;
      }
    }
  }

  return {result: {map}};
}

export function summarizeIitcReturnedTiles(response: IitcGetEntitiesResponse): IitcReturnedTileSummary {
  const entries = Object.entries(response.result?.map ?? {});
  const emptyTileKeys: string[] = [];
  const nonEmptyTileKeys: string[] = [];

  for (const [tileKey, tile] of entries) {
    if (isIitcTileError(tile)) continue;
    if (countIitcTileEntities(tile) > 0) nonEmptyTileKeys.push(tileKey);
    else emptyTileKeys.push(tileKey);
  }

  return {
    returnedTiles: entries.length,
    nonEmptyTiles: nonEmptyTileKeys.length,
    emptyTileKeys,
    nonEmptyTileKeys,
  };
}

export function classifyIitcGetEntitiesResponse(
  response: IitcGetEntitiesResponse,
  requestedTileKeys: string[],
  options: IitcTileResponseClassificationOptions = {},
): IitcTileResponseClassification {
  const tilePayloads = response.result?.map ?? {};
  const returnedTileKeys = requestedTileKeys.filter((tileKey) => Object.prototype.hasOwnProperty.call(tilePayloads, tileKey));
  const returnedTileKeySet = new Set(returnedTileKeys);
  const emptyTileKeys: string[] = [];
  const nonEmptyTileKeys: string[] = [];
  const unaccountedTileKeys = requestedTileKeys.filter((tileKey) => !returnedTileKeySet.has(tileKey));

  for (const tileKey of returnedTileKeys) {
    const tile = tilePayloads[tileKey];
    if (isIitcTileError(tile)) continue;
    if (countIitcTileEntities(tile) > 0) nonEmptyTileKeys.push(tileKey);
    else emptyTileKeys.push(tileKey);
  }

  const retryTileKeys = [
    ...(options.retryReturnedEmptyTiles ? emptyTileKeys : []),
    ...(options.retryUnaccountedTiles ? unaccountedTileKeys : []),
  ];
  const retryTileKeySet = new Set(retryTileKeys);
  const successTileKeys = returnedTileKeys.filter((tileKey) => !retryTileKeySet.has(tileKey) && !isIitcTileError(tilePayloads[tileKey]));

  return {
    requestedTiles: requestedTileKeys.length,
    returnedTiles: returnedTileKeys.length,
    nonEmptyTiles: nonEmptyTileKeys.length,
    returnedTileKeys,
    emptyTileKeys,
    nonEmptyTileKeys,
    unaccountedTileKeys,
    successTileKeys,
    retryTileKeys,
  };
}

export function classifyIitcTileDiagnostics(
  response: IitcGetEntitiesResponse,
  requestedTileKeys: string[],
): IitcTileDiagnosticsClassification {
  const classification = classifyIitcGetEntitiesResponse(response, requestedTileKeys);
  return {
    returnedTiles: classification.returnedTiles,
    nonEmptyTiles: classification.nonEmptyTiles,
    emptyTileKeys: classification.emptyTileKeys,
    nonEmptyTileKeys: classification.nonEmptyTileKeys,
    unaccountedTileKeys: classification.unaccountedTileKeys,
  };
}

export function getIitcReturnedEmptyTileKeys(response: IitcGetEntitiesResponse, requestedTileKeys: string[]): string[] {
  return classifyIitcGetEntitiesResponse(response, requestedTileKeys, {retryReturnedEmptyTiles: true}).emptyTileKeys;
}

export function getIitcLiveCompatRetryTileKeys(response: IitcGetEntitiesResponse, requestedTileKeys: string[]): string[] {
  const returnedEmptyTileKeys = getIitcReturnedEmptyTileKeys(response, requestedTileKeys);
  const responseRetryTileKeys = classifyIitcTileRequestResponse(response, requestedTileKeys).retryTileKeys;
  return Array.from(new Set([...returnedEmptyTileKeys, ...responseRetryTileKeys]));
}

export function getIitcRecoveredTileKeys(initialEmptyTileKeys: string[], nonEmptyTileKeys: string[]): string[] {
  return initialEmptyTileKeys.filter((tileKey) => nonEmptyTileKeys.includes(tileKey));
}

export function classifyIitcTileRequestResponse(
  response: IitcGetEntitiesResponse | null | undefined,
  requestedTileKeys: string[],
  success = true,
): IitcTileRequestResponseClassification {
  const returnedTileKeys: string[] = [];
  const successTileKeys: string[] = [];
  const serverRetryTileKeys: string[] = [];
  const timeoutTileKeys: string[] = [];
  const errorTileKeys: string[] = [];
  const unaccountedTileKeys: string[] = [];

  if (!success || !response?.result) {
    if (response?.error === 'RETRY') serverRetryTileKeys.push(...requestedTileKeys);
    else errorTileKeys.push(...requestedTileKeys);
  } else {
    const tilePayloads = response.result.map ?? {};
    for (const tileKey of requestedTileKeys) {
      if (!Object.prototype.hasOwnProperty.call(tilePayloads, tileKey)) {
        unaccountedTileKeys.push(tileKey);
        continue;
      }

      returnedTileKeys.push(tileKey);
      const tile = tilePayloads[tileKey];
      if (tile.error === 'TIMEOUT') timeoutTileKeys.push(tileKey);
      else if (tile.error) errorTileKeys.push(tileKey);
      else successTileKeys.push(tileKey);
    }
  }

  const retryTileKeys = [
    ...serverRetryTileKeys,
    ...timeoutTileKeys,
    ...errorTileKeys,
    ...unaccountedTileKeys,
  ];
  const queueDelayReason: IitcRequestQueueDelayReason =
    errorTileKeys.length > 0 ? 'error' :
      unaccountedTileKeys.length > 0 ? 'unaccounted' :
        timeoutTileKeys.length > 0 ? 'timeout' :
          serverRetryTileKeys.length > 0 ? 'server-retry' :
            'normal';

  return {
    requestedTiles: requestedTileKeys.length,
    returnedTileKeys,
    successTileKeys,
    serverRetryTileKeys,
    timeoutTileKeys,
    errorTileKeys,
    unaccountedTileKeys,
    retryTileKeys,
    queueDelayReason,
  };
}
