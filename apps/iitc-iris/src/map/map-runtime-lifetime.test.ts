import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {createIitcIrisMapLifetime} from './map-runtime-lifetime';

function createMap(): Pick<LeafletMap, 'on' | 'off' | 'remove'> {
  const events = new EventTarget();
  return {
    on: vi.fn((name: string, callback: EventListener) => events.addEventListener(name, callback)),
    off: vi.fn((name: string, callback: EventListener) => events.removeEventListener(name, callback)),
    remove: vi.fn(() => events.dispatchEvent(new Event('unload'))),
  } as unknown as Pick<LeafletMap, 'on' | 'off' | 'remove'>;
}

describe('map runtime lifetime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      setTimeout, clearTimeout,
      requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16),
      cancelAnimationFrame: clearTimeout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('cancels old startup, refresh, and paint callbacks while the replacement remains active', () => {
    const oldMap = createMap();
    const cleanup = vi.fn();
    const old = createIitcIrisMapLifetime(oldMap, cleanup);
    const oldWork = vi.fn();
    old.schedule(oldWork, 0);
    old.schedule(oldWork, 250);
    old.requestFrame(oldWork);
    old.dispose();
    old.dispose();
    const nextMap = createMap();
    const next = createIitcIrisMapLifetime(nextMap, vi.fn());
    const ready = vi.fn();
    next.schedule(ready, 0);
    vi.runAllTimers();
    expect(old.signal.aborted).toBe(true);
    expect(oldWork).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(oldMap.remove).toHaveBeenCalledOnce();
    expect(ready).toHaveBeenCalledOnce();
    expect(next.signal.aborted).toBe(false);
    next.dispose();
  });

  it('also cleans up when Leaflet removes the map directly', () => {
    const map = createMap();
    const cleanup = vi.fn();
    const lifetime = createIitcIrisMapLifetime(map, cleanup);
    const callback = vi.fn();
    lifetime.schedule(callback, 100);
    map.remove();
    lifetime.dispose();
    vi.runAllTimers();
    expect(map.remove).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(callback).not.toHaveBeenCalled();
    expect(lifetime.schedule(callback, 0)).toBeUndefined();
    expect(lifetime.requestFrame(callback)).toBeUndefined();
  });

  it('cancels an individual scheduled refresh without stopping the map', () => {
    const lifetime = createIitcIrisMapLifetime(createMap(), vi.fn());
    const callback = vi.fn();
    lifetime.cancelScheduled(lifetime.schedule(callback, 100));
    vi.runAllTimers();
    expect(callback).not.toHaveBeenCalled();
    expect(lifetime.signal.aborted).toBe(false);
    lifetime.dispose();
  });

  it('rejects a late response body after disposal, even when fetch ignores cancellation', async () => {
    let finishBody: (text: string) => void = () => undefined;
    const body = new Promise<string>((resolve) => { finishBody = resolve; });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({text: () => body} as Response);
    vi.stubGlobal('fetch', fetchMock);
    const lifetime = createIitcIrisMapLifetime(createMap(), vi.fn());
    const pending = lifetime.fetchText('/r/getEntities');
    const rejected = expect(pending).rejects.toMatchObject({name: 'AbortError'});
    await Promise.resolve();
    lifetime.dispose();
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    finishBody('{"result": "old map"}');
    await rejected;
  });

  it('honors request cancellation and detaches signal listeners after successful requests', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('ready'));
    vi.stubGlobal('fetch', fetchMock);
    const lifetime = createIitcIrisMapLifetime(createMap(), vi.fn());
    const request = new AbortController();
    const remove = vi.spyOn(request.signal, 'removeEventListener');
    expect((await lifetime.fetchText('/r/getPlexts', {signal: request.signal})).text).toBe('ready');
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    request.abort();
    await expect(lifetime.fetchText('/r/getPlexts', {signal: request.signal})).rejects.toMatchObject({name: 'AbortError'});
    expect(fetchMock).toHaveBeenCalledOnce();
    lifetime.dispose();
    await expect(lifetime.fetchText('/r/getEntities')).rejects.toMatchObject({name: 'AbortError'});
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('cancels an individual request while leaving other map work active', async () => {
    let finishBody: (text: string) => void = () => undefined;
    const body = new Promise<string>((resolve) => { finishBody = resolve; });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({text: () => body} as Response));
    const lifetime = createIitcIrisMapLifetime(createMap(), vi.fn());
    const request = new AbortController();
    const pending = lifetime.fetchText('/r/getPlexts', {signal: request.signal});
    const rejected = expect(pending).rejects.toMatchObject({name: 'AbortError'});
    await Promise.resolve();
    request.abort();
    finishBody('superseded request');
    await rejected;
    expect(lifetime.signal.aborted).toBe(false);
    const callback = vi.fn();
    lifetime.schedule(callback, 0);
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledOnce();
    lifetime.dispose();
  });
});
