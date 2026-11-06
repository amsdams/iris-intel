import {describe, expect, it} from 'vitest';
import {IitcDataCache, type IitcGetEntitiesResponse, type IitcMapTilePayload} from '@iris/iitc-core';
import {createMapRefreshSession} from './map-refresh-session';

const tile: IitcMapTilePayload = {gameEntities: [['portal', 1, ['p', 'E', 52, 4, 6, 80, 8]]]};
const response = (keys: string[]): IitcGetEntitiesResponse => ({result: {map: Object.fromEntries(keys.map(key => [key, tile]))}});

describe('one map refresh session', () => {
  it('renders only fresh cache initially and keeps outstanding tiles out of initial missing-tile diagnostics', () => {
    let now = 0;
    const cache = new IitcDataCache<IitcMapTilePayload>({now: (): number => now});
    cache.store('stale', tile);
    now = 181_000;
    cache.store('fresh', tile);
    const session = createMapRefreshSession(['fresh', 'stale', 'missing'], cache);
    expect(Object.keys(session.cachedResponse?.result?.map ?? {})).toEqual(['fresh']);
    expect(session.queueState.queuedTileKeys).toEqual(['stale', 'missing']);
    const initial = session.getDiagnostics('initial');
    expect(initial).toMatchObject({cacheFreshTileKeys: ['fresh'], cacheStaleTileKeys: [],
      unaccountedTileKeys: [], renderQueue: {renderedCacheFreshTiles: 1}});
    expect(initial).not.toHaveProperty('recoveredTileKeys');
    expect(initial).not.toHaveProperty('partialTileKeys');
    expect(session.getDiagnostics('progress').unaccountedTileKeys).toEqual(['stale', 'missing']);
  });

  it('accepts a handed-off batch without consuming an active slot or rendering unrelated response tiles', () => {
    const cache = new IitcDataCache<IitcMapTilePayload>();
    const session = createMapRefreshSession(['wanted', 'pending'], cache);
    session.startRequest(['pending']);
    expect(session.queueState.activeRequestCount).toBe(1);
    expect(session.applyBatch({tileKeys: ['wanted'], response: response(['wanted', 'outside'])}, false, false))
      .toEqual({status: 'batch 1', delayMs: 0});
    expect(session.queueState.activeRequestCount).toBe(1);
    expect(session.queueState.queuedTileKeys).toEqual(['pending']);
    expect(Object.keys(session.response.result?.map ?? {})).toEqual(['wanted']);
    expect(cache.get('outside')).toBeUndefined();
    expect(session.batchCount).toBe(1);
  });

  it('keeps retry recovery, counters and prior diagnostic snapshots independent', () => {
    const session = createMapRefreshSession(['tile'], new IitcDataCache<IitcMapTilePayload>());
    session.startRequest(['tile']);
    session.applyBatch({tileKeys: ['tile'], response: {result: {map: {tile: {error: 'TIMEOUT'}}}}}, false);
    const failed = session.getDiagnostics('progress');
    expect(failed).toMatchObject({timeoutTileKeys: ['tile'], retryRequests: 0, recoveredTileKeys: []});
    session.startRequest(['tile']);
    expect(session.applyBatch({tileKeys: ['tile'], response: response(['tile'])}, true).status).toBe('retry 1');
    session.markComplete();
    expect(session.getDiagnostics('complete')).toMatchObject({retryRequests: 1, retriedTileKeys: ['tile'],
      recoveredTileKeys: ['tile'], partialTileKeys: [], queue: {activeRequests: 0, successTiles: 1}});
    expect(failed).toMatchObject({retryRequests: 0, recoveredTileKeys: [], renderQueue: {renderedTiles: 0}});
  });
});
