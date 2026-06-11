import {describe, expect, it} from 'vitest';
import {
  classifyIitcGetEntitiesResponse,
  classifyIitcTileRequestResponse,
  clampIitcBounds,
  applyIitcTileRequestResponseToQueue,
  appendIitcResponseBucketDiagnostics,
  createIitcTileQueueState,
  createIitcTileQueueRequestBatches,
  createIitcMapDataPlan,
  createIitcEmptyTileRetryBatches,
  createIitcLiveCompatRequestBatches,
  createIitcResponseBucketDiagnostics,
  createIitcRequestBatches,
  getIitcRequestQueueDelayMs,
  getIitcReusableCacheClassification,
  getIitcLiveCompatRetryTileKeys,
  getIitcRecoveredTileKeys,
  getIitcReturnedEmptyTileKeys,
  getIitcMapZoomTileParameters,
  getIitcTileQueueRefillDecision,
  iitcTileToLat,
  iitcTileToLng,
  iitcBoundsContainsBounds,
  latToIitcTile,
  lngToIitcTile,
  markIitcTileQueueComplete,
  markIitcTileQueueStale,
  markIitcTileRequestStarted,
  mergeIitcGetEntitiesResponses,
  pointToIitcTileId,
  shouldRefreshIitcMapData,
  summarizeIitcReturnedTiles,
  type IitcGetEntitiesResponse,
} from './index';

describe('IITC map data request planning', () => {
  it('clamps bounds to the range accepted by Intel', () => {
    expect(clampIitcBounds({south: -90, west: -190, north: 90, east: 190})).toEqual({
      south: -85.051128,
      west: -180,
      north: 85.051128,
      east: 179.999999,
    });
  });

  it('uses IITC tile id format and reversible tile boundaries', () => {
    const params = getIitcMapZoomTileParameters(15);
    const x = lngToIitcTile(4.8924534, params);
    const y = latToIitcTile(52.3730796, params);

    expect(pointToIitcTileId(params, x, y)).toBe(`${params.zoom}_${x}_${y}_${params.level}_8_100`);
    expect(iitcTileToLng(x, params)).toBeLessThanOrEqual(4.8924534);
    expect(iitcTileToLng(x + 1, params)).toBeGreaterThan(4.8924534);
    expect(iitcTileToLat(y, params)).toBeGreaterThanOrEqual(52.3730796);
    expect(iitcTileToLat(y + 1, params)).toBeLessThan(52.3730796);
  });

  it('creates an IITC ordered tile queue and first request batches', () => {
    const plan = createIitcMapDataPlan(
      {south: 52.368, west: 4.887, north: 52.378, east: 4.899},
      {lat: 52.3730796, lng: 4.8924534},
      15,
    );

    expect(plan.dataZoom).toBe(15);
    expect(plan.tileParams.hasPortals).toBe(true);
    expect(plan.tiles.length).toBeGreaterThan(0);
    expect(plan.tileKeys).toHaveLength(plan.tiles.length);
    expect(plan.requestBatches.length).toBeGreaterThan(0);
    expect(plan.requestBatches[0].length).toBeLessThanOrEqual(25);
    expect(plan.tileKeys[0]).toBe(plan.tiles[0].id);
  });

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

  it('can put live-compatible batches directly in the map data plan', () => {
    const plan = createIitcMapDataPlan(
      {south: 52.35830440667059, west: 4.960670471191407, north: 52.37620175110521, east: 5.032424926757813},
      {lat: 52.36725398525056, lng: 4.99654769897461},
      15,
      {boundsPaddingRatio: 0.25, tilesPerRequest: 5, sequentialRequestBatches: true},
    );

    expect(plan.requestBatches.every((batch) => batch.length <= 5)).toBe(true);
  });

  it('matches IITC refresh skipping for same-zoom moves inside fetched bounds', () => {
    const fetched = {
      mapZoom: 15,
      dataBounds: {south: 52.35, west: 4.86, north: 52.39, east: 4.93},
    };

    expect(iitcBoundsContainsBounds(fetched.dataBounds, {south: 52.36, west: 4.87, north: 52.38, east: 4.91})).toBe(true);
    expect(shouldRefreshIitcMapData(fetched, {
      mapZoom: 15,
      viewportBounds: {south: 52.36, west: 4.87, north: 52.38, east: 4.91},
    })).toBe(false);
    expect(shouldRefreshIitcMapData(fetched, {
      mapZoom: 15,
      viewportBounds: {south: 52.36, west: 4.87, north: 52.38, east: 4.94},
    })).toBe(true);
    expect(shouldRefreshIitcMapData(fetched, {
      mapZoom: 14,
      viewportBounds: {south: 52.36, west: 4.87, north: 52.38, east: 4.91},
    })).toBe(true);
  });

  it('reuses cached responses only when bounds and tile coverage match', () => {
    const fetched = {
      mapZoom: 15,
      dataBounds: {south: 52.35, west: 4.86, north: 52.39, east: 4.93},
    };
    const response: IitcGetEntitiesResponse = {
      result: {
        map: {
          a: {gameEntities: [['a.1', 1, ['p', 'E', 1, 2]]]},
          b: {gameEntities: []},
        },
      },
    };

    const reusable = getIitcReusableCacheClassification(fetched, {
      mapZoom: 15,
      viewportBounds: {south: 52.36, west: 4.87, north: 52.38, east: 4.91},
      tileKeys: ['a', 'b'],
    }, response);

    expect(reusable?.returnedTiles).toBe(2);
    expect(getIitcReusableCacheClassification(fetched, {
      mapZoom: 15,
      viewportBounds: {south: 52.36, west: 4.87, north: 52.38, east: 4.91},
      tileKeys: ['a', 'missing'],
    }, response)).toBeNull();
    expect(getIitcReusableCacheClassification(fetched, {
      mapZoom: 15,
      viewportBounds: {south: 52.36, west: 4.87, north: 52.38, east: 4.94},
      tileKeys: ['a', 'b'],
    }, response)).toBeNull();
  });

  it('merges getEntities responses using richer tile payloads', () => {
    const emptyThenFull: IitcGetEntitiesResponse[] = [
      {result: {map: {a: {gameEntities: []}, b: {gameEntities: [['b.1', 1, ['p', 'E', 1, 2]]]}}}},
      {result: {map: {a: {gameEntities: [['a.1', 1, ['p', 'R', 3, 4]]]}, b: {gameEntities: []}}}},
    ];

    const merged = mergeIitcGetEntitiesResponses(emptyThenFull);
    expect(merged.result?.map?.a?.gameEntities).toHaveLength(1);
    expect(merged.result?.map?.b?.gameEntities).toHaveLength(1);
  });

  it('summarizes returned, empty, non-empty, and recovered tiles', () => {
    const response: IitcGetEntitiesResponse = {
      result: {
        map: {
          a: {gameEntities: []},
          b: {gameEntities: [['b.1', 1, ['p', 'E', 1, 2]]]},
          timeout: {error: 'TIMEOUT'},
        },
      },
    };

    expect(summarizeIitcReturnedTiles(response)).toEqual({
      returnedTiles: 3,
      nonEmptyTiles: 1,
      emptyTileKeys: ['a'],
      nonEmptyTileKeys: ['b'],
    });
    expect(getIitcReturnedEmptyTileKeys(response, ['a', 'b', 'timeout', 'c'])).toEqual(['a']);
    expect(getIitcRecoveredTileKeys(['a', 'b', 'c'], ['b', 'd'])).toEqual(['b']);
  });

  it('classifies requested tile response state for IITC-style lifecycle handling', () => {
    const response: IitcGetEntitiesResponse = {
      result: {
        map: {
          a: {gameEntities: []},
          b: {gameEntities: [['b.1', 1, ['p', 'E', 1, 2]]]},
          unrelated: {gameEntities: [['u.1', 1, ['p', 'R', 3, 4]]]},
        },
      },
    };

    expect(classifyIitcGetEntitiesResponse(response, ['a', 'b', 'c'])).toEqual({
      requestedTiles: 3,
      returnedTiles: 2,
      nonEmptyTiles: 1,
      returnedTileKeys: ['a', 'b'],
      emptyTileKeys: ['a'],
      nonEmptyTileKeys: ['b'],
      unaccountedTileKeys: ['c'],
      successTileKeys: ['a', 'b'],
      retryTileKeys: [],
    });
    expect(
      classifyIitcGetEntitiesResponse(response, ['a', 'b', 'c'], {
        retryReturnedEmptyTiles: true,
        retryUnaccountedTiles: true,
      }).retryTileKeys,
    ).toEqual(['a', 'c']);
  });

  it('classifies IITC request response buckets and queue delay reasons', () => {
    const mixedResponse: IitcGetEntitiesResponse = {
      result: {
        map: {
          ok: {gameEntities: [['ok.1', 1, ['p', 'E', 1, 2]]]},
          timeout: {error: 'TIMEOUT'},
          fail: {error: 'ERROR'},
        },
      },
    };

    expect(classifyIitcTileRequestResponse(mixedResponse, ['ok', 'timeout', 'fail', 'missing'])).toEqual({
      requestedTiles: 4,
      returnedTileKeys: ['ok', 'timeout', 'fail'],
      successTileKeys: ['ok'],
      serverRetryTileKeys: [],
      timeoutTileKeys: ['timeout'],
      errorTileKeys: ['fail'],
      unaccountedTileKeys: ['missing'],
      retryTileKeys: ['timeout', 'fail', 'missing'],
      queueDelayReason: 'error',
    });
    expect(classifyIitcTileRequestResponse({error: 'RETRY'}, ['a', 'b'])).toMatchObject({
      serverRetryTileKeys: ['a', 'b'],
      retryTileKeys: ['a', 'b'],
      queueDelayReason: 'server-retry',
    });
    expect(classifyIitcTileRequestResponse(null, ['a'], false)).toMatchObject({
      errorTileKeys: ['a'],
      retryTileKeys: ['a'],
      queueDelayReason: 'error',
    });
  });

  it('keeps error buckets out of successful empty-tile diagnostics', () => {
    const response: IitcGetEntitiesResponse = {
      result: {
        map: {
          empty: {gameEntities: []},
          timeout: {error: 'TIMEOUT'},
          fail: {error: 'ERROR'},
        },
      },
    };

    expect(classifyIitcGetEntitiesResponse(response, ['empty', 'timeout', 'fail', 'missing'], {
      retryReturnedEmptyTiles: true,
      retryUnaccountedTiles: true,
    })).toEqual({
      requestedTiles: 4,
      returnedTiles: 3,
      nonEmptyTiles: 0,
      returnedTileKeys: ['empty', 'timeout', 'fail'],
      emptyTileKeys: ['empty'],
      nonEmptyTileKeys: [],
      unaccountedTileKeys: ['missing'],
      successTileKeys: [],
      retryTileKeys: ['empty', 'missing'],
    });
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

  it('accumulates response bucket diagnostics immutably', () => {
    const start = createIitcResponseBucketDiagnostics();
    const next = appendIitcResponseBucketDiagnostics(start, {
      result: {
        map: {
          ok: {gameEntities: [['ok.1', 1, ['p', 'E', 1, 2]]]},
          timeout: {error: 'TIMEOUT'},
          fail: {error: 'ERROR'},
        },
      },
    }, ['ok', 'timeout', 'fail', 'missing']);

    expect(start.timeoutTileKeys).toEqual([]);
    expect(next.timeoutTileKeys).toEqual(['timeout']);
    expect(next.errorTileKeys).toEqual(['fail']);
    expect(next.responseRetryTileKeys).toEqual(['timeout', 'fail', 'missing']);
    expect(next.queueDelayReasons).toEqual(['error']);
  });

  it('selects live-compatible retry tiles from empty and IITC error buckets', () => {
    const response: IitcGetEntitiesResponse = {
      result: {
        map: {
          empty: {gameEntities: []},
          ok: {gameEntities: [['ok.1', 1, ['p', 'E', 1, 2]]]},
          timeout: {error: 'TIMEOUT'},
          fail: {error: 'ERROR'},
        },
      },
    };

    expect(getIitcLiveCompatRetryTileKeys(response, ['empty', 'ok', 'timeout', 'fail', 'missing'])).toEqual([
      'empty',
      'timeout',
      'fail',
      'missing',
    ]);
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

  it('accumulates failed request diagnostics through the same response bucket classifier', () => {
    const diagnostics = appendIitcResponseBucketDiagnostics(
      createIitcResponseBucketDiagnostics(),
      undefined,
      ['a', 'b'],
      false,
    );

    expect(diagnostics.errorTileKeys).toEqual(['a', 'b']);
    expect(diagnostics.responseRetryTileKeys).toEqual(['a', 'b']);
    expect(diagnostics.queueDelayReasons).toEqual(['error']);
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
