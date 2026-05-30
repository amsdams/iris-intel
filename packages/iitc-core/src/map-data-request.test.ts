import {describe, expect, it} from 'vitest';
import {
  classifyIitcGetEntitiesResponse,
  classifyIitcTileRequestResponse,
  clampIitcBounds,
  createIitcMapDataPlan,
  createIitcEmptyTileRetryBatches,
  createIitcLiveCompatRequestBatches,
  createIitcRequestBatches,
  getIitcRecoveredTileKeys,
  getIitcReturnedEmptyTileKeys,
  getIitcMapZoomTileParameters,
  iitcTileToLat,
  iitcTileToLng,
  iitcBoundsContainsBounds,
  latToIitcTile,
  lngToIitcTile,
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
        },
      },
    };

    expect(summarizeIitcReturnedTiles(response)).toEqual({
      returnedTiles: 2,
      nonEmptyTiles: 1,
      emptyTileKeys: ['a'],
      nonEmptyTileKeys: ['b'],
    });
    expect(getIitcReturnedEmptyTileKeys(response, ['a', 'b', 'c'])).toEqual(['a']);
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
});
