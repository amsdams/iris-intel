import {describe, expect, it} from 'vitest';
import {
  createIitcSearchErrorState,
  createIitcSearchIdleState,
  createIitcSearchLocalState,
  createIitcSearchLoadingState,
  createIitcSearchSuccessState,
  getIitcLocalSearchResults,
  normalizeIitcNominatimResults,
  parseIitcSearchCoordinateResults,
} from './search-facade';

const portals = [
  {
    guid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.16',
    title: 'Amsterdam Centraal',
    team: 'R' as const,
    latE6: 52379000,
    lngE6: 4899000,
    level: 8,
    health: 91,
    resCount: 8,
  },
  {
    guid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.16',
    title: 'Centraal Station Clock',
    team: 'E' as const,
    latE6: 52378000,
    lngE6: 4898000,
    level: 5,
    health: 64,
    resCount: 6,
  },
];

describe('IITC search local portal results', () => {
  it('returns guid matches', () => {
    const results = getIitcLocalSearchResults({
      term: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.16',
      portals,
      autoMinLength: 3,
    });

    expect(results.map((result) => result.type)).toEqual(['guid']);
    expect(results[0]).toMatchObject({
      id: 'guid:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.16',
      title: 'Amsterdam Centraal',
      description: 'RES, L8, 91%, 8 Resonators',
      lat: 52.379,
      lng: 4.899,
      guid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.16',
      team: 'R',
    });
  });

  it('returns title matches in loaded portal order', () => {
    const results = getIitcLocalSearchResults({term: 'centraal', portals});

    expect(results.map((result) => result.guid)).toEqual([
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.16',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.16',
    ]);
    expect(results.map((result) => result.type)).toEqual(['portal', 'portal']);
  });

  it('suppresses automatic short local searches', () => {
    expect(getIitcLocalSearchResults({term: 'am', portals, autoMinLength: 3})).toEqual([]);
  });
});

describe('IITC search coordinate results', () => {
  it('parses decimal coordinates and rejects duplicate or invalid points', () => {
    expect(parseIitcSearchCoordinateResults('52.379000,4.899000 and 52.379000%2C4.899000 and 91.1,4.8')).toEqual([
      {
        id: 'coordinate:52.379000,4.899000',
        type: 'coordinate',
        title: '52.379000,4.899000',
        description: 'geo coordinates',
        lat: 52.379,
        lng: 4.899,
      },
    ]);
  });

  it('parses DMS coordinates with hemisphere signs', () => {
    const [result] = parseIitcSearchCoordinateResults('52°22\'44.4"N, 4°53\'56.4"E');

    expect(result).toMatchObject({
      type: 'coordinate',
      title: '52.379000,4.899000',
      lat: 52.379,
    });
    expect(result.lng).toBeCloseTo(4.899);
  });
});

describe('IITC Nominatim normalization', () => {
  it('normalizes address results, bounds, fallback titles, and de-duplicates seen keys', () => {
    const seen = new Set<string>(['seen']);
    const results = normalizeIitcNominatimResults([
      {
        place_id: 'seen',
        display_name: 'Already seen',
        lat: '52.1',
        lon: '4.1',
      },
      {
        place_id: '123',
        display_name: 'Damrak, Amsterdam',
        type: 'street',
        lat: '52.375',
        lon: '4.895',
        icon: 'https://example.test/icon.png',
        boundingbox: ['52.37', '52.38', '4.89', '4.90'],
        geojson: {type: 'Point', coordinates: [4.895, 52.375]},
      },
      {
        lat: '52.5',
        lon: '4.5',
      },
    ], seen);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'address:123',
      type: 'address',
      title: 'Damrak, Amsterdam',
      description: 'Type: street',
      lat: 52.375,
      lng: 4.895,
      bounds: {south: 52.37, north: 52.38, west: 4.89, east: 4.9},
    });
    expect(results[1]).toMatchObject({
      title: '52.500000,4.500000',
      description: 'OpenStreetMap',
    });
  });
});

describe('IITC search request state', () => {
  it('creates idle, local, success, and error states', () => {
    const localResults = getIitcLocalSearchResults({term: 'centraal', portals});
    const onlineResults = normalizeIitcNominatimResults([{place_id: 1, display_name: 'Centraal', lat: '52', lon: '4'}]);

    expect(createIitcSearchIdleState()).toEqual({
      status: 'idle',
      term: '',
      confirmed: false,
      results: [],
      localResults: 0,
    });
    expect(createIitcSearchLocalState({term: 'centraal', confirmed: true, localResults})).toMatchObject({
      status: 'loading',
      term: 'centraal',
      confirmed: true,
      localResults: 2,
    });
    expect(createIitcSearchLoadingState({term: 'centraal', localResults})).toEqual(
      createIitcSearchLocalState({term: 'centraal', confirmed: true, localResults}),
    );
    expect(createIitcSearchSuccessState({
      term: 'centraal',
      confirmed: true,
      localResults,
      onlineResults,
      elapsedMs: 12,
    })).toMatchObject({
      status: 'ready',
      results: [...localResults, ...onlineResults],
      localResults: 2,
      onlineResults: 1,
      elapsedMs: 12,
    });
    expect(createIitcSearchErrorState({
      term: 'centraal',
      confirmed: true,
      localResults: [],
      elapsedMs: 20,
      error: 'network failed',
    })).toEqual({
      status: 'error',
      term: 'centraal',
      confirmed: true,
      results: [],
      localResults: 0,
      elapsedMs: 20,
      error: 'network failed',
    });
  });

  it('creates an empty OpenStreetMap notice when no online or local results exist', () => {
    expect(createIitcSearchSuccessState({
      term: 'nope',
      confirmed: true,
      localResults: [],
      onlineResults: [],
      elapsedMs: 3,
    })).toMatchObject({
      status: 'empty',
      results: [{id: 'empty:osm', type: 'empty', title: 'No results on OpenStreetMap'}],
      onlineResults: 0,
    });
  });
});
