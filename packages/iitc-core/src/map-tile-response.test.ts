import {describe, expect, it} from 'vitest';
import {
  classifyIitcGetEntitiesResponse,
  classifyIitcTileDiagnostics,
  classifyIitcTileRequestResponse,
  appendIitcResponseBucketDiagnostics,
  createIitcResponseBucketDiagnostics,
  getIitcLiveCompatRetryTileKeys,
  getIitcRecoveredTileKeys,
  getIitcReturnedEmptyTileKeys,
  mergeIitcGetEntitiesResponses,
  summarizeIitcReturnedTiles,
  type IitcGetEntitiesResponse,
} from './index';

describe('map tile response', () => {
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
    expect(classifyIitcTileDiagnostics(response, ['a', 'b', 'c'])).toEqual({
      returnedTiles: 2,
      nonEmptyTiles: 1,
      emptyTileKeys: ['a'],
      nonEmptyTileKeys: ['b'],
      unaccountedTileKeys: ['c'],
    });
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
});
