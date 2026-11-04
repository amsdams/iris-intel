import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createCommRuntime, normalizeCommTab} from './comm-runtime';
import type {LatLngBounds} from 'leaflet';
import type {IitcIrisRequestDiagnostics} from '../messages';

type Options = Parameters<typeof createCommRuntime>[0];
function message(guid = 'new', time = 2000): unknown[] {
  return [guid, time, {plext: {text: guid, categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST',
    markup: [['PLAYER', {plain: 'Agent', team: 'RESISTANCE'}], ['TEXT', {plain: ' captured '}],
      ['PORTAL', {name: 'Portal', address: 'Street', latE6: 52000000, lngE6: 4000000}]]}}];
}
function reply(body: unknown, status = 200): {response: Response; text: string} {
  const response = Response.json(body, {status});
  return {response, text: JSON.stringify(body)};
}

describe('COMM runtime ownership', () => {
  let options: Options;
  let fetchText: ReturnType<typeof vi.fn<Options['fetchIitcEndpointText']>>;
  let runtime: ReturnType<typeof createCommRuntime>;
  let lifetime: AbortController;
  let params: {CURRENT_VERSION: string};
  let stored: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    lifetime = new AbortController();
    params = {CURRENT_VERSION: 'version'};
    stored = vi.fn().mockReturnValue('faction');
    vi.stubGlobal('window', {postMessage: vi.fn(), localStorage: {getItem: stored}, niantic_params: params});
    vi.stubGlobal('document', {cookie: 'csrftoken=token', querySelectorAll: () => []});
    fetchText = vi.fn<Options['fetchIitcEndpointText']>().mockResolvedValue(reply({result: [message()]}));
    options = {getMap: (): ReturnType<Options['getMap']> => ({getBounds: (): LatLngBounds => ({getSouth: (): number => 51, getWest: (): number => 3,
      getNorth: (): number => 53, getEast: (): number => 5}) as LatLngBounds}) as ReturnType<Options['getMap']>,
      getLifetime: (): ReturnType<Options['getLifetime']> => ({signal: lifetime.signal,
        schedule: (callback, delay) => Number(setTimeout(callback, delay)), cancelScheduled: timer => clearTimeout(timer)}), getMapCenterE6: (): ReturnType<Options['getMapCenterE6']> => ({latE6: 52000000, lngE6: 4000000}),
      fetchIitcEndpointText: fetchText, getIitcRequestDiagnostics: (): IitcIrisRequestDiagnostics => ({}) as IitcIrisRequestDiagnostics,
      onPublicMessages: vi.fn()};
    runtime = createCommRuntime(options);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('retains the stored tab and tolerates unavailable storage', () => {
    expect(runtime.getState()).toMatchObject({status: 'idle', tab: 'faction'});
    expect(stored).toHaveBeenCalledWith('iitc-chat-tab');
    stored.mockImplementation(() => {throw new Error('blocked');});
    expect(createCommRuntime(options).getState().tab).toBe('all');
    expect(normalizeCommTab('invalid')).toBe('all');
    expect(normalizeCommTab('alerts')).toBe('alerts');
  });

  it('uses authenticated channel requests and preserves portal/player previews', async () => {
    await runtime.refreshComm('all');
    const [endpoint, init, group] = fetchText.mock.calls[0];
    expect({endpoint, group, method: init.method, credentials: init.credentials, headers: init.headers}).toMatchObject({
      endpoint: 'getPlexts', group: 'comm-all', method: 'POST', credentials: 'include', headers: {'X-CSRFToken': 'token'}});
    expect(JSON.parse(String(init.body)) as unknown).toMatchObject({v: 'version', tab: 'all', minLatE6: 51000000,
      maxLngE6: 5000000, minTimestampMs: -1, maxTimestampMs: -1});
    expect(runtime.getState()).toMatchObject({status: 'ready', tab: 'all', messages: 1,
      recent: [{id: 'new', player: 'Agent', players: ['Agent'], portals: [{name: 'Portal', address: 'Street'}]}]});
    expect(options.onPublicMessages).toHaveBeenCalledOnce();
  });

  it('uses one public request for the panel and tracker and publishes its buffer', async () => {
    options.isPublicChannelInterested = (): boolean => true;
    runtime = createCommRuntime(options);
    runtime.scheduleRefresh(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchText).toHaveBeenCalledOnce();
    expect(runtime.getState().messages).toBe(0); // The stored panel tab is faction.
    await runtime.refreshComm('all');
    expect(runtime.getState().messages).toBe(1);
    expect(JSON.parse(String(fetchText.mock.calls[1][1].body)) as unknown).toMatchObject({
      tab: 'all', minTimestampMs: 2000, plextContinuationGuid: 'new', ascendingTimestampOrder: true});
  });

  it('requests older history using the existing oldest timestamp and preserves deduplication', async () => {
    await runtime.refreshComm('all');
    fetchText.mockResolvedValueOnce(reply({result: [message(), message('old', 1000)]}));
    await runtime.refreshComm('all', true);
    expect(JSON.parse(String(fetchText.mock.calls[1][1].body)) as unknown).toMatchObject({
      maxTimestampMs: 2000, plextContinuationGuid: 'new'});
    expect(runtime.getState()).toMatchObject({messages: 2, requestOlder: true, oldMessagesWereAdded: true});
  });

  it('publishes background public updates and polls faction alongside an interested tracker', async () => {
    let interested = true;
    options.isPublicChannelInterested = (): boolean => interested;
    runtime = createCommRuntime(options);
    await runtime.refreshComm('all');
    fetchText.mockResolvedValue(reply({result: [message('later', 3000)]}));
    await vi.advanceTimersByTimeAsync(40_000);
    expect(runtime.getState()).toMatchObject({tab: 'all', messages: 2});
    expect(options.onPublicMessages).toHaveBeenCalledTimes(2);
    await runtime.refreshComm('faction');
    const before = fetchText.mock.calls.length;
    await vi.advanceTimersByTimeAsync(40_000);
    const tabs = fetchText.mock.calls.slice(before).map(([, init]) => (JSON.parse(String(init.body)) as {tab: string}).tab);
    expect(tabs.sort()).toEqual(['all', 'faction']);
    expect(runtime.getState().tab).toBe('faction');
    runtime.cancelActiveCommFetch();
    interested = false;
    runtime.scheduleRefresh();
    await vi.advanceTimersByTimeAsync(80_000);
    expect(fetchText.mock.calls.length).toBe(before + 2);
  });

  it('shares an in-flight public fetch and preserves an older-history request during a polling tick', async () => {
    options.isPublicChannelInterested = (): boolean => true;
    runtime = createCommRuntime(options);
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    runtime.scheduleRefresh(0);
    await vi.advanceTimersByTimeAsync(0);
    const foreground = runtime.refreshComm('all');
    expect(fetchText).toHaveBeenCalledOnce();
    finish(reply({result: [message()]}));
    await foreground;
    expect(runtime.getState().messages).toBe(1);
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const older = runtime.refreshComm('all', true);
    runtime.scheduleRefresh(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchText).toHaveBeenCalledTimes(2);
    finish(reply({result: [message('old', 1000)]}));
    await older;
    expect(runtime.getState()).toMatchObject({messages: 2, requestOlder: true, oldMessagesWereAdded: true});
  });

  it('drops late old-area responses, preserves alerts, and requests initial public/faction data in a new area', async () => {
    let bounds = {south: 51, west: 3, north: 53, east: 5};
    options.getMap = (): ReturnType<Options['getMap']> => ({getBounds: (): LatLngBounds => ({getSouth: () => bounds.south, getWest: () => bounds.west,
      getNorth: () => bounds.north, getEast: () => bounds.east}) as LatLngBounds});
    runtime = createCommRuntime(options);
    await runtime.refreshComm('faction');
    await runtime.refreshComm('alerts');
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const old = runtime.refreshComm('all');
    bounds = {south: 40, west: 1, north: 42, east: 3};
    runtime.mapMoved();
    finish(reply({result: [message('stale')]}));
    await old;
    expect(options.onPublicMessages).not.toHaveBeenCalled();
    await runtime.refreshComm('all');
    await runtime.refreshComm('faction');
    await runtime.refreshComm('alerts');
    const payloads = fetchText.mock.calls.slice(-3).map(([, init]) => JSON.parse(String(init.body)) as {minTimestampMs: number; plextContinuationGuid?: string});
    expect(payloads[0]).toMatchObject({minTimestampMs: -1});
    expect(payloads[0].plextContinuationGuid).toBeUndefined();
    expect(payloads[1]).toMatchObject({minTimestampMs: -1});
    expect(payloads[2]).toMatchObject({minTimestampMs: 2000});
  });

  it('stops hidden-panel polling while retaining tracker interest and cancels it when the tracker is disabled', async () => {
    let interested = true;
    options.isPublicChannelInterested = (): boolean => interested;
    runtime = createCommRuntime(options);
    await runtime.refreshComm('faction');
    runtime.setPanelVisibility(false);
    const before = fetchText.mock.calls.length;
    await vi.advanceTimersByTimeAsync(40_000);
    expect(fetchText.mock.calls.slice(before).map(([, init]) => (JSON.parse(String(init.body)) as {tab: string}).tab)).toEqual(['all']);
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    await vi.advanceTimersByTimeAsync(40_000);
    const signal = fetchText.mock.lastCall?.[1].signal;
    interested = false;
    runtime.scheduleRefresh();
    expect(signal?.aborted).toBe(true);
    finish(reply({result: [message('disabled')]}));
    await vi.advanceTimersByTimeAsync(40_000);
    expect(options.onPublicMessages).toHaveBeenCalledOnce();
  });

  it('keeps a late send from reactivating a closed panel or switching the current channel', async () => {
    await runtime.refreshComm('all');
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const sending = runtime.sendComm('all', 'hello');
    await runtime.refreshComm('faction');
    finish(reply({result: true}));
    await sending;
    expect(runtime.getState().tab).toBe('faction');
    runtime.setPanelVisibility(false);
    const before = fetchText.mock.calls.length;
    await vi.advanceTimersByTimeAsync(80_000);
    expect(fetchText).toHaveBeenCalledTimes(before);
  });

  it('stops during idle, auth and map disposal, and never applies a late old-map response', async () => {
    let idle = true;
    options.isIdle = (): boolean => idle;
    options.isPublicChannelInterested = (): boolean => true;
    runtime = createCommRuntime(options);
    runtime.scheduleRefresh(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchText).not.toHaveBeenCalled();
    idle = false;
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const pending = runtime.refreshComm('all');
    lifetime.abort();
    runtime.dispose();
    finish(reply({result: [message()]}));
    await pending;
    expect(options.onPublicMessages).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(80_000);
    expect(fetchText).toHaveBeenCalledOnce();
    lifetime = new AbortController();
    fetchText.mockResolvedValue(reply('<html>login'));
    fetchText.mockResolvedValueOnce({response: new Response('<html>login'), text: '<html>login'});
    await runtime.refreshComm('all');
    await vi.advanceTimersByTimeAsync(80_000);
    expect(fetchText).toHaveBeenCalledTimes(2);
  });

  it('ignores superseded responses and cancels panel fetching', async () => {
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const pending = runtime.refreshComm('all');
    await runtime.refreshComm('faction');
    expect(fetchText.mock.calls[0][1].signal?.aborted).toBe(true);
    finish(reply({result: [message('late')]}));
    await pending;
    expect(runtime.getState().tab).toBe('faction');
    expect(options.onPublicMessages).not.toHaveBeenCalled();
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const cancelled = runtime.refreshComm('alerts');
    runtime.cancelActiveCommFetch();
    finish(reply({result: []}));
    await cancelled;
    expect(fetchText.mock.calls[2][1].signal?.aborted).toBe(true);
    expect(runtime.getState().status).not.toBe('loading');
  });

  it('resets local history when map replacement changes the area', async () => {
    let currentMap = options.getMap();
    runtime = createCommRuntime({...options, getMap: () => currentMap});
    await runtime.refreshComm('all');
    currentMap = undefined;
    runtime.mapMoved();
    currentMap = {getBounds: (): LatLngBounds => ({getSouth: (): number => 50, getWest: (): number => 2,
      getNorth: (): number => 54, getEast: (): number => 6}) as LatLngBounds} as ReturnType<Options['getMap']>;
    lifetime.abort();
    lifetime = new AbortController();
    await runtime.refreshComm('all');
    expect(JSON.parse(String(fetchText.mock.calls[1][1].body)) as unknown).toMatchObject({minTimestampMs: -1, minLatE6: 50000000, maxLngE6: 6000000});
  });

  it('reports missing version and CSRF as authentication failures', async () => {
    params.CURRENT_VERSION = '';
    await runtime.refreshComm('all');
    expect(runtime.getState()).toMatchObject({status: 'auth', error: 'missing Intel version'});
    expect(fetchText).not.toHaveBeenCalled();
    params.CURRENT_VERSION = 'version';
    vi.stubGlobal('document', {cookie: '', querySelectorAll: () => []});
    await runtime.refreshComm('all');
    expect(runtime.getState()).toMatchObject({status: 'auth', error: 'getPlexts missing csrftoken'});
  });

  it('preserves HTML authentication and HTTP/server error classification', async () => {
    fetchText.mockResolvedValueOnce({response: new Response('<html>login'), text: '<html>login'})
      .mockResolvedValueOnce({response: new Response('broken', {status: 503}), text: 'broken'})
      .mockResolvedValueOnce(reply({error: 'server error'}));
    await runtime.refreshComm('all');
    expect(runtime.getState().status).toBe('auth');
    await runtime.refreshComm('all');
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'getPlexts HTTP 503'});
    await runtime.refreshComm('all');
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'server error'});
  });

  it('rejects empty and alerts sends before requesting', async () => {
    await runtime.sendComm('all', ' ');
    expect(runtime.getState().sendStatus).toBe('error');
    await runtime.sendComm('alerts', 'hello');
    expect(runtime.getState().sendError).toBe("can't send to alerts");
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('sends at the map center and refreshes the same channel after success', async () => {
    await runtime.sendComm('faction', ' hello ');
    expect(fetchText.mock.calls.map(([endpoint]) => endpoint)).toEqual(['sendPlext', 'getPlexts']);
    expect(JSON.parse(String(fetchText.mock.calls[0][1].body)) as unknown).toMatchObject({
      tab: 'faction', message: 'hello', latE6: 52000000, lngE6: 4000000});
    expect(fetchText.mock.calls[0][2]).toBe('comm-send-faction');
    expect(runtime.getState()).toMatchObject({status: 'ready', tab: 'faction'});
    const states = vi.mocked(window.postMessage).mock.calls.map(([value]) => (value as {comm: {sendStatus?: string}}).comm);
    expect(states).toContainEqual(expect.objectContaining({sendStatus: 'sent'}));
  });

  it('keeps sending independent of panel cancellation but guards late map disposal', async () => {
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const sending = runtime.sendComm('all', 'hello');
    runtime.cancelActiveCommFetch();
    expect(fetchText.mock.calls[0][1].signal?.aborted).toBe(false);
    lifetime.abort();
    finish(reply({result: true}));
    await sending;
    expect(fetchText).toHaveBeenCalledOnce();
    expect(runtime.getState().sendStatus).toBe('sending');
  });

  it('preserves send errors and does not refresh on failure', async () => {
    fetchText.mockResolvedValueOnce(reply({error: 'not allowed'}));
    await runtime.sendComm('all', 'hello');
    expect(runtime.getState()).toMatchObject({sendStatus: 'error', sendError: 'not allowed'});
    expect(fetchText).toHaveBeenCalledOnce();
  });
});
