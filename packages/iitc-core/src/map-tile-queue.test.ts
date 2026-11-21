import {describe, expect, it} from 'vitest';
import {
  classifyIitcTileRequestResponse,
  applyIitcTileRequestResponseToQueue,
  createIitcTileQueueState,
  createIitcTileQueueDiagnostics,
  createIitcTileQueueRequestBatches,
  createIitcEmptyTileRetryBatches,
  createIitcLiveCompatRequestBatches,
  createIitcRequestBatches,
  getIitcRequestQueueDelayMs,
  getIitcTileQueueRefillDecision,
  markIitcTileQueueComplete,
  markIitcTileQueueStale,
  markIitcTileRequestStarted,
} from './index';

describe('map tile queue', () => {
  it('matches IITC request bucket sizing', () => {
    const tileKeys = Array.from({length: 80}, (_, index) => `15_${index}_0_1_8_100`);
    const batches = createIitcRequestBatches(tileKeys);

    expect(batches).toHaveLength(5);
    expect(batches.map((batch) => batch.length)).toEqual([16, 16, 16, 16, 16]);
  });

  it('shrinks retry-heavy request buckets like IITC without dropping the first tile', () => {
    const tileKeys = ['retry-a', 'fresh-a', 'fresh-b', 'fresh-c', 'fresh-d', 'fresh-e'];

    expect(createIitcRequestBatches(tileKeys, {
      maxRequests: 2,
      tilesPerRequest: 25,
      maxTileRetries: 5,
      tileErrorCount: {'retry-a': 6},
    })).toEqual([
      ['retry-a'],
      ['fresh-a', 'fresh-b', 'fresh-c', 'fresh-d', 'fresh-e'],
    ]);

    expect(createIitcRequestBatches(tileKeys, {
      maxRequests: 2,
      tilesPerRequest: 25,
      maxTileRetries: 5,
      tileErrorCount: {'retry-a': 3, 'fresh-a': 3},
    })).toEqual([
      ['retry-a'],
      ['fresh-a', 'fresh-b', 'fresh-c', 'fresh-d', 'fresh-e'],
    ]);
  });

  it('creates live-compatible sequential request and empty-tile retry batches', () => {
    const tileKeys = Array.from({length: 12}, (_, index) => `15_${index}_0_1_8_100`);

    expect(createIitcLiveCompatRequestBatches(tileKeys).map((batch) => batch.length)).toEqual([5, 5, 2]);
    expect(createIitcEmptyTileRetryBatches(tileKeys, {retryLimit: 7}).map((batch) => batch.length)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('maps request response bucket reasons to IITC queue delays', () => {
    expect(getIitcRequestQueueDelayMs('normal')).toBe(0);
    expect(getIitcRequestQueueDelayMs('server-retry')).toBe(0);
    expect(getIitcRequestQueueDelayMs('timeout')).toBe(0);
    expect(getIitcRequestQueueDelayMs('error')).toBe(5_000);
    expect(getIitcRequestQueueDelayMs('unaccounted')).toBe(5_000);
  });

  it('decides whether the IITC queue can refill open request slots', () => {
    expect(getIitcTileQueueRefillDecision({
      nowMs: 1_000,
      nextRefillAtMs: 1_000,
      inFlightRequests: 0,
    })).toEqual({shouldRefill: true, waitMs: 0});

    expect(getIitcTileQueueRefillDecision({
      nowMs: 1_000,
      nextRefillAtMs: 6_000,
      inFlightRequests: 2,
    })).toEqual({shouldRefill: false, waitMs: 0});

    expect(getIitcTileQueueRefillDecision({
      nowMs: 1_000,
      nextRefillAtMs: 6_000,
      inFlightRequests: 0,
    })).toEqual({shouldRefill: false, waitMs: 5_000});
  });

  it('applies IITC refill waits from timeout, hard error, and unaccounted responses', () => {
    const timeout = classifyIitcTileRequestResponse({
      result: {map: {timeout: {error: 'TIMEOUT'}}},
    }, ['timeout']);
    const hardError = classifyIitcTileRequestResponse({
      result: {map: {fail: {error: 'ERROR'}}},
    }, ['fail']);
    const unaccounted = classifyIitcTileRequestResponse({
      result: {map: {}},
    }, ['missing']);

    expect(getIitcTileQueueRefillDecision({
      nowMs: 2_000,
      nextRefillAtMs: 2_000 + getIitcRequestQueueDelayMs(timeout.queueDelayReason),
      inFlightRequests: 0,
    })).toEqual({shouldRefill: true, waitMs: 0});
    expect(getIitcTileQueueRefillDecision({
      nowMs: 2_000,
      nextRefillAtMs: 2_000 + getIitcRequestQueueDelayMs(hardError.queueDelayReason),
      inFlightRequests: 0,
    })).toEqual({shouldRefill: false, waitMs: 5_000});
    expect(getIitcTileQueueRefillDecision({
      nowMs: 2_000,
      nextRefillAtMs: 2_000 + getIitcRequestQueueDelayMs(unaccounted.queueDelayReason),
      inFlightRequests: 0,
    })).toEqual({shouldRefill: false, waitMs: 5_000});
  });

  it('tracks IITC tile queue success and timeout requeue state', () => {
    const started = markIitcTileRequestStarted(createIitcTileQueueState(['ok', 'timeout', 'later']), ['ok', 'timeout']);
    const {state, classification} = applyIitcTileRequestResponseToQueue(started, {
      result: {
        map: {
          ok: {gameEntities: [['ok.1', 1, ['p', 'E', 1, 2]]]},
          timeout: {error: 'TIMEOUT'},
        },
      },
    }, ['ok', 'timeout']);

    expect(classification.timeoutTileKeys).toEqual(['timeout']);
    expect(state.activeRequestCount).toBe(0);
    expect(state.requestedTileKeys).toEqual([]);
    expect(state.successTileKeys).toEqual(['ok']);
    expect(state.queuedTileKeys).toEqual(['later', 'timeout']);
    expect(state.tileErrorCount.timeout).toBe(1);
  });

  it('ignores successful response tiles that are no longer wanted like IITC', () => {
    const started = markIitcTileRequestStarted(createIitcTileQueueState(['wanted', 'old']), ['wanted', 'old']);
    const current = {
      ...started,
      queuedTileKeys: ['wanted'],
    };
    const {state, classification} = applyIitcTileRequestResponseToQueue(current, {
      result: {
        map: {
          wanted: {gameEntities: [['wanted.1', 1, ['p', 'E', 1, 2]]]},
          old: {gameEntities: [['old.1', 1, ['p', 'R', 3, 4]]]},
        },
      },
    }, ['wanted', 'old']);

    expect(classification.successTileKeys).toEqual(['wanted', 'old']);
    expect(state.successTileKeys).toEqual(['wanted']);
    expect(state.queuedTileKeys).toEqual([]);
  });

  it('can apply an old wanted response without decrementing the current active request count', () => {
    const current = {
      ...markIitcTileRequestStarted(createIitcTileQueueState(['wanted', 'later']), ['later']),
      requestedTileKeys: ['wanted', 'later'],
    };
    const {state} = applyIitcTileRequestResponseToQueue(current, {
      result: {
        map: {
          wanted: {gameEntities: [['wanted.1', 1, ['p', 'E', 1, 2]]]},
        },
      },
    }, ['wanted'], true, {countActiveRequest: false});

    expect(current.activeRequestCount).toBe(1);
    expect(state.activeRequestCount).toBe(1);
    expect(state.requestedTileKeys).toEqual(['later']);
    expect(state.successTileKeys).toEqual(['wanted']);
    expect(state.queuedTileKeys).toEqual(['later']);
  });

  it('creates request batches from queued tiles while excluding active requests', () => {
    const state = markIitcTileRequestStarted(createIitcTileQueueState(['a', 'b', 'c', 'd', 'e', 'f']), ['b']);

    expect(createIitcTileQueueRequestBatches(state, {
      maxRequests: 1,
      tilesPerRequest: 3,
      activeRequestCount: 0,
    })).toEqual([['a', 'c', 'd']]);
    expect(createIitcTileQueueRequestBatches(state, {
      maxRequests: 1,
      tilesPerRequest: 5,
      activeRequestCount: 0,
      pendingTileKeys: ['c', 'f'],
    })).toEqual([['c', 'f']]);
  });

  it('refills open request slots as IITC responses complete', () => {
    let state = createIitcTileQueueState(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const firstBatches = createIitcTileQueueRequestBatches(state, {
      maxRequests: 2,
      tilesPerRequest: 3,
    });
    expect(firstBatches).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);

    for (const batch of firstBatches) state = markIitcTileRequestStarted(state, batch);
    expect(state.activeRequestCount).toBe(2);
    expect(createIitcTileQueueRequestBatches(state, {
      maxRequests: 2,
      tilesPerRequest: 3,
    })).toEqual([]);

    state = applyIitcTileRequestResponseToQueue(state, {
      result: {
        map: {
          a: {gameEntities: []},
          b: {gameEntities: []},
          c: {gameEntities: []},
        },
      },
    }, ['a', 'b', 'c']).state;

    expect(state.activeRequestCount).toBe(1);
    expect(createIitcTileQueueRequestBatches(state, {
      maxRequests: 2,
      tilesPerRequest: 3,
    })).toEqual([['g']]);
  });

  it('marks an obsolete queue as stale and inactive', () => {
    const state = markIitcTileRequestStarted(createIitcTileQueueState(['a', 'b', 'c']), ['b']);
    const staleState = markIitcTileQueueStale(state);

    expect(staleState.queuedTileKeys).toEqual([]);
    expect(staleState.requestedTileKeys).toEqual([]);
    expect(staleState.staleTileKeys).toEqual(['a', 'b', 'c']);
    expect(staleState.activeRequestCount).toBe(0);
  });

  it('marks unresolved queue tiles failed when request processing is complete', () => {
    const state = markIitcTileRequestStarted(createIitcTileQueueState(['a', 'b', 'c']), ['b']);
    const completeState = markIitcTileQueueComplete(state);

    expect(completeState.queuedTileKeys).toEqual([]);
    expect(completeState.requestedTileKeys).toEqual([]);
    expect(completeState.failedTileKeys).toEqual(['a', 'b', 'c']);
    expect(completeState.activeRequestCount).toBe(0);
    expect(createIitcTileQueueDiagnostics(completeState, ['a'])).toEqual({
      queuedTiles: 0,
      requestedTiles: 0,
      successTiles: 0,
      failedTiles: 2,
      partialTiles: 1,
      staleTiles: 0,
      activeRequests: 0,
      tileErrorCount: {},
    });
  });

  it('can keep returned-empty summary tiles queued for live-compatible recovery', () => {
    const started = markIitcTileRequestStarted(createIitcTileQueueState(['empty', 'ok']), ['empty', 'ok']);
    const {state} = applyIitcTileRequestResponseToQueue(started, {
      result: {
        map: {
          empty: {gameEntities: []},
          ok: {gameEntities: [['ok.1', 1, ['p', 'E', 1, 2]]]},
        },
      },
    }, ['empty', 'ok'], true, {retryReturnedEmptyTiles: true});

    expect(state.successTileKeys).toEqual(['ok']);
    expect(state.queuedTileKeys).toEqual(['empty']);
    expect(state.tileErrorCount).toEqual({});
  });

  it('keeps server retry tiles retryable without incrementing tile errors', () => {
    const started = markIitcTileRequestStarted(createIitcTileQueueState(['a', 'b']), ['a', 'b']);
    const {state} = applyIitcTileRequestResponseToQueue(started, {error: 'RETRY'}, ['a', 'b']);

    expect(state.queuedTileKeys).toEqual(['a', 'b']);
    expect(state.requestedTileKeys).toEqual([]);
    expect(state.tileErrorCount).toEqual({});
  });

  it('fails or stales error tiles after the IITC retry limit', () => {
    let state = markIitcTileRequestStarted(createIitcTileQueueState(['failed', 'stale']), ['failed', 'stale']);
    for (let index = 0; index < 6; index += 1) {
      const result = applyIitcTileRequestResponseToQueue(state, {
        result: {
          map: {
            failed: {error: 'ERROR'},
            stale: {error: 'ERROR'},
          },
        },
      }, ['failed', 'stale'], true, {maxTileRetries: 5, staleTileKeys: ['stale']});
      state = index < 5 ? markIitcTileRequestStarted(result.state, ['failed', 'stale']) : result.state;
    }

    expect(state.queuedTileKeys).toEqual([]);
    expect(state.failedTileKeys).toEqual(['failed']);
    expect(state.staleTileKeys).toEqual(['stale']);
    expect(state.tileErrorCount.failed).toBe(6);
    expect(state.tileErrorCount.stale).toBe(6);
  });
});
