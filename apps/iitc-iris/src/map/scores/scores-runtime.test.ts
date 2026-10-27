import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createScoresRuntime} from './scores-runtime';
import type {IitcIrisRequestDiagnostics} from '../../messages';

type Options = Parameters<typeof createScoresRuntime>[0];
const game = {result: ['300', '100']};
const region = {result: {regionName: 'Fixture region', gameScore: ['30', '10'],
  scoreHistory: [['1', 1, 2], ['3', 3, 4]], topAgents: [{nick: 'Agent', team: 'RESISTANCE'}]}};

function pending(): {promise: Promise<unknown>; resolve: (value: unknown) => void} {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(done => {resolve = done;});
  return {promise, resolve};
}

describe('Scores runtime requests', () => {
  let center: ReturnType<Options['getMapCenterE6']>;
  let post: ReturnType<typeof vi.fn<Options['postIntelEndpoint']>>;
  let runtime: ReturnType<typeof createScoresRuntime>;
  beforeEach(() => {
    vi.stubGlobal('window', {postMessage: vi.fn()});
    center = {latE6: 52000000, lngE6: 4000000};
    post = vi.fn<Options['postIntelEndpoint']>().mockImplementation(async endpoint => endpoint === 'getGameScore' ? game : region);
    runtime = createScoresRuntime({getMapCenterE6: () => center, postIntelEndpoint: post,
      getIitcRequestDiagnostics: () => ({}) as IitcIrisRequestDiagnostics});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts both score requests together and retains numeric/team/checkpoint conversion', async () => {
    const first = pending();
    post.mockImplementation(endpoint => endpoint === 'getGameScore' ? first.promise : Promise.resolve(region));
    const refresh = runtime.refreshScores();
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][2]).toBe(post.mock.calls[1][2]);
    expect(runtime.getState().status).toBe('loading');
    first.resolve(game);
    await refresh;
    expect(runtime.getState()).toMatchObject({status: 'ready', game: {enlightened: 300, resistance: 100,
      enlightenedPercent: 75, resistancePercent: 25}, region: {status: 'ready', name: 'Fixture region',
      enlightenedAvg: 30, resistanceAvg: 10, checkpoints: 2, lastCheckpoint: 3, topAgentList: [{nick: 'Agent', team: 'R'}]}});
    center = {latE6: 53000000, lngE6: 5000000};
    await runtime.refreshScores();
    expect(post).toHaveBeenLastCalledWith('getRegionScoreDetails', center, expect.any(AbortSignal));
  });

  it('rejects a missing center before requesting and reports empty responses', async () => {
    center = undefined;
    await runtime.refreshScores();
    expect(post).not.toHaveBeenCalled();
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'missing map center'});
    center = {latE6: 0, lngE6: 0};
    post.mockResolvedValue({result: false});
    await runtime.refreshScores();
    expect(runtime.getState()).toMatchObject({status: 'empty', requestState: 'ready', region: {status: 'empty', center}});
  });

  it('ignores a superseded pair of responses without overwriting the current scores', async () => {
    const old = pending();
    post.mockReturnValueOnce(old.promise).mockReturnValueOnce(old.promise);
    const first = runtime.refreshScores();
    await runtime.refreshScores();
    old.resolve({result: false});
    await first;
    expect(post.mock.calls[0][2]?.aborted).toBe(true);
    expect(runtime.getState()).toMatchObject({status: 'ready', region: {name: 'Fixture region'}});
  });

  it('cancels both endpoints and ignores late completion after panel closure', async () => {
    const request = pending();
    post.mockReturnValue(request.promise);
    const refresh = runtime.refreshScores();
    runtime.cancelActiveScoresFetch();
    expect(post.mock.calls.every(call => call[2]?.aborted)).toBe(true);
    request.resolve(game);
    await refresh;
    expect(runtime.getState().status).toBe('loading');
    expect(window.postMessage).toHaveBeenCalledOnce();
  });

  it('keeps auth and ordinary request errors in both score status blocks', async () => {
    post.mockRejectedValue(new Error('getGameScore missing Intel version'));
    await runtime.refreshScores();
    expect(runtime.getState()).toMatchObject({status: 'auth', requestState: 'auth', region: {status: 'auth'}});
    post.mockRejectedValue(new Error('offline'));
    await runtime.refreshScores();
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'offline', region: {status: 'error', error: 'offline'}});
  });
});
