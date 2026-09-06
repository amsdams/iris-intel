import type {
  IitcIrisLifecycleSettings,
  IitcIrisMapTimingDiagnostics,
  IitcIrisRenderMutationDiagnostics,
  IitcIrisRenderQueueDiagnostics,
} from './messages';

export interface ScenarioSnapshot {
  label: string;
  capturedAt: string;
  diagnostics: unknown;
}

export interface ScenarioSnapshotSummary {
  complete?: boolean;
  source?: string;
  requestedTiles?: number;
  returnedTiles?: number;
  nonEmptyTiles?: number;
  retryRequests: number;
  retriedTiles: number;
  recoveredTiles: number;
  partialTiles: number;
  cacheFreshTiles: number;
  cacheStaleTiles: number;
  renderQueue?: {
    renderedTiles?: number;
    ok?: number;
    cacheFresh?: number;
    cacheStale?: number;
    lastStatus?: string | null;
  };
  renderMutation?: IitcIrisRenderMutationDiagnostics | null;
  timing?: IitcIrisMapTimingDiagnostics | null;
  warnings: string[];
}

export interface ScenarioRun {
  id: string;
  name: string;
  startedAt: string;
  status: 'running' | 'finished';
  finishedAt?: string;
  lifecycleSettings: IitcIrisLifecycleSettings;
  snapshots: ScenarioSnapshot[];
}

export interface ParsedViewInput {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface StoredMapView {
  lat: number;
  lng: number;
  zoom: number;
}

export function isScenarioSettled(diagnostics: unknown): boolean {
  const view = diagnostics as {
    entities?: {
      complete?: boolean;
      queue?: {activeRequests?: number};
    };
    requests?: {activeRequests?: number};
  };
  return (
    view.entities?.complete === true &&
    (view.requests?.activeRequests ?? 0) === 0 &&
    (view.entities?.queue?.activeRequests ?? 0) === 0
  );
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function countIntersection(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}

export function createScenarioSnapshotSummary(diagnostics: unknown): ScenarioSnapshotSummary {
  const view = diagnostics as {
    entities?: {
      complete?: boolean;
      source?: string;
      entitySource?: string;
      requestedTiles?: number;
      returnedTiles?: number;
      nonEmptyTiles?: number;
      retryRequests?: number;
      retriedTileKeys?: unknown;
      recoveredTileKeys?: unknown;
      partialTileKeys?: unknown;
      cacheFreshTileKeys?: unknown;
      cacheStaleTileKeys?: unknown;
      renderQueue?: IitcIrisRenderQueueDiagnostics | null;
      renderMutation?: IitcIrisRenderMutationDiagnostics | null;
      timing?: IitcIrisMapTimingDiagnostics | null;
    };
  };
  const entities = view.entities ?? {};
  const retriedTileKeys = readStringArray(entities.retriedTileKeys);
  const recoveredTileKeys = readStringArray(entities.recoveredTileKeys);
  const partialTileKeys = readStringArray(entities.partialTileKeys);
  const cacheFreshTileKeys = readStringArray(entities.cacheFreshTileKeys);
  const cacheStaleTileKeys = readStringArray(entities.cacheStaleTileKeys);
  const freshRetried = countIntersection(cacheFreshTileKeys, retriedTileKeys);
  const stalePartial = countIntersection(cacheStaleTileKeys, partialTileKeys);
  const renderQueue = entities.renderQueue ?? undefined;
  const renderMutation = entities.renderMutation ?? undefined;
  const renderedStatusTotal = renderQueue
    ? renderQueue.renderedOkTiles + renderQueue.renderedCacheFreshTiles + renderQueue.renderedCacheStaleTiles
    : 0;
  const warnings = [
    freshRetried > 0 ? `${freshRetried} fresh cached tiles were retried` : null,
    stalePartial > 0 ? `${stalePartial} stale cached tiles ended partial` : null,
    renderQueue && renderQueue.renderedTiles !== renderedStatusTotal
      ? `rendered tile count ${renderQueue.renderedTiles} differs from status total ${renderedStatusTotal}`
      : null,
  ].filter((warning): warning is string => warning !== null);

  return {
    complete: entities.complete,
    source: entities.source ?? entities.entitySource,
    requestedTiles: entities.requestedTiles,
    returnedTiles: entities.returnedTiles,
    nonEmptyTiles: entities.nonEmptyTiles,
    retryRequests: entities.retryRequests ?? 0,
    retriedTiles: retriedTileKeys.length,
    recoveredTiles: recoveredTileKeys.length,
    partialTiles: partialTileKeys.length,
    cacheFreshTiles: cacheFreshTileKeys.length,
    cacheStaleTiles: cacheStaleTileKeys.length,
    renderQueue: renderQueue ? {
      renderedTiles: renderQueue.renderedTiles,
      ok: renderQueue.renderedOkTiles,
      cacheFresh: renderQueue.renderedCacheFreshTiles,
      cacheStale: renderQueue.renderedCacheStaleTiles,
      lastStatus: renderQueue.lastRenderedTileStatus,
    } : undefined,
    renderMutation,
    timing: entities.timing,
    warnings,
  };
}

export function clampView(view: ParsedViewInput): ParsedViewInput {
  return {
    lat: Math.max(-85.051128, Math.min(85.051128, view.lat)),
    lng: Math.max(-180, Math.min(179.999999, view.lng)),
    zoom: view.zoom === undefined ? undefined : Math.max(0, Math.min(21, view.zoom)),
  };
}

export function isStoredMapView(value: unknown): value is StoredMapView {
  if (!value || typeof value !== 'object') return false;
  const view = value as Partial<StoredMapView>;
  return (
    typeof view.lat === 'number' &&
    Number.isFinite(view.lat) &&
    typeof view.lng === 'number' &&
    Number.isFinite(view.lng) &&
    typeof view.zoom === 'number' &&
    Number.isFinite(view.zoom)
  );
}

export function parseViewInput(value: string): ParsedViewInput | null {
  const text = value.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const ll = url.searchParams.get('ll') ?? url.searchParams.get('pll');
    const z = url.searchParams.get('z');
    if (ll) {
      const [latText, lngText] = ll.split(',');
      const parsed = {
        lat: Number(latText),
        lng: Number(lngText),
        zoom: z ? Number(z) : undefined,
      };
      if (
        Number.isFinite(parsed.lat) &&
        Number.isFinite(parsed.lng) &&
        (parsed.zoom === undefined || Number.isFinite(parsed.zoom))
      ) {
        return clampView(parsed);
      }
    }
  } catch {
    // Fall through to coordinate parsing.
  }

  const [latText, lngText, zoomText] = text.split(/[,\s]+/).filter(Boolean);
  const parsed = {
    lat: Number(latText),
    lng: Number(lngText),
    zoom: zoomText ? Number(zoomText) : undefined,
  };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  if (parsed.zoom !== undefined && !Number.isFinite(parsed.zoom)) return null;
  return clampView(parsed);
}
