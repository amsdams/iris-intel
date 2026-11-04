import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisRenderPortal, type IitcIrisSearchResult} from '../../messages';
import type {IitcIrisMapLifetime} from '../map-runtime-lifetime';
import {createSearchRuntime} from './search-runtime';

vi.mock('leaflet', () => ({default: {}}));

function deferred<T>(): {promise: Promise<T>; resolve: (value: T) => void; reject: (reason: Error) => void} {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

const response = (title: string): {response: Response; text: string} => ({response: new Response(), text: JSON.stringify([
  {place_id: title, display_name: title, lat: '52', lon: '4'},
])});

describe('Search runtime request ownership', () => {
  const postMessage = vi.fn<(message: IitcIrisMessage, origin: string) => void>();
  const fetchText = vi.fn<IitcIrisMapLifetime['fetchText']>();
  const clearLayers = vi.fn();
  let runtime: ReturnType<typeof createSearchRuntime>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchText.mockReset();
    vi.stubGlobal('window', {postMessage});
    runtime = createSearchRuntime({
      getMap: () => ({getBounds: () => ({getWest: (): number => 3, getSouth: (): number => 51, getEast: (): number => 5, getNorth: (): number => 53})}) as unknown as LeafletMap,
      getLifetime: () => ({fetchText}) as unknown as IitcIrisMapLifetime,
      getPortals: () => [], getPortalRadius: () => 7, selectPortal: vi.fn(),
      clearLayers, addLayer: vi.fn(), pane: 'iitc-iris-search',
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps local coordinate search offline and emits normalized state', async () => {
    await runtime.runSearch(' 52.0,4.0 ');
    expect(fetchText).not.toHaveBeenCalled();
    expect(postMessage.mock.lastCall?.[0]).toMatchObject({
      type: IITC_IRIS_MESSAGES.searchStatus, search: {term: '52.0,4.0', confirmed: false},
    });
    expect(postMessage.mock.lastCall?.[0].search?.results).toHaveLength(1);
    expect(postMessage.mock.lastCall?.[0].search?.results[0]).toMatchObject({type: 'coordinate', lat: 52, lng: 4});
  });

  it('falls back from an empty bounded geocoder response using the same viewport', async () => {
    fetchText.mockResolvedValueOnce({response: new Response(), text: '[]'}).mockResolvedValueOnce(response('Amsterdam'));
    await runtime.runSearch('Amsterdam', true);
    expect(fetchText).toHaveBeenCalledTimes(2);
    const first = new URL(fetchText.mock.calls[0][0]);
    const second = new URL(fetchText.mock.calls[1][0]);
    expect(first.searchParams.get('viewbox')).toBe('3,51,5,53');
    expect(first.searchParams.get('bounded')).toBe('1');
    expect(second.searchParams.get('viewbox')).toBe(first.searchParams.get('viewbox'));
    expect(second.searchParams.has('bounded')).toBe(false);
    expect(postMessage.mock.lastCall?.[0].search).toMatchObject({status: 'ready', confirmed: true, results: [expect.objectContaining({title: 'Amsterdam'})]});
  });

  it('ignores superseded online responses instead of overwriting the newer query', async () => {
    const old = deferred<Awaited<ReturnType<IitcIrisMapLifetime['fetchText']>>>();
    fetchText.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response('Rotterdam'));
    const previous = runtime.runSearch('Amsterdam', true);
    await runtime.runSearch('Rotterdam', true);
    const count = postMessage.mock.calls.length;
    old.resolve(response('Amsterdam'));
    await previous;
    expect(postMessage).toHaveBeenCalledTimes(count);
    expect(postMessage.mock.lastCall?.[0].search?.term).toBe('Rotterdam');
  });

  for (const finish of ['resolve', 'reject'] as const) {
    it(`clear invalidates a late ${finish} without resurrecting results`, async () => {
      const pending = deferred<Awaited<ReturnType<IitcIrisMapLifetime['fetchText']>>>();
      fetchText.mockReturnValueOnce(pending.promise);
      const search = runtime.runSearch('Amsterdam', true);
      runtime.clearSearch();
      const count = postMessage.mock.calls.length;
      if (finish === 'resolve') pending.resolve(response('Amsterdam'));
      else pending.reject(new Error('old request failed'));
      await search;
      expect(postMessage).toHaveBeenCalledTimes(count);
      expect(postMessage.mock.lastCall?.[0].search?.status).toBe('idle');
    });
  }

  it('map disposal invalidates pending work without clearing replacement layers or posting stale errors', async () => {
    const pending = deferred<Awaited<ReturnType<IitcIrisMapLifetime['fetchText']>>>();
    fetchText.mockReturnValueOnce(pending.promise);
    const search = runtime.runSearch('Amsterdam', true);
    runtime.invalidateSearch();
    await runtime.runSearch('52.0,4.0');
    clearLayers.mockClear();
    const count = postMessage.mock.calls.length;
    pending.reject(new DOMException('map removed', 'AbortError'));
    await search;
    expect(clearLayers).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledTimes(count);
    expect(postMessage.mock.lastCall?.[0].search?.term).toBe('52.0,4.0');
  });
});

describe('Search navigation during zoom', () => {
  const portals: IitcIrisRenderPortal[] = [
    {guid: 'a', title: 'A', team: 'N', latE6: 52000000, lngE6: 4000000, isPlaceholder: false},
    {guid: 'b', title: 'B', team: 'N', latE6: 52001000, lngE6: 4001000, isPlaceholder: false},
  ];

  function setup(): {
    runtime: ReturnType<typeof createSearchRuntime>;
    map: LeafletMap;
    setView: ReturnType<typeof vi.fn>;
    selectPortal: ReturnType<typeof vi.fn>;
    controller: AbortController;
    emit: (event: string) => void;
    flushFrames: () => void;
  } {
    const listeners = new Map<string, Set<() => void>>();
    const frames: FrameRequestCallback[] = [];
    const controller = new AbortController();
    const setView = vi.fn();
    const selectPortal = vi.fn();
    const map = {
      setView,
      on: (event: string, listener: () => void): void => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)?.add(listener);
      },
      off: (event: string, listener: () => void): void => { listeners.get(event)?.delete(listener); },
    } as unknown as LeafletMap;
    const lifetime = {
      signal: controller.signal,
      requestFrame: (callback: FrameRequestCallback): number => frames.push(callback),
    } as unknown as IitcIrisMapLifetime;
    const runtime = createSearchRuntime({
      getMap: () => map, getLifetime: () => lifetime, getPortals: () => portals,
      getPortalRadius: () => 7, selectPortal, clearLayers: vi.fn(), addLayer: vi.fn(), pane: 'search',
    });
    runtime.bindMap(map);
    return {runtime, map, setView, selectPortal, controller,
      emit: (event): void => { listeners.get(event)?.forEach(listener => listener()); },
      flushFrames: (): void => { frames.splice(0).forEach(callback => callback(0)); },
    };
  }

  const result = (guid: string): IitcIrisSearchResult => ({id: guid, type: 'portal', title: guid, guid});

  it('waits for an ongoing zoom and applies only the most recent portal selection', () => {
    const {runtime, setView, selectPortal, emit, flushFrames} = setup();
    emit('zoomstart');
    runtime.selectSearchResult(result('a'));
    runtime.selectSearchResult(result('b'));
    flushFrames();
    expect(setView).not.toHaveBeenCalled();
    expect(selectPortal).not.toHaveBeenCalled();
    emit('zoomend');
    expect(setView).not.toHaveBeenCalled();
    flushFrames();
    expect(setView).toHaveBeenCalledExactlyOnceWith([52.001, 4.001], 15);
    expect(selectPortal).toHaveBeenCalledExactlyOnceWith(portals[1]);
  });

  it('coalesces selections made before the next animation frame', () => {
    const {runtime, setView, flushFrames} = setup();
    runtime.selectSearchResult(result('a'));
    runtime.selectSearchResult(result('b'));
    flushFrames();
    expect(setView).toHaveBeenCalledExactlyOnceWith([52.001, 4.001], 15);
  });

  for (const cancel of ['clear', 'invalidate', 'dispose'] as const) {
    it(`${cancel} prevents a queued selection from moving the map`, () => {
      const {runtime, setView, emit, flushFrames, controller} = setup();
      vi.stubGlobal('window', {postMessage: vi.fn()});
      try {
        emit('zoomstart');
        runtime.selectSearchResult(result('b'));
        if (cancel === 'clear') runtime.clearSearch();
        if (cancel === 'invalidate') runtime.invalidateSearch();
        if (cancel === 'dispose') controller.abort();
        emit('zoomend');
        flushFrames();
        expect(setView).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  }

  it('detaches old-map zoom events and discards frames when the map is replaced', () => {
    const {runtime, setView, emit, flushFrames} = setup();
    runtime.selectSearchResult(result('a'));
    runtime.bindMap({on: vi.fn(), off: vi.fn()} as unknown as LeafletMap);
    emit('zoomstart');
    emit('zoomend');
    flushFrames();
    expect(setView).not.toHaveBeenCalled();
  });
});
