import type {Map as LeafletMap} from 'leaflet';
import {
  appendIitcResponseBucketDiagnostics,
  applyIitcTileRequestResponseToQueue,
  classifyIitcTileDiagnostics,
  createIitcTileQueueDiagnostics,
  createIitcResponseBucketDiagnostics,
  createIitcTileQueueState,
  createIitcTileQueueRequestBatches,
  drainIitcRenderQueueBatch,
  createIitcRenderQueueState,
  createIitcMapDataPlan,
  decodeIitcGameEntities,
  decodeIitcGetEntitiesResponse,
  getIitcRequestQueueDelayMs,
  getIitcTileQueueRefillDecision,
  getIitcRecoveredTileKeys,
  getIitcPortalArtifacts,
  IitcDataCache,
  markIitcTileQueueComplete,
  markIitcTileQueueStale,
  markIitcTileRequestStarted,
  mergeIitcGetEntitiesResponses,
  pushIitcRenderQueueTile,
  type IitcMapTilePayload,
  type IitcPortalArtifact,
  type IitcRawGameEntity,
  type IitcRenderQueueTileStatus,
  type IitcGetEntitiesResponse, type IitcMapDataPlan,
} from '@iris/iitc-core';
import type {
  IitcIrisDataSourceSettings, IitcIrisEntitySource, IitcIrisLifecycleSettings, IitcIrisMapTimingDiagnostics,
  IitcIrisQueueDiagnostics, IitcIrisRenderArtifact, IitcIrisRenderEntities, IitcIrisRenderPortal, IitcIrisRenderQueueDiagnostics,
} from '../messages';
import {createIitcAuthError, createMissingIntelVersionError, extractVersion, getCsrfToken, isIitcAuthError, looksLikeHtml, type IntelRequest} from '../intel/intel-request';
import type {IitcIrisMapLifetime} from './map-runtime-lifetime';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const FAST_MOVE_REFRESH_DELAY_MS = 250;
const FAST_DOWNLOAD_DELAY_MS = 0;
const IITC_MOVE_REFRESH_DELAY_MS = 400;
const IITC_DOWNLOAD_DELAY_MS = 1000;
const IITC_RENDER_BATCH_SIZE = 1_000_000_000;
const ENABLE_STALE_GENERATION_CACHE_WARMING = false;

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

interface MapRequestOptions {
  getMap: () => Pick<LeafletMap, 'getBounds' | 'getCenter' | 'getZoom'> | undefined;
  getLifetime: () => IitcIrisMapLifetime | undefined;
  getDataSource: () => IitcIrisDataSourceSettings;
  getLifecycleSettings: () => IitcIrisLifecycleSettings;
  isAuthRecoveryActive: () => boolean;
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
  getMoveRefreshDelayMs: () => number;
  mapMoveStart: () => void;
  mapMoveEnd: () => void;
  resetForDataSourceChange: () => void;
  dispose: () => void;
  getSnapshot: () => MapRequestSnapshot;
}

/** Coordinate existing IITC-shaped cache, tile/refill/render queues and generation ownership. */
export function createMapRequest({
  getMap, getLifetime, getDataSource, getLifecycleSettings, isAuthRecoveryActive, getEntities, portalHistoryByGuid,
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
  let mapMoveInProgress = false;
  let currentFetchAbortController: AbortController | undefined;
  interface TileBatchResult {
    tileKeys: string[];
    response?: IitcGetEntitiesResponse;
    error?: unknown;
  }
  interface ActiveMapDataRefreshBridge {
    generation: number;
    processExternalBatch(result: TileBatchResult): boolean;
  }
  interface ArtifactPortalsResponse {
    error?: string;
    result?: unknown;
  }
  let latestArtifactDiagnostics: ArtifactFetchDiagnostics = {
    status: 'disabled',
    portalCount: 0,
    types: [],
  };

  function uniqueStrings(values: string[] | undefined): string[] {
    return values ? [...new Set(values)] : [];
  }

  function cancelActiveEntityFetch(): void {
    currentFetchAbortController?.abort();
    currentFetchAbortController = undefined;
  }

  function createEmptyRenderQueueDiagnostics(): IitcIrisRenderQueueDiagnostics {
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

  function appendRenderQueueDiagnostics(
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
      renderedTileKeys: uniqueStrings([...diagnostics.renderedTileKeys, ...renderedTileKeys]),
    };
  }

  function toRenderArtifacts(artifacts: IitcPortalArtifact[]): IitcIrisRenderArtifact[] | undefined {
    return artifacts.length > 0 ? artifacts : undefined;
  }

  function isRawGameEntity(value: unknown): value is IitcRawGameEntity {
    return Array.isArray(value) &&
      typeof value[0] === 'string' &&
      typeof value[1] === 'number' &&
      Array.isArray(value[2]);
  }

  function isPortalSummary(value: unknown): value is unknown[] {
    return Array.isArray(value) && value[0] === 'p';
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

  function toRenderEntities(response: IitcGetEntitiesResponse, generation: number, artifactEntities: IitcRawGameEntity[] = []): IitcIrisRenderEntities {
    const decoded = decodeIitcGetEntitiesResponse(response);
    if (artifactEntities.length > 0) {
      const artifactDecoded = decodeIitcGameEntities(artifactEntities);
      Object.assign(decoded.portals, artifactDecoded.portals);
    }

    return {
      generation,
      portals: Object.values(decoded.portals).map((portal) => {
        const history = portal.history ?? portalHistoryByGuid.get(portal.guid);
        if (portal.history) portalHistoryByGuid.set(portal.guid, portal.history);
        return {
          guid: portal.guid,
          title: portal.title,
          image: portal.image,
          team: portal.team,
          latE6: portal.latE6,
          lngE6: portal.lngE6,
          level: portal.level,
          health: portal.health,
          resCount: portal.resCount,
          mission: portal.mission,
          mission50plus: portal.mission50plus,
          ornaments: portal.ornaments,
          artifacts: toRenderArtifacts(getIitcPortalArtifacts(portal.artifactBrief)),
          history,
          isPlaceholder: portal.isPlaceholder,
        };
      }),
      links: Object.values(decoded.links).map((link) => ({
        guid: link.guid,
        team: link.team,
        oGuid: link.oGuid,
        oLatE6: link.oLatE6,
        oLngE6: link.oLngE6,
        dGuid: link.dGuid,
        dLatE6: link.dLatE6,
        dLngE6: link.dLngE6,
      })),
      fields: Object.values(decoded.fields).map((field) => ({
        guid: field.guid,
        team: field.team,
        points: field.points.map((point) => ({guid: point.guid, latE6: point.latE6, lngE6: point.lngE6})),
      })),
    };
  }

  async function fetchEntityBatch(tileKeys: string[], version: string, signal?: AbortSignal): Promise<IitcGetEntitiesResponse> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getEntities missing csrftoken');

    const {response, text} = await fetchIitcEndpointText('getEntities', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({tileKeys, v: version}),
    }, 'entities');

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('getEntities', response);
    }
    if (!response.ok) throw new Error(`getEntities failed HTTP ${response.status}`);
    if (!text.trim()) throw new Error('getEntities returned empty response');

    try {
      return JSON.parse(text) as IitcGetEntitiesResponse;
    } catch (error) {
      throw new Error(`getEntities returned non-JSON HTTP ${response.status}: ${error instanceof Error ? error.message : String(error)}`, {cause: error});
    }
  }

  async function fetchFixtureResponse(source: Extract<IitcIrisDataSourceSettings, {mode: 'fixture'}>): Promise<IitcGetEntitiesResponse> {
    const lifetime = getLifetime();
    if (!lifetime) throw new DOMException('Map is unavailable', 'AbortError');
    const {response, text} = await lifetime.fetchText(source.url);
    if (!response.ok) throw new Error(`fixture ${source.label} failed HTTP ${response.status}`);
    return JSON.parse(text) as IitcGetEntitiesResponse;
  }

  function getArtifactTypes(entities: IitcRawGameEntity[]): string[] {
    const types = new Set<string>();
    for (const portal of Object.values(decodeIitcGameEntities(entities).portals)) {
      for (const artifact of getIitcPortalArtifacts(portal.artifactBrief)) types.add(artifact.type);
    }
    return [...types].sort();
  }

  function resetArtifactDiagnostics(status = 'disabled'): void {
    latestArtifactDiagnostics = {
      status,
      portalCount: 0,
      types: [],
    };
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function getArtifactPortalResultEntries(result: unknown): [string, unknown][] {
    if (!isRecord(result)) return [];
    const nestedPortals = result.portals;
    if (isRecord(nestedPortals)) return Object.entries(nestedPortals);
    return Object.entries(result);
  }

  function toArtifactRawGameEntity(guid: string, value: unknown): IitcRawGameEntity | null {
    if (isRawGameEntity(value)) return value;
    if (!isPortalSummary(value)) return null;
    const timestamp = typeof value[13] === 'number' && Number.isFinite(value[13]) ? value[13] : Date.now();
    return [guid, timestamp, value];
  }

  async function fetchArtifactPortals(version: string, signal?: AbortSignal): Promise<IitcRawGameEntity[]> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getArtifactPortals missing csrftoken');

    const {response, text} = await fetchIitcEndpointText('getArtifactPortals', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({v: version}),
    }, 'artifacts');

    if (looksLikeHtml(text)) {
      throw new Error(`getArtifactPortals returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
    }
    if (!response.ok) throw new Error(`getArtifactPortals failed HTTP ${response.status}`);
    if (!text.trim()) throw new Error('getArtifactPortals returned empty response');

    const parsed = JSON.parse(text) as ArtifactPortalsResponse;
    if (parsed.error || !parsed.result) return [];
    return getArtifactPortalResultEntries(parsed.result)
      .map(([guid, value]) => toArtifactRawGameEntity(guid, value))
      .filter((entity): entity is IitcRawGameEntity => entity !== null);
  }

  function isAuthLikeError(error: unknown): boolean {
    return isIitcAuthError(error);
  }

  async function fetchEntityBatchResult(tileKeys: string[], version: string, signal: AbortSignal): Promise<TileBatchResult> {
    try {
      return {tileKeys, response: await fetchEntityBatch(tileKeys, version, signal)};
    } catch (error) {
      return {tileKeys, error};
    }
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

  function filterIitcGetEntitiesResponseToTiles(response: IitcGetEntitiesResponse, tileKeys: string[]): IitcGetEntitiesResponse {
    const allowedTileKeys = new Set(tileKeys);
    const map = Object.fromEntries(
      Object.entries(response.result?.map ?? {})
        .filter(([tileKey]) => allowedTileKeys.has(tileKey)),
    );
    return {
      ...response,
      result: {
        ...response.result,
        map,
      },
    };
  }

  function getMoveRefreshDelayMs(): number {
    return getLifecycleSettings().iitcMovementDelay ? IITC_MOVE_REFRESH_DELAY_MS : FAST_MOVE_REFRESH_DELAY_MS;
  }

  function getDownloadDelayMs(): number {
    return getLifecycleSettings().iitcMovementDelay ? IITC_DOWNLOAD_DELAY_MS : FAST_DOWNLOAD_DELAY_MS;
  }

  async function fetchArtifactEntitiesForRender(version: string, signal: AbortSignal): Promise<IitcRawGameEntity[]> {
    const startTime = performance.now();
    latestArtifactDiagnostics = {
      status: 'loading',
      portalCount: 0,
      types: [],
    };

    try {
      const entities = await fetchArtifactPortals(version, signal);
      signal.throwIfAborted();
      latestArtifactDiagnostics = {
        status: entities.length > 0 ? 'ready' : 'empty',
        portalCount: entities.length,
        types: getArtifactTypes(entities),
        elapsedMs: performance.now() - startTime,
      };
      return entities;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (isAuthLikeError(error)) throw error;
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
        const entities = toRenderEntities(fixtureResponse, generation);
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
        artifactEntitiesPromise ??= fetchArtifactEntitiesForRender(version, liveAbortController.signal);
        return artifactEntitiesPromise;
      };
      const responses: IitcGetEntitiesResponse[] = [];
      let renderQueue = createIitcRenderQueueState();
      let renderQueueDiagnostics = createEmptyRenderQueueDiagnostics();
      let bucketDiagnostics = createIitcResponseBucketDiagnostics();
      const freshCachedTileKeys: string[] = [];
      const staleCachedTileKeys: string[] = [];
      const queueTileKeys: string[] = [];
      for (const tileKey of plan.tileKeys) {
        const freshness = mapDataCache.isFresh(tileKey);
        const cachedTile = freshness === true ? mapDataCache.get(tileKey) : undefined;
        if (cachedTile) {
          freshCachedTileKeys.push(tileKey);
          renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, cachedTile, 'cache-fresh');
        } else {
          queueTileKeys.push(tileKey);
        }
      }
      let queueState = createIitcTileQueueState(queueTileKeys);
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
      const drainRenderQueue = (): IitcGetEntitiesResponse => {
        renderQueueDiagnostics = {
          ...renderQueueDiagnostics,
          queuedTiles: renderQueue.entries.length,
        };
        const drainResult = drainIitcRenderQueueBatch(renderQueue, IITC_RENDER_BATCH_SIZE, mergeIitcGetEntitiesResponses(responses));
        renderQueue = drainResult.state;
        renderQueueDiagnostics = appendRenderQueueDiagnostics(renderQueueDiagnostics, drainResult.tileStatuses);
        responses.length = 0;
        responses.push(drainResult.response);
        return drainResult.response;
      };
      let progressResponse: IitcGetEntitiesResponse | undefined;
      let progressEntities: IitcIrisRenderEntities | undefined;
      if (freshCachedTileKeys.length > 0) {
        const cachedResponse = drainRenderQueue();
        const entities = toRenderEntities(cachedResponse, generation);
        latestPlan = plan;
        progressResponse = cachedResponse;
        progressEntities = entities;
        progressEntities = renderLiveProgress(cachedResponse, entities, true);
        timingDiagnostics.cacheMs = performance.now() - refreshStartTime;
      }
      const cachedDiagnostics = progressResponse
        ? classifyIitcTileDiagnostics(progressResponse, plan.tileKeys)
        : {
          returnedTiles: freshCachedTileKeys.length,
          nonEmptyTiles: freshCachedTileKeys.length,
          emptyTileKeys: [],
          nonEmptyTileKeys: freshCachedTileKeys,
          unaccountedTileKeys: [],
        };
      postEntityStatus(`fetching ${plan.tileKeys.length} tiles`, progressEntities, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles: cachedDiagnostics.returnedTiles,
        nonEmptyTiles: cachedDiagnostics.nonEmptyTiles,
        firstRenderElapsedMs,
        viewportBounds: plan.viewportBounds,
        retryRequests: 0,
        retriedTileKeys: [],
        recoveredTileKeys: [],
        emptyTileKeys: cachedDiagnostics.emptyTileKeys,
        nonEmptyTileKeys: cachedDiagnostics.nonEmptyTileKeys,
        unaccountedTileKeys: [],
        ...bucketDiagnostics,
        cacheFreshTileKeys: freshCachedTileKeys,
        cacheStaleTileKeys: staleCachedTileKeys,
        queue: createIitcTileQueueDiagnostics(queueState),
        renderQueue: renderQueueDiagnostics,
        timing: timingDiagnostics,
      });

      let initialRequestCount = 0;
      let mergedResponse = mergeIitcGetEntitiesResponses(responses);
      const retriedTileKeys = new Set<string>();
      let retryRequests = 0;
      const processCompletedBatch = (result: TileBatchResult, startedAsRetry: boolean, countActiveRequest = true): number => {
        if (result.error && isAuthLikeError(result.error)) throw result.error;
        const previousStaleTileKeys = new Set(queueState.staleTileKeys);
        const wantedAtResponse = new Set(queueState.queuedTileKeys);
        const renderedTileKeys: string[] = [];

        if (result.response) {
          for (const tileKey of result.tileKeys) {
            const tile = result.response.result?.map?.[tileKey];
            if (tile && !tile.error) {
              mapDataCache.store(tileKey, tile);
              if (wantedAtResponse.has(tileKey)) {
                renderQueue = pushIitcRenderQueueTile(renderQueue, tileKey, tile, 'ok');
                renderedTileKeys.push(tileKey);
              }
            }
          }
        }

        const queueApplyResult = applyIitcTileRequestResponseToQueue(queueState, result.response ?? null, result.tileKeys, result.response !== undefined, {
          staleTileKeys: queueState.queuedTileKeys.filter((tileKey) => mapDataCache.get(tileKey) !== undefined),
          countActiveRequest,
        });
        queueState = queueApplyResult.state;
        for (const tileKey of queueState.staleTileKeys) {
          if (previousStaleTileKeys.has(tileKey)) continue;
          const staleTile = mapDataCache.get(tileKey);
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
        if (result.response && renderedTileKeys.length > 0) {
          responses.push(filterIitcGetEntitiesResponseToTiles(result.response, renderedTileKeys));
        }
        mergedResponse = drainRenderQueue();
        const entities = toRenderEntities(mergedResponse, generation);
        const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyIitcTileDiagnostics(mergedResponse, plan.tileKeys);
        initialRequestCount += 1;
        const recoveredTileKeys = getIitcRecoveredTileKeys([...retriedTileKeys], nonEmptyTileKeys);
        const statusEntities = renderLiveProgress(mergedResponse, entities, initialRequestCount === 1);
        postEntityStatus(startedAsRetry ? `retry ${retryRequests}` : `batch ${initialRequestCount}`, statusEntities, {
          requestedTiles: plan.tileKeys.length,
          returnedTiles,
          nonEmptyTiles,
          firstRenderElapsedMs,
          viewportBounds: plan.viewportBounds,
          retryRequests,
          retriedTileKeys: [...retriedTileKeys],
          recoveredTileKeys,
          emptyTileKeys,
          nonEmptyTileKeys,
          unaccountedTileKeys,
          ...bucketDiagnostics,
          cacheFreshTileKeys: freshCachedTileKeys,
          cacheStaleTileKeys: staleCachedTileKeys,
          queue: createIitcTileQueueDiagnostics(queueState),
          renderQueue: renderQueueDiagnostics,
          timing: timingDiagnostics,
        });
        return getIitcRequestQueueDelayMs(queueApplyResult.classification.queueDelayReason);
      };
      activeMapDataRefreshBridge = {
        generation,
        processExternalBatch: (result): boolean => {
          if (generation !== latestFetchGeneration) return false;
          const wantedTileKeys = result.tileKeys.filter((tileKey) => queueState.queuedTileKeys.includes(tileKey));
          if (wantedTileKeys.length === 0) return false;
          processCompletedBatch({
            ...result,
            tileKeys: wantedTileKeys,
            response: result.response ? filterIitcGetEntitiesResponseToTiles(result.response, wantedTileKeys) : undefined,
          }, false, false);
          return true;
        },
      };
      timingDiagnostics.downloadDelayMs = queueState.queuedTileKeys.length > 0 ? getDownloadDelayMs() : 0;
      const runIitcRefillQueue = async (): Promise<boolean> => {
        const inFlight = new Map<number, Promise<{id: number; result: TileBatchResult; startedAsRetry: boolean}>>();
        let requestId = 0;
        let nextRefillAt = 0;
        const fillOpenRequestSlots = (): void => {
          const batches = createIitcTileQueueRequestBatches(queueState);
          for (const batch of batches) {
            const startedAsRetry = batch.some((tileKey) => (queueState.tileErrorCount[tileKey] ?? 0) > 0);
            queueState = markIitcTileRequestStarted(queueState, batch);
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
              queueState = markIitcTileQueueStale(queueState);
              return false;
            }
            const warmedTileKeys = ENABLE_STALE_GENERATION_CACHE_WARMING
              ? storeSuccessfulTilePayloads(settled.result.response, settled.result.tileKeys)
              : storeWantedSuccessfulTilePayloads(settled.result.response, settled.result.tileKeys);
            recordStaleGenerationCacheWarmTileKeys(warmedTileKeys);
            queueState = markIitcTileQueueStale(queueState);
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
              queueState = markIitcTileQueueStale(queueState);
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
          queueState = markIitcTileQueueStale(queueState);
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
        queueState = markIitcTileQueueStale(queueState);
        if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
        return;
      }
      const artifactWaitStartTime = performance.now();
      const artifactEntities = await getArtifactEntitiesPromise();
      timingDiagnostics.artifactWaitMs = performance.now() - artifactWaitStartTime;
      if (generation !== latestFetchGeneration) {
        queueState = markIitcTileQueueStale(queueState);
        if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
        return;
      }
      const entities = toRenderEntities(mergedResponse, generation, artifactEntities);
      const {returnedTiles, nonEmptyTiles, emptyTileKeys, nonEmptyTileKeys, unaccountedTileKeys} = classifyIitcTileDiagnostics(mergedResponse, plan.tileKeys);
      const recoveredTileKeys = getIitcRecoveredTileKeys([...retriedTileKeys], nonEmptyTileKeys);
      queueState = markIitcTileQueueComplete(queueState);
      const partialTileKeys = plan.tileParams.hasPortals ? [] : [...queueState.failedTileKeys];
      latestPlan = plan;
      latestResponse = mergedResponse;
      renderEntities(entities);
      renderTileDebug(plan, mergedResponse);
      timingDiagnostics.totalMs = performance.now() - refreshStartTime;
      postEntityStatus('entities ready', entities, {
        requestedTiles: plan.tileKeys.length,
        returnedTiles,
        nonEmptyTiles,
        elapsedMs: performance.now() - refreshStartTime,
        firstRenderElapsedMs,
        viewportBounds: plan.viewportBounds,
        retryRequests,
        retriedTileKeys: [...retriedTileKeys],
        recoveredTileKeys,
        emptyTileKeys,
        nonEmptyTileKeys,
        unaccountedTileKeys,
        ...bucketDiagnostics,
        cacheFreshTileKeys: freshCachedTileKeys,
        cacheStaleTileKeys: staleCachedTileKeys,
        partialTileKeys,
        queue: createIitcTileQueueDiagnostics(queueState, partialTileKeys),
        renderQueue: renderQueueDiagnostics,
        timing: timingDiagnostics,
      });
      if (generation === latestFetchGeneration) latestWantedTileKeys = new Set();
      if (activeMapDataRefreshBridge?.generation === generation) activeMapDataRefreshBridge = undefined;
      if (currentFetchAbortController === abortController) currentFetchAbortController = undefined;
    } catch (error) {
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
    }
  }

  return {
    refreshEntities, scheduleEntityRefresh, cancelActiveEntityFetch, getMoveRefreshDelayMs,
    cancelScheduledRefresh: (): void => { getLifetime()?.cancelScheduled(refreshTimer); },
    mapMoveStart: (): void => {
      mapMoveInProgress = true;
      latestFetchGeneration += 1;
      latestRequestKey = '';
      latestWantedTileKeys = new Set();
      getLifetime()?.cancelScheduled(refreshTimer);
    },
    mapMoveEnd: (): void => {
      mapMoveInProgress = false;
      latestFetchGeneration += 1;
      latestRequestKey = '';
    },
    resetForDataSourceChange: (): void => {
      latestFetchGeneration += 1;
      latestRequestKey = '';
      cancelActiveEntityFetch();
    },
    dispose: (): void => {
      cancelActiveEntityFetch();
      latestFetchGeneration += 1;
      latestRequestKey = '';
      latestWantedTileKeys.clear();
      activeMapDataRefreshBridge = undefined;
      refreshTimer = undefined;
      mapMoveInProgress = false;
      latestPlan = undefined;
      latestResponse = undefined;
    },
    getSnapshot: (): MapRequestSnapshot => ({plan: latestPlan, response: latestResponse, artifacts: latestArtifactDiagnostics}),
  };
}
