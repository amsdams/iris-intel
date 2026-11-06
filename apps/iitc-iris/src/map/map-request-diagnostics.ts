import type {IitcMapDataPlan, IitcRenderQueueTileStatus} from '@iris/iitc-core';
import type {IitcIrisEntitySource, IitcIrisQueueDiagnostics, IitcIrisRenderQueueDiagnostics,
  IitcIrisMapTimingDiagnostics} from '../messages';

export interface TileDiagnostics {
  entitySource?: IitcIrisEntitySource;
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  elapsedMs?: number;
  firstRenderElapsedMs?: number;
  viewportBounds?: IitcMapDataPlan['viewportBounds'];
  retryRequests?: number;
  retriedTileKeys?: string[];
  recoveredTileKeys?: string[];
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
  unaccountedTileKeys: string[];
  serverRetryTileKeys?: string[];
  timeoutTileKeys?: string[];
  errorTileKeys?: string[];
  responseRetryTileKeys?: string[];
  queueDelayReasons?: string[];
  partialTileKeys?: string[];
  cacheFreshTileKeys?: string[];
  cacheStaleTileKeys?: string[];
  staleGenerationCacheWarmTileKeys?: string[];
  queue?: IitcIrisQueueDiagnostics | null;
  renderQueue?: IitcIrisRenderQueueDiagnostics | null;
  timing?: IitcIrisMapTimingDiagnostics | null;
}

export interface ArtifactFetchDiagnostics {
  status: string;
  portalCount: number;
  types: string[];
  elapsedMs?: number;
  error?: string;
}

export function createEmptyRenderQueueDiagnostics(): IitcIrisRenderQueueDiagnostics {
  return {
    queuedTiles: 0,
    renderedTiles: 0,
    renderedOkTiles: 0,
    renderedCacheFreshTiles: 0,
    renderedCacheStaleTiles: 0,
    lastRenderedTileStatus: null,
    renderedTileKeys: [],
  };
}

export function appendRenderQueueDiagnostics(
  diagnostics: IitcIrisRenderQueueDiagnostics,
  tileStatuses: Record<string, IitcRenderQueueTileStatus>,
): IitcIrisRenderQueueDiagnostics {
  const renderedTileKeys = Object.keys(tileStatuses);
  let renderedOkTiles = diagnostics.renderedOkTiles;
  let renderedCacheFreshTiles = diagnostics.renderedCacheFreshTiles;
  let renderedCacheStaleTiles = diagnostics.renderedCacheStaleTiles;
  let lastRenderedTileStatus = diagnostics.lastRenderedTileStatus;

  for (const tileKey of renderedTileKeys) {
    const status = tileStatuses[tileKey];
    if (status === 'ok') renderedOkTiles += 1;
    if (status === 'cache-fresh') renderedCacheFreshTiles += 1;
    if (status === 'cache-stale') renderedCacheStaleTiles += 1;
    lastRenderedTileStatus = status;
  }

  return {
    queuedTiles: 0,
    renderedTiles: diagnostics.renderedTiles + renderedTileKeys.length,
    renderedOkTiles,
    renderedCacheFreshTiles,
    renderedCacheStaleTiles,
    lastRenderedTileStatus,
    renderedTileKeys: [...new Set([...diagnostics.renderedTileKeys, ...renderedTileKeys])],
  };
}

export function createArtifactFetchDiagnostics(status = 'disabled'): ArtifactFetchDiagnostics {
  return {status, portalCount: 0, types: []};
}
