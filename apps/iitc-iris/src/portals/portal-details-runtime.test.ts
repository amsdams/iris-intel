import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPortalDetailsRuntime} from './portal-details-runtime';
import type {IitcIrisSelectedPortal} from '../messages';

type Options = Parameters<typeof createPortalDetailsRuntime>[0];
function details(title = 'Detailed portal'): unknown {
  return {result: ['p', 'R', 52000000, 4000000, 8, 100, 8, 'portal.jpg', title, [], false, false, null,
    1717027200000, [], [], 'Owner', null, 3]};
}
function reply(body: unknown): {response: Response; text: string} {
  return {response: Response.json(body), text: JSON.stringify(body)};
}

describe('portal details request ownership', () => {
  let options: Options;
  let selectedGuid: string | undefined;
  let version: {CURRENT_VERSION: string};
  let fetchText: ReturnType<typeof vi.fn<Options['fetchIitcEndpointText']>>;
  let runtime: ReturnType<typeof createPortalDetailsRuntime>;
  beforeEach(() => {
    selectedGuid = 'portal';
    version = {CURRENT_VERSION: 'version'};
    vi.stubGlobal('window', {niantic_params: version});
    vi.stubGlobal('document', {cookie: 'csrftoken=token', querySelectorAll: () => []});
    fetchText = vi.fn<Options['fetchIitcEndpointText']>().mockResolvedValue(reply(details()));
    options = {getSelectedPortalGuid: (): string | undefined => selectedGuid,
      getSelectedPortal: (): IitcIrisSelectedPortal => ({links: {count: 6}}) as IitcIrisSelectedPortal,
      portalHistoryByGuid: new Map(), fetchIitcEndpointText: fetchText,
      repostLatestEntityStatus: vi.fn(), onDetailsLoaded: vi.fn()};
    runtime = createPortalDetailsRuntime(options);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps request metadata and publishes history before promoting the detailed entity', async () => {
    const observations: string[] = [];
    options = {...options, repostLatestEntityStatus: (): void => {observations.push(runtime.getState()?.status ?? 'null');},
      onDetailsLoaded: (_details, state): void => {
        expect(runtime.getState()).toBe(state);
        expect(options.portalHistoryByGuid.get('portal')).toEqual({visited: true, captured: true, scoutControlled: false});
        observations.push('promoted');
      }};
    runtime = createPortalDetailsRuntime(options);
    await runtime.refreshSelectedPortalDetails('portal');
    const [endpoint, init, group] = fetchText.mock.calls[0];
    expect([endpoint, group, init.method, init.credentials]).toEqual(['getPortalDetails', 'portal-details', 'POST', 'include']);
    expect(init.headers).toMatchObject({'X-CSRFToken': 'token'});
    expect(JSON.parse(String(init.body)) as unknown).toEqual({guid: 'portal', v: 'version'});
    expect(observations).toEqual(['loading', 'promoted', 'ready']);
    expect(runtime.getState()).toMatchObject({status: 'ready', guid: 'portal', owner: 'Owner'});
  });

  it('shows cached details immediately but still requests fresh details after cancellation and state clearing', async () => {
    await runtime.refreshSelectedPortalDetails('portal');
    runtime.clearState();
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const pending = runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()).toMatchObject({status: 'ready', cached: true, owner: 'Owner'});
    expect(fetchText).toHaveBeenCalledTimes(2);
    runtime.cancelActivePortalDetailsFetch();
    finish(reply(details('late')));
    await pending;
    expect(fetchText.mock.calls[1][1].signal?.aborted).toBe(true);
    expect(options.onDetailsLoaded).toHaveBeenCalledOnce();
    expect(runtime.getState()?.cached).toBe(true);
  });

  it('does not promote late results after another portal is selected', async () => {
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const old = runtime.refreshSelectedPortalDetails('portal');
    selectedGuid = 'other';
    await runtime.refreshSelectedPortalDetails('other');
    finish(reply(details('old')));
    await old;
    expect(fetchText.mock.calls[0][1].signal?.aborted).toBe(true);
    expect(runtime.getState()?.guid).toBe('other');
    expect(options.onDetailsLoaded).toHaveBeenCalledOnce();
    expect(options.portalHistoryByGuid.has('portal')).toBe(false);
  });

  it('rejects a successful response when selection changed without starting a new fetch', async () => {
    let finish!: (value: Awaited<ReturnType<Options['fetchIitcEndpointText']>>) => void;
    fetchText.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const pending = runtime.refreshSelectedPortalDetails('portal');
    selectedGuid = undefined;
    finish(reply(details()));
    await pending;
    expect(options.onDetailsLoaded).not.toHaveBeenCalled();
    expect(options.portalHistoryByGuid.size).toBe(0);
  });

  it('retains the existing twelve-entry cache limit', async () => {
    for (let index = 0; index < 13; index += 1) {
      selectedGuid = `portal-${index}`;
      await runtime.refreshSelectedPortalDetails(selectedGuid);
    }
    selectedGuid = 'portal-1';
    const cached = runtime.refreshSelectedPortalDetails(selectedGuid);
    expect(runtime.getState()?.cached).toBe(true);
    await cached;
    selectedGuid = 'portal-0';
    const evicted = runtime.refreshSelectedPortalDetails(selectedGuid);
    expect(runtime.getState()).toMatchObject({status: 'loading', guid: 'portal-0'});
    await evicted;
  });

  it('keeps missing-version, missing-CSRF and HTML authentication feedback', async () => {
    version.CURRENT_VERSION = '';
    await runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()).toMatchObject({status: 'auth', error: 'missing Intel version'});
    expect(fetchText).not.toHaveBeenCalled();
    version.CURRENT_VERSION = 'version';
    vi.stubGlobal('document', {cookie: '', querySelectorAll: () => []});
    await runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()?.status).toBe('auth');
    vi.stubGlobal('document', {cookie: 'csrftoken=token', querySelectorAll: () => []});
    fetchText.mockResolvedValueOnce({response: new Response('<html>'), text: '<html>'});
    await runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()).toMatchObject({status: 'auth', error: 'getPortalDetails returned login html HTTP 200'});
  });

  it('reports server, malformed and empty detail responses without promoting entities', async () => {
    fetchText.mockResolvedValueOnce(reply({error: 'server error'}))
      .mockResolvedValueOnce({response: new Response('broken'), text: 'broken'})
      .mockResolvedValueOnce(reply({result: null}));
    await runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'server error'});
    await runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()?.status).toBe('error');
    await runtime.refreshSelectedPortalDetails('portal');
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'empty portal details'});
    expect(options.onDetailsLoaded).not.toHaveBeenCalled();
  });
});
