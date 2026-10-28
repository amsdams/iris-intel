import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from './messages';

const leaflet = vi.hoisted(() => ({map: vi.fn(), tileLayer: vi.fn(), layerGroup: vi.fn()}));
vi.mock('leaflet', () => ({default: {
  ...leaflet,
  control: {zoom: (): {addTo: ReturnType<typeof vi.fn>} => ({addTo: vi.fn()})},
  point: (x: number, y: number): {x: number; y: number} => ({x, y}),
}}));

vi.mock('./map/layers/base-layers', () => ({createBaseLayer: leaflet.tileLayer}));
vi.mock('./map/map-canvas', () => ({IitcIrisCanvas: vi.fn(), IitcIrisCanvasMap: leaflet.map}));
vi.mock('./map/entities/portal-image-canvas', () => ({createPortalImageCanvas: vi.fn(), createPortalImage: vi.fn()}));
vi.mock('./map/entities/portal-label-canvas', () => ({createPortalLevelCanvas: vi.fn(), createPortalLevelLabel: vi.fn(),
  createPortalKeyCountCanvas: vi.fn(), createPortalKeyCountLabel: vi.fn()}));

class Container extends EventTarget {
  getBoundingClientRect(): {left: number; top: number} { return {left: 0, top: 0}; }
}

interface TestMap {
  setView: ReturnType<typeof vi.fn<() => TestMap>>;
  getContainer: () => Container;
  getCenter: () => {lat: number; lng: number};
  getZoom: () => number;
  setMaxZoom: ReturnType<typeof vi.fn>;
  removeLayer: ReturnType<typeof vi.fn>;
  getBounds: () => {getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number};
  getPane: () => undefined;
  createPane: () => {style: Record<string, string>};
  invalidateSize: ReturnType<typeof vi.fn<() => void>>;
  on: (name: string, callback: () => void) => void;
  off: (name: string, callback: () => void) => void;
  remove: ReturnType<typeof vi.fn<() => void>>;
}

function createMap(container: Container): TestMap {
  const handlers = new Map<string, Set<() => void>>();
  const map: TestMap = {
    setView: vi.fn(() => map),
    getContainer: () => container,
    getCenter: () => ({lat: 52.373, lng: 4.892}),
    getZoom: () => 11,
    setMaxZoom: vi.fn(),
    removeLayer: vi.fn(),
    getBounds: () => ({getSouth: () => 52.3, getWest: () => 4.8, getNorth: () => 52.4, getEast: () => 4.9}),
    getPane: () => undefined,
    createPane: () => ({style: {}}),
    invalidateSize: vi.fn(),
    on: (name: string, callback: () => void): void => {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name)?.add(callback);
    },
    off: (name: string, callback: () => void): void => { handlers.get(name)?.delete(callback); },
    remove: vi.fn(() => {
      for (const callback of handlers.get('unload') ?? []) callback();
      handlers.clear();
    }),
  };
  return map;
}

describe('page runtime map replacement', () => {
  let container: Container | null;
  let maps: ReturnType<typeof createMap>[];
  let page: EventTarget & {postMessage: ReturnType<typeof vi.fn<(message: IitcIrisMessage) => void>>};

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    container = new Container();
    maps = [];
    page = Object.assign(new EventTarget(), {
      setTimeout, clearTimeout,
      requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16),
      cancelAnimationFrame: clearTimeout,
      localStorage: {getItem: (key: string) => key === 'iitc-iris:base-layer' ? 'osm' : null, setItem: vi.fn()},
      location: {href: 'https://intel.ingress.com/', search: ''},
      history: {replaceState: vi.fn()},
      postMessage: vi.fn<(message: IitcIrisMessage) => void>(),
      niantic_params: {CURRENT_VERSION: 'test'},
      PLAYER: {nickname: 'tester'},
    });
    vi.stubGlobal('window', page);
    vi.stubGlobal('document', {
      get cookie(): string { return 'csrftoken=test'; },
      set cookie(_value: string) { /* Browser cookie assignments retain the CSRF cookie. */ },
      currentScript: null,
      getElementById: () => container,
      querySelectorAll: () => [],
    });
    vi.stubGlobal('HTMLScriptElement', class extends EventTarget {});
    leaflet.map.mockImplementation(function(element: Container) {
      const map = createMap(element);
      maps.push(map);
      return map;
    });
    leaflet.tileLayer.mockImplementation(() => ({addTo: vi.fn(), on: vi.fn(), off: vi.fn()}));
    leaflet.layerGroup.mockImplementation(() => ({addTo: vi.fn(), clearLayers: vi.fn()}));
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async () => new Response('{"result": false}')));
  });

  afterEach(() => {
    window.__iitcIrisMap?.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('recreates the base layer and cancels the old startup when the container changes', async () => {
    await import('./page-map-runtime');
    expect(maps).toHaveLength(1);
    const first = maps[0];
    container = new Container();
    page.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
    const second = maps[1];
    expect(first.remove).toHaveBeenCalledOnce();
    expect(leaflet.tileLayer).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(first.invalidateSize).not.toHaveBeenCalled();
    expect(second.invalidateSize).toHaveBeenCalledOnce();
    expect(page.postMessage.mock.calls.filter(([message]) => message.type === IITC_IRIS_MESSAGES.pageReady)).toHaveLength(1);
    page.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
    expect(maps).toHaveLength(2);
    second.remove();
    expect(window.__iitcIrisMap).toBeUndefined();
    expect(window.__iitcIrisLayers).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts an old subscription request and ignores its late body after replacement', async () => {
    let finishOldBody: (text: string) => void = () => undefined;
    const oldBody = new Promise<string>((resolve) => { finishOldBody = resolve; });
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({text: () => oldBody} as Response)
      .mockResolvedValue(new Response('{"result": false}'));
    vi.stubGlobal('fetch', fetchMock);
    await import('./page-map-runtime');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledOnce();
    const oldSignal = fetchMock.mock.calls[0][1]?.signal;
    container = new Container();
    page.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
    expect(oldSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    finishOldBody('{"result": true}');
    await vi.advanceTimersByTimeAsync(0);
    const agentMessages = page.postMessage.mock.calls.map(([message]) => message).filter((message) => message.type === IITC_IRIS_MESSAGES.agentStatus);
    expect(agentMessages.at(-1)?.agent?.subscription?.status).toBe('inactive');
    expect(agentMessages.some((message) => message.agent?.subscription?.status === 'active')).toBe(false);
  });

  it('keeps one boot retry and cancels it when the container-ready event starts the map', async () => {
    container = null;
    await import('./page-map-runtime');
    page.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
    page.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
    expect(vi.getTimerCount()).toBe(1);
    container = new Container();
    page.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
    maps[0].remove();
    vi.advanceTimersByTime(100);
    expect(maps).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
