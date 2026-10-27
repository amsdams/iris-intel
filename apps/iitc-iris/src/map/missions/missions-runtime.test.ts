import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {createMissionsRuntime} from './missions-runtime';
import type {IitcIrisMissionDetails, IitcIrisRequestDiagnostics} from '../../messages';

type Options = Parameters<typeof createMissionsRuntime>[0];
const detailsKey = 'iitc-iris:missions:details-cache';
const portalKey = 'iitc-iris:missions:portal-cache';
const detail: IitcIrisMissionDetails = {guid: 'one', title: 'Mission 1', description: '', authorNickname: 'Agent', waypoints: []};
const rows = {result: [['ten', 'Mission 10'], ['one', 'Mission 1']]};

function pending(): {promise: Promise<unknown>; resolve: (value: unknown) => void} {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(done => {resolve = done;});
  return {promise, resolve};
}

describe('Missions request and cache ownership', () => {
  let storage: Map<string, string>;
  let options: Options;
  let postIntelEndpoint: ReturnType<typeof vi.fn<Options['postIntelEndpoint']>>;
  let portal: {guid?: string; title?: string};

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('window', {localStorage: {getItem: (key: string): string | undefined => storage.get(key),
      setItem: (key: string, value: string): void => {storage.set(key, value);}}, postMessage: vi.fn()});
    portal = {guid: 'portal', title: 'Portal'};
    postIntelEndpoint = vi.fn<Options['postIntelEndpoint']>().mockResolvedValue(rows);
    options = {getMap: (): ReturnType<Options['getMap']> => ({getBounds: () => ({getNorth: () => 53, getSouth: () => 52,
      getWest: () => 4, getEast: () => 5}) as ReturnType<LeafletMap['getBounds']>}),
    getSelectedPortal: (): ReturnType<Options['getSelectedPortal']> => portal, postIntelEndpoint,
    getIitcRequestDiagnostics: (): IitcIrisRequestDiagnostics => ({}) as IitcIrisRequestDiagnostics,
    clearMissionOverlay: vi.fn(), renderMissionOverlay: vi.fn(), panToMissionStart: vi.fn()};
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses current bounds/selection, sorts numerically, and reuses the portal cache', async () => {
    const runtime = createMissionsRuntime(options);
    await runtime.refreshMissions();
    expect(postIntelEndpoint).toHaveBeenCalledWith('getTopMissionsInBounds',
      {northE6: 53000000, southE6: 52000000, westE6: 4000000, eastE6: 5000000}, expect.any(AbortSignal));
    expect(runtime.getState().missions.map(mission => mission.guid)).toEqual(['one', 'ten']);
    portal = {guid: 'replacement', title: 'Replacement'};
    await runtime.refreshMissions('portal');
    expect(postIntelEndpoint).toHaveBeenLastCalledWith('getTopMissionsForPortal', {guid: 'replacement'}, expect.any(AbortSignal));
    await runtime.refreshMissions('portal');
    expect(postIntelEndpoint).toHaveBeenCalledTimes(2);
    expect(runtime.getState()).toMatchObject({cached: true, portalGuid: 'replacement', portalTitle: 'Replacement'});
    expect(JSON.parse(storage.get(portalKey) ?? '{}')).toHaveProperty('replacement');
  });

  it('loads cached details, enriches summaries and automatically selects a single portal mission', async () => {
    storage.set(portalKey, JSON.stringify({portal: {time: Date.now(), data: [{guid: 'one', title: 'Mission 1'}]}}));
    storage.set(detailsKey, JSON.stringify({one: {time: Date.now(), data: detail}}));
    const runtime = createMissionsRuntime(options);
    await runtime.refreshMissions('portal');
    expect(postIntelEndpoint).not.toHaveBeenCalled();
    expect(runtime.getState()).toMatchObject({cached: true, detailsCached: true, selectedMission: detail,
      missions: [{authorNickname: 'Agent', waypointCount: 0}]});
    expect(options.renderMissionOverlay).toHaveBeenCalledWith(detail);
    expect(options.panToMissionStart).toHaveBeenCalledWith(detail);
  });

  it('ignores late list responses after replacement or cancellation', async () => {
    const old = pending();
    postIntelEndpoint.mockReturnValueOnce(old.promise);
    const runtime = createMissionsRuntime(options);
    const first = runtime.refreshMissions();
    await runtime.refreshMissions();
    expect(postIntelEndpoint.mock.calls[0][2]?.aborted).toBe(true);
    old.resolve({result: [['old', 'Old mission']]});
    await first;
    expect(runtime.getState().missions.map(mission => mission.guid)).toEqual(['one', 'ten']);
    const disposed = pending();
    postIntelEndpoint.mockReturnValueOnce(disposed.promise);
    const third = runtime.refreshMissions();
    runtime.cancelRequests();
    disposed.resolve({result: [['late', 'Late mission']]});
    await third;
    expect(runtime.getState().status).toBe('loading');
    expect(storage.get(portalKey)).toBe('{}');
  });

  it('aborts superseded detail requests without replacing the cached selection or overlay', async () => {
    storage.set(detailsKey, JSON.stringify({one: {time: Date.now(), data: detail}}));
    const old = pending();
    postIntelEndpoint.mockReturnValueOnce(old.promise);
    const runtime = createMissionsRuntime(options);
    const first = runtime.refreshMissionDetails('old');
    await runtime.refreshMissionDetails('one');
    old.resolve({result: ['old', 'Old', '', '', 'RESISTANCE', 0, 0, 0, 1, []]});
    await first;
    expect(postIntelEndpoint.mock.calls[0][2]?.aborted).toBe(true);
    expect(runtime.getState().selectedMission).toEqual(detail);
    expect(options.renderMissionOverlay).toHaveBeenCalledExactlyOnceWith(detail);
  });

  it('prunes expired caches at their age boundary and fetches fresh details into storage', async () => {
    storage.set(detailsKey, JSON.stringify({one: {time: Date.now() - 3 * 86400000, data: detail}}));
    storage.set(portalKey, JSON.stringify({portal: {time: Date.now() - 21 * 86400000, data: []}}));
    postIntelEndpoint.mockResolvedValue({result: ['one', 'Mission 1', '', 'Agent', 'RESISTANCE', 900000, 60000, 1, 1, []]});
    const runtime = createMissionsRuntime(options);
    expect(storage.get(detailsKey)).toBe('{}');
    expect(storage.get(portalKey)).toBe('{}');
    await runtime.refreshMissionDetails('one');
    expect(runtime.getState()).toMatchObject({detailsStatus: 'ready', detailsCached: false,
      selectedMission: {guid: 'one', authorTeam: 'R', ratingPercent: 90}});
    await runtime.refreshMissionDetails('one');
    expect(postIntelEndpoint).toHaveBeenCalledOnce();
    expect(runtime.getState().detailsCached).toBe(true);
    expect(JSON.parse(storage.get(detailsKey) ?? '{}') as unknown).toMatchObject({one: {data: {guid: 'one'}}});
  });

  it('keeps live display working when storage is corrupt or inaccessible', async () => {
    window.localStorage.getItem = (): never => {throw new Error('blocked');};
    window.localStorage.setItem = (): never => {throw new Error('quota');};
    const runtime = createMissionsRuntime(options);
    await runtime.refreshMissions('portal');
    await runtime.refreshMissions('portal');
    expect(postIntelEndpoint).toHaveBeenCalledOnce();
    expect(runtime.getState()).toMatchObject({status: 'ready', cached: true});
  });

  it('reports missing selection and authentication through the existing state contract', async () => {
    portal = {};
    const runtime = createMissionsRuntime(options);
    await runtime.refreshMissions('portal');
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'select a portal first'});
    expect(postIntelEndpoint).not.toHaveBeenCalled();
    postIntelEndpoint.mockRejectedValue(new Error('missing Intel version'));
    await runtime.refreshMissions();
    expect(runtime.getState()).toMatchObject({status: 'auth', requestState: 'auth', error: 'missing Intel version'});
    await runtime.refreshMissionDetails('one');
    expect(runtime.getState().detailsStatus).toBe('auth');
    expect(options.renderMissionOverlay).toHaveBeenLastCalledWith(undefined);
  });
});
