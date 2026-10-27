import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createMapDiagnostics} from './map-diagnostics';
import {createIitcIrisMapLifetime, type IitcIrisMapLifetime} from './map-runtime-lifetime';
import {IITC_IRIS_MESSAGES, type IitcIrisInteractionUpdateTimingDiagnostics, type IitcIrisLayerUpdateTimingDiagnostics,
  type IitcIrisMessage, type IitcIrisRenderEntities} from '../messages';

type Options = Parameters<typeof createMapDiagnostics>[0];
const portals: IitcIrisRenderEntities['portals'] = [
  {guid: 'real', team: 'R', latE6: 52000000, lngE6: 4000000, level: 8, health: 75, isPlaceholder: false,
    ornaments: ['one', 'two'], artifacts: [{role: 'target', type: 'shard', ids: ['1']}]},
  {guid: 'placeholder', team: 'N', latE6: 52001000, lngE6: 4001000, isPlaceholder: true,
    artifacts: [{role: 'target', type: 'shard', ids: ['1']}]},
  {guid: 'outside', team: 'E', latE6: 54000000, lngE6: 4000000, isPlaceholder: false},
];

describe('Map diagnostic snapshots and lifetime', () => {
  let entities: IitcIrisRenderEntities | undefined;
  let options: Options;
  let runtime: ReturnType<typeof createMapDiagnostics>;
  let lifetime: IitcIrisMapLifetime | undefined;
  let frames: Map<number, FrameRequestCallback>;
  beforeEach(() => {
    frames = new Map();
    let frameId = 0;
    vi.stubGlobal('window', {postMessage: vi.fn(), clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {frames.set(++frameId, callback); return frameId;}),
      cancelAnimationFrame: vi.fn((id: number) => frames.delete(id))});
    lifetime = createIitcIrisMapLifetime({on: vi.fn(), off: vi.fn(), remove: vi.fn()}, vi.fn());
    entities = {generation: 3, portals, links: [
      {guid: 'one-end', team: 'R', oLatE6: 52000000, oLngE6: 4000000, dLatE6: 55000000, dLngE6: 5000000},
      {guid: 'crossing', team: 'R', oLatE6: 50000000, oLngE6: 4000000, dLatE6: 55000000, dLngE6: 4000000},
    ], fields: []};
    options = {getLifetime: (): ReturnType<Options['getLifetime']> => lifetime, getEntities: (): ReturnType<Options['getEntities']> => entities,
      getRequestSnapshot: vi.fn(() => ({plan: undefined, response: undefined, artifacts: {status: 'ready', portalCount: 2, types: ['shard']}})),
      getRenderDiagnostics: vi.fn(() => ({ornaments: {drawnMarkers: 2, hiddenMarkers: 0, types: {one: 1, two: 1}},
        mutation: null})),
      getRenderPolicy: (): ReturnType<Options['getRenderPolicy']> => ({artifacts: true, optionalOverlayMinZoom: 14, detailedPortals: true, activeHighlighter: 'none', levelFill: false, healthFill: false, ornaments: true, labels: false}),
      getPortalKeyCount: vi.fn(() => 2), setAuthRecoveryActive: vi.fn(),
      getPlayerTrackerDiagnostics: (): ReturnType<Options['getPlayerTrackerDiagnostics']> => ({enabled: false, visible: false, players: 0, events: 0, markers: 0, traces: 0, latestCommTime: null, minZoom: 9, maxAgeMs: 0}),
      getHighlighterSettings: (): ReturnType<Options['getHighlighterSettings']> => ({active: 'none'}), getBaseLayerId: (): ReturnType<Options['getBaseLayerId']> => 'osm', getDataSource: (): ReturnType<Options['getDataSource']> => ({mode: 'live'}),
      getSelectedPortal: (): ReturnType<Options['getSelectedPortal']> => null, getPortalDetails: (): ReturnType<Options['getPortalDetails']> => ({status: 'idle'}),
      getCommState: (): ReturnType<Options['getCommState']> => ({status: 'idle', tab: 'all', messages: 0})};
    runtime = createMapDiagnostics(options);
  });
  afterEach(() => {vi.restoreAllMocks(); vi.unstubAllGlobals();});
  function messages(): IitcIrisMessage[] {return vi.mocked(window.postMessage).mock.calls.map(call => call[0] as IitcIrisMessage);}
  function last(): IitcIrisMessage {
    const message = messages().at(-1);
    if (!message) throw new Error('Expected a published message');
    return message;
  }
  function frame(): void {
    const entry = frames.entries().next().value;
    if (!entry) throw new Error('Expected a scheduled frame');
    frames.delete(entry[0]);
    entry[1](performance.now());
  }
  function status(): void {
    runtime.postEntityStatus('ready', entities, {requestedTiles: 2, returnedTiles: 2, nonEmptyTiles: 1,
      viewportBounds: {south: 51, north: 53, west: 3, east: 5}, emptyTileKeys: [], nonEmptyTileKeys: ['a'],
      unaccountedTileKeys: [], retriedTileKeys: ['a', 'a'], staleGenerationCacheWarmTileKeys: ['old']});
  }

  it('balances overlapping request counts, retains IDs and ignores repeated completion', () => {
    vi.spyOn(performance, 'now').mockReturnValue(10);
    const finishOne = runtime.beginIitcRequest('getInventory', 'inventory');
    const finishTwo = runtime.beginIitcRequest('getInventory');
    expect(runtime.getIitcRequestDiagnostics()).toMatchObject({activeRequests: 2, activeByEndpoint: {getInventory: 2},
      active: [{id: 1, endpoint: 'getInventory', group: 'inventory', elapsedMs: 0}, {id: 2, endpoint: 'getInventory'}]});
    vi.mocked(performance.now).mockReturnValue(35);
    finishOne();
    expect(last()).toMatchObject({type: IITC_IRIS_MESSAGES.requestStatus, requestDiagnostics: {activeRequests: 1, active: [{id: 2, elapsedMs: 25}]}});
    const count = messages().length;
    finishOne();
    expect(messages()).toHaveLength(count);
    finishTwo();
    expect(runtime.getIitcRequestDiagnostics().activeRequests).toBe(0);
    runtime.beginIitcRequest('next');
    expect(runtime.getIitcRequestDiagnostics().active[0].id).toBe(3);
  });

  it('preserves viewport endpoint counts, placeholder/artifact accounting and auth callback before publication', () => {
    const order: string[] = [];
    vi.mocked(options.setAuthRecoveryActive).mockImplementation(() => {order.push('auth');});
    vi.mocked(window.postMessage).mockImplementation(() => {order.push('post');});
    status();
    expect(order).toEqual(['auth', 'post']);
    expect(last()).toMatchObject({status: 'ready', portals: 3, realPortals: 2, placeholderPortals: 1,
      viewportPortals: 2, viewportRealPortals: 1, viewportPlaceholderPortals: 1, viewportLinks: 1,
      viewportOrnamentPortals: 1, viewportOrnamentMarkers: 2, viewportArtifactPortals: 2, viewportArtifactMarkers: 2,
      artifactPortals: 2, drawnArtifactMarkers: 1, artifactTypes: {'target:shard': 2},
      retriedTileKeys: ['a'], highlighterSettings: {active: 'none'}, baseLayerId: 'osm'});
    runtime.postEntityStatus('getEntities returned login html HTTP 200');
    expect(options.setAuthRecoveryActive).toHaveBeenLastCalledWith(true);
    expect(last()).toMatchObject({authRequired: true, viewportPortals: 0, requestedTiles: 0});
    status();
    expect(options.setAuthRecoveryActive).toHaveBeenLastCalledWith(false);
  });

  it('deduplicates stale-cache keys and waits for entities before reposting retained snapshots', () => {
    runtime.recordStaleGenerationCacheWarmTileKeys(['ignored']);
    runtime.repostLatestEntityStatus();
    expect(messages()).toHaveLength(0);
    status();
    const saved = entities;
    entities = undefined;
    runtime.recordStaleGenerationCacheWarmTileKeys(['new', 'new']);
    runtime.repostLatestEntityStatus();
    expect(messages()).toHaveLength(1);
    entities = saved;
    runtime.repostLatestEntityStatus();
    expect(last()).toMatchObject({status: 'ready', staleGenerationCacheWarmTileKeys: ['old', 'new']});
  });

  it('retains only ten interactions and mirrors both frame timings before the deferred status repost', () => {
    status();
    for (let i = 0; i < 12; i++) runtime.recordInteractionUpdateDiagnostics({kind: 'highlighter', at: i});
    const update: IitcIrisInteractionUpdateTimingDiagnostics = {kind: 'layer', at: 12};
    const mirror: IitcIrisLayerUpdateTimingDiagnostics = {changedKeys: ['portals']};
    runtime.recordInteractionUpdateDiagnostics(update);
    runtime.recordLayerUpdateTiming(mirror);
    runtime.scheduleInteractionFrameDiagnostics(update, 10, 5, mirror);
    vi.spyOn(performance, 'now').mockReturnValue(20);
    frame();
    expect(messages()).toHaveLength(1);
    expect(mirror).toMatchObject({firstAnimationFrameMs: 10, sentToFirstAnimationFrameMs: 15});
    vi.mocked(performance.now).mockReturnValue(30);
    frame();
    expect(messages()).toHaveLength(2);
    expect(last().timing?.interactionUpdates?.map(value => value.at)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(last().timing?.layerUpdate).toMatchObject({firstAnimationFrameMs: 10, secondAnimationFrameMs: 20,
      sentToSecondAnimationFrameMs: 25});
    expect(update.secondAnimationFrameMs).toBe(20);
  });

  it('map disposal cancels pending frames while retained snapshots survive for the replacement', () => {
    status();
    runtime.scheduleInteractionFrameDiagnostics({kind: 'layer', at: 1}, 0);
    expect(frames.size).toBe(1);
    lifetime?.dispose();
    lifetime = undefined;
    expect(frames.size).toBe(0);
    runtime.scheduleInteractionFrameDiagnostics({kind: 'layer', at: 2}, 0);
    expect(frames.size).toBe(0);
    runtime.repostLatestEntityStatus();
    expect(last().status).toBe('ready');
  });
});
