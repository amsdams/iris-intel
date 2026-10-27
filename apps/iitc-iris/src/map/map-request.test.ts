import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import type {IitcGetEntitiesResponse, IitcRawGameEntity} from '@iris/iitc-core';
import type {IitcIrisDataSourceSettings, IitcIrisRenderEntities} from '../messages';
import {createIitcIrisMapLifetime} from './map-runtime-lifetime';
import {createMapRequest} from './map-request';

type Options = Parameters<typeof createMapRequest>[0];
type TextResponse = Awaited<ReturnType<Options['fetchIitcEndpointText']>>;
const textResponse = (value: unknown): TextResponse => ({response: new Response(), text: JSON.stringify(value)});
const rawPortal = (guid: string): IitcRawGameEntity => [guid, 1000,
  ['p', 'E', 52373000, 4895000, 6, 80, 8, 'image', guid, [], false, false, null, 1000]];
const success = (tileKeys: string[], guid = 'portal'): IitcGetEntitiesResponse => ({result: {map:
  Object.fromEntries(tileKeys.map(key => [key, {gameEntities: [rawPortal(guid)]}]))}});
const requestTiles = (init: RequestInit): string[] => (JSON.parse(String(init.body)) as {tileKeys: string[]}).tileKeys;
function deferred<T>(): {promise: Promise<T>; resolve: (value: T) => void} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return {promise, resolve};
}

interface Harness {
  runtime: ReturnType<typeof createMapRequest>;
  fetchEndpoint: ReturnType<typeof vi.fn<Options['fetchIitcEndpointText']>>;
  renderEntities: ReturnType<typeof vi.fn<Options['renderEntities']>>;
  postStatus: ReturnType<typeof vi.fn<Options['postEntityStatus']>>;
  clearAll: ReturnType<typeof vi.fn>;
  entityCalls: () => Parameters<Options['fetchIitcEndpointText']>[];
  move: (lng?: number) => void;
  setSource: (next: IitcIrisDataSourceSettings) => void;
  lifetime: () => ReturnType<typeof createIitcIrisMapLifetime>;
  replaceMap: () => void;
}

function setup(iitcMovementDelay = false, span = .00001): Harness {
  let center = {lat: 52.3730796, lng: 4.8924534};
  let source: IitcIrisDataSourceSettings = {mode: 'live'};
  let entities: IitcIrisRenderEntities | undefined;
  const map = {
    on: vi.fn(), off: vi.fn(), remove: vi.fn(),
    getCenter: (): {lat: number; lng: number} => center, getZoom: (): number => 16,
    getBounds: (): {getSouth: () => number; getNorth: () => number; getWest: () => number; getEast: () => number} => ({getSouth: (): number => center.lat - span, getNorth: (): number => center.lat + span,
      getWest: (): number => center.lng - span, getEast: (): number => center.lng + span}),
  };
  let lifetime = createIitcIrisMapLifetime(map, () => runtime.dispose());
  const fetchEndpoint = vi.fn<Options['fetchIitcEndpointText']>().mockImplementation(async (endpoint, init) =>
    textResponse(endpoint === 'getEntities' ? success(requestTiles(init)) : {result: {}}));
  const renderEntities = vi.fn<Options['renderEntities']>(value => { entities = value; });
  const postStatus = vi.fn<Options['postEntityStatus']>();
  const clearAll = vi.fn();
  const runtime = createMapRequest({
    getMap: () => map as unknown as LeafletMap, getLifetime: () => lifetime,
    getDataSource: () => source, getLifecycleSettings: () => ({iitcMovementDelay}),
    isAuthRecoveryActive: () => false, getEntities: () => entities, portalHistoryByGuid: new Map(),
    fetchIitcEndpointText: fetchEndpoint, renderEntities, renderTileDebug: vi.fn(), clearAllRenderedLayers: clearAll,
    postEntityStatus: postStatus, recordStaleGenerationCacheWarmTileKeys: vi.fn(),
  });
  return {runtime, fetchEndpoint, renderEntities, postStatus, clearAll,
    entityCalls: () => fetchEndpoint.mock.calls.filter(([endpoint]) => endpoint === 'getEntities'),
    move: (lng?: number): void => {
      runtime.mapMoveStart();
      if (lng !== undefined) center = {...center, lng};
      runtime.mapMoveEnd();
    },
    setSource: (next: IitcIrisDataSourceSettings): void => { source = next; runtime.resetForDataSourceChange(); },
    lifetime: () => lifetime,
    replaceMap: (): void => { lifetime.dispose(); lifetime = createIitcIrisMapLifetime(map, () => runtime.dispose()); },
  };
}

describe('map request coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {setTimeout, clearTimeout, niantic_params: {CURRENT_VERSION: 'test'}});
    vi.stubGlobal('document', {cookie: 'csrftoken=test', querySelectorAll: () => []});
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('renders successful tiles, deduplicates a refresh, and reuses fresh cached tiles after movement', async () => {
    const test = setup();
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(1);
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('portal');
    const tiles = test.runtime.getSnapshot().plan?.tileKeys;
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(1);
    test.move();
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(1);
    expect(test.postStatus.mock.lastCall).toMatchObject(['entities ready', expect.anything(), {
      cacheFreshTileKeys: tiles, renderQueue: {renderedCacheFreshTiles: tiles?.length},
    }]);
  });

  it('fills five concurrent request slots and refills them until all tiles are delivered', async () => {
    const test = setup(false, .05);
    const batches: {tiles: string[]; response: ReturnType<typeof deferred<TextResponse>>; finished: boolean}[] = [];
    test.fetchEndpoint.mockImplementation(async (endpoint, init) => {
      if (endpoint !== 'getEntities') return textResponse({result: {}});
      const batch = {tiles: requestTiles(init), response: deferred<TextResponse>(), finished: false};
      batches.push(batch);
      expect(batches.filter(item => !item.finished).length).toBeLessThanOrEqual(5);
      return await batch.response.promise;
    });
    const pending = test.runtime.refreshEntities();
    expect(batches).toHaveLength(5);
    for (let pass = 0; pass < 50 && test.postStatus.mock.lastCall?.[0] !== 'entities ready'; pass += 1) {
      const unfinished = batches.filter(item => !item.finished);
      for (const batch of unfinished) {
        batch.finished = true;
        batch.response.resolve(textResponse(success(batch.tiles)));
      }
      await vi.advanceTimersByTimeAsync(0);
    }
    await pending;
    expect(batches.length).toBeGreaterThan(5);
    const delivered = new Set(batches.flatMap(batch => batch.tiles));
    expect(delivered.size).toBe(test.runtime.getSnapshot().plan?.tileKeys.length);
    expect(test.postStatus.mock.lastCall?.[0]).toBe('entities ready');
  });

  it('retries TIMEOUT tiles immediately and preserves recovery diagnostics', async () => {
    const test = setup();
    test.fetchEndpoint.mockImplementationOnce(async (_endpoint, init) => textResponse({result: {map:
      Object.fromEntries(requestTiles(init).map(key => [key, {error: 'TIMEOUT'}]))}}));
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(2);
    expect(test.postStatus.mock.lastCall?.[2]).toMatchObject({retryRequests: 1,
      recoveredTileKeys: test.runtime.getSnapshot().plan?.tileKeys, queue: {failedTiles: 0}});
  });

  it('keeps the error backoff and cancels a delayed retry when the map is disposed', async () => {
    const test = setup();
    test.fetchEndpoint.mockResolvedValueOnce(textResponse({error: 'server failure'}));
    const pending = test.runtime.refreshEntities();
    await vi.advanceTimersByTimeAsync(4999);
    expect(test.entityCalls()).toHaveLength(1);
    test.lifetime().dispose();
    await pending;
    await vi.advanceTimersByTimeAsync(10000);
    expect(test.entityCalls()).toHaveLength(1);
    expect(test.clearAll).not.toHaveBeenCalled();
    expect(test.runtime.getSnapshot().plan).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('hands a still-wanted old response to the current refresh without rendering the old generation', async () => {
    const test = setup();
    const old = deferred<TextResponse>();
    const current = deferred<TextResponse>();
    test.fetchEndpoint.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const previous = test.runtime.refreshEntities();
    test.move();
    const next = test.runtime.refreshEntities();
    const [oldCall, nextCall] = test.entityCalls();
    expect(oldCall[1].signal?.aborted).toBe(false);
    old.resolve(textResponse(success(requestTiles(oldCall[1]), 'handed-off')));
    await previous;
    const generation = test.renderEntities.mock.lastCall?.[0].generation;
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('handed-off');
    current.resolve(textResponse(success(requestTiles(nextCall[1]), 'latest')));
    await next;
    expect(test.renderEntities.mock.calls.every(([value]) => value.generation === generation)).toBe(true);
    expect(test.postStatus.mock.lastCall?.[0]).toBe('entities ready');
  });

  it('does not warm unrelated tiles from a superseded viewport response', async () => {
    const test = setup();
    const old = deferred<TextResponse>();
    test.fetchEndpoint.mockReturnValueOnce(old.promise);
    const previous = test.runtime.refreshEntities();
    const oldTiles = requestTiles(test.entityCalls()[0][1]);
    test.move(5.5);
    await test.runtime.refreshEntities();
    old.resolve(textResponse(success(oldTiles, 'unwanted')));
    await previous;
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('portal');
    test.move(4.8924534);
    await test.runtime.refreshEntities();
    expect(test.entityCalls().filter(([, init]) => requestTiles(init).some(key => oldTiles.includes(key)))).toHaveLength(2);
  });

  it('rejects late old-map results and resets request identity while retaining the page-owned cache', async () => {
    const test = setup();
    const old = deferred<TextResponse>();
    test.fetchEndpoint.mockReturnValueOnce(old.promise);
    const previous = test.runtime.refreshEntities();
    const oldCall = test.entityCalls()[0];
    test.replaceMap();
    expect(oldCall[1].signal?.aborted).toBe(true);
    old.resolve(textResponse(success(requestTiles(oldCall[1]), 'old-map')));
    await previous;
    expect(test.renderEntities).not.toHaveBeenCalled();
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(2);
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('portal');
    test.replaceMap();
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(2);
    expect(test.postStatus.mock.lastCall?.[2]?.cacheFreshTileKeys?.length).toBeGreaterThan(0);
  });

  it('uses stale cached tiles after retry exhaustion instead of losing the existing data', async () => {
    const test = setup();
    await test.runtime.refreshEntities();
    vi.setSystemTime(Date.now() + 181000);
    test.move();
    test.fetchEndpoint.mockImplementation(async (endpoint, init) => textResponse(endpoint === 'getEntities'
      ? {result: {map: Object.fromEntries(requestTiles(init).map(key => [key, {error: 'TIMEOUT'}]))}}
      : {result: {}}));
    await test.runtime.refreshEntities();
    expect(test.entityCalls().length).toBeGreaterThan(2);
    expect(test.postStatus.mock.lastCall?.[0]).toBe('entities ready');
    expect(test.postStatus.mock.lastCall?.[2]?.cacheStaleTileKeys).toEqual(test.runtime.getSnapshot().plan?.tileKeys);
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('portal');
  });

  it('retains the optional IITC movement and download delays', async () => {
    const test = setup(true);
    expect(test.runtime.getMoveRefreshDelayMs()).toBe(400);
    test.runtime.scheduleEntityRefresh(test.runtime.getMoveRefreshDelayMs());
    await vi.advanceTimersByTimeAsync(399);
    expect(test.runtime.getSnapshot().plan).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.entityCalls()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(test.entityCalls()).toHaveLength(1);
    expect(test.postStatus.mock.lastCall?.[0]).toBe('entities ready');
  });

  it('ignores a superseded fixture completion after a source switch', async () => {
    const test = setup();
    const old = deferred<TextResponse>();
    vi.spyOn(test.lifetime(), 'fetchText').mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(textResponse(success(['fixture'], 'current-fixture')));
    test.setSource({mode: 'fixture', id: 'old', label: 'old', url: '/old.json'});
    const previous = test.runtime.refreshEntities();
    test.setSource({mode: 'fixture', id: 'current', label: 'current', url: '/current.json'});
    await test.runtime.refreshEntities();
    old.resolve(textResponse(success(['fixture'], 'old-fixture')));
    await previous;
    expect(test.renderEntities).toHaveBeenCalledTimes(1);
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('current-fixture');
    expect(test.postStatus.mock.lastCall?.[0]).toBe('fixture current');
    expect(test.fetchEndpoint).not.toHaveBeenCalled();
  });

  it('treats login HTML as authentication failure without retrying or rendering it', async () => {
    const test = setup();
    test.fetchEndpoint.mockResolvedValueOnce({response: new Response(), text: '<!doctype html><html>Login</html>'});
    await test.runtime.refreshEntities();
    expect(test.entityCalls()).toHaveLength(1);
    expect(test.clearAll).toHaveBeenCalledOnce();
    expect(test.postStatus.mock.lastCall?.[0]).toContain('getEntities returned login html');
    expect(test.renderEntities).not.toHaveBeenCalled();
  });

  it('does not send requests before the Intel version is available', async () => {
    vi.stubGlobal('window', {setTimeout, clearTimeout});
    const test = setup();
    await test.runtime.refreshEntities();
    expect(test.fetchEndpoint).not.toHaveBeenCalled();
    expect(test.postStatus.mock.lastCall?.[0]).toBe('getEntities missing Intel version');
  });

  it('keeps normal entities when artifacts fail and exposes the artifact failure separately', async () => {
    const test = setup();
    test.fetchEndpoint.mockImplementation(async (endpoint, init) => endpoint === 'getEntities'
      ? textResponse(success(requestTiles(init))) : {response: new Response('', {status: 503}), text: 'unavailable'});
    await test.runtime.refreshEntities();
    expect(test.postStatus.mock.lastCall?.[0]).toBe('entities ready');
    expect(test.runtime.getSnapshot().artifacts).toMatchObject({status: 'error', error: 'getArtifactPortals failed HTTP 503'});
    expect(test.renderEntities.mock.lastCall?.[0].portals[0].guid).toBe('portal');
  });
});
