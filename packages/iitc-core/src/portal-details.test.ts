import {describe, expect, it} from 'vitest';
import {parseIitcPortalDetailsResponse} from './portal-details';
import {
  applyIitcPortalDetailsResponse,
  createIitcPortalDetailsAuthState,
  createIitcPortalDetailsErrorState,
  createIitcPortalDetailsLoadingState,
  getIitcCachedPortalDetails,
  writeIitcPortalDetailsCache,
  type IitcPortalDetailsCache,
} from './portal-details-facade';

const portalDetailsResponse = {
  result: [
    'p',
    'R',
    52373570,
    4883326,
    8,
    100,
    8,
    'https://example.test/portal.jpg',
    'Scheepsbehoeften',
    [],
    false,
    false,
    null,
    1717027200000,
    [
      ['AgentA', 'RES_SHIELD', 'RARE', {MITIGATION: '70'}],
      ['AgentB', 'LINK_AMPLIFIER', 'RARE', {LINK_RANGE_MULTIPLIER: '2000'}],
      ['AgentC', 'TURRET', 'VERY_RARE', {HIT_BONUS: '150', ATTACK_FREQUENCY: '150'}],
      null,
    ],
    [
      ['AgentA', 8, 6000],
      ['AgentB', 7, 5000],
      null,
    ],
    'AgentA',
    null,
    3,
  ],
};

describe('portal details parser', () => {
  it('parses IITC getPortalDetails payloads and derived mitigation', () => {
    const details = parseIitcPortalDetailsResponse(portalDetailsResponse, 'portal.16', 6);

    expect(details).toMatchObject({
      guid: 'portal.16',
      team: 'R',
      latE6: 52373570,
      lngE6: 4883326,
      level: 8,
      health: 100,
      resCount: 8,
      image: 'https://example.test/portal.jpg',
      title: 'Scheepsbehoeften',
      owner: 'AgentA',
      visited: true,
      captured: true,
      scoutControlled: false,
      hasMissionsStartingHere: false,
    });
    expect(details?.mods).toHaveLength(3);
    expect(details?.resonators).toHaveLength(2);
    expect(details?.mitigation.shields).toBe(70);
    expect(details?.mitigation.links).toBeGreaterThan(0);
    expect(details?.mitigation.total).toBeLessThanOrEqual(95);
  });
});

describe('portal details facade', () => {
  it('creates stable request state objects', () => {
    expect(createIitcPortalDetailsLoadingState('portal.16')).toEqual({status: 'loading', guid: 'portal.16'});
    expect(createIitcPortalDetailsAuthState('portal.16', 'missing Intel version')).toEqual({
      status: 'auth',
      guid: 'portal.16',
      error: 'missing Intel version',
    });
    expect(createIitcPortalDetailsErrorState('portal.16', 12.5, 'empty portal details')).toEqual({
      status: 'error',
      guid: 'portal.16',
      elapsedMs: 12.5,
      error: 'empty portal details',
    });
  });

  it('applies getPortalDetails responses to ready state with diagnostics', () => {
    const result = applyIitcPortalDetailsResponse({
      response: portalDetailsResponse,
      guid: 'portal.16',
      linkCount: 6,
      elapsedMs: 42,
    });

    expect(result.details?.title).toBe('Scheepsbehoeften');
    expect(result.state).toMatchObject({
      status: 'ready',
      guid: 'portal.16',
      elapsedMs: 42,
      owner: 'AgentA',
      history: {
        visited: true,
        captured: true,
        scoutControlled: false,
      },
      hasMissionsStartingHere: false,
    });
    expect(result.state.mods).toHaveLength(3);
    expect(result.state.resonators).toHaveLength(2);
    expect(result.diagnostics).toEqual({
      guid: 'portal.16',
      linkCount: 6,
      elapsedMs: 42,
      parsed: true,
      status: 'ready',
    });
  });

  it('applies empty getPortalDetails responses to error state', () => {
    const result = applyIitcPortalDetailsResponse({
      response: {},
      guid: 'portal.16',
      elapsedMs: 10,
    });

    expect(result.details).toBeNull();
    expect(result.state).toEqual({
      status: 'error',
      guid: 'portal.16',
      elapsedMs: 10,
      error: 'empty portal details',
    });
    expect(result.diagnostics).toMatchObject({parsed: false, status: 'error'});
  });

  it('returns cached portal details with a cached marker and prunes old entries', () => {
    const cache: IitcPortalDetailsCache = new Map();
    writeIitcPortalDetailsCache(cache, 'oldest', {status: 'ready', guid: 'oldest'}, 2);
    writeIitcPortalDetailsCache(cache, 'portal.16', {status: 'ready', guid: 'portal.16', owner: 'AgentA'}, 2);
    writeIitcPortalDetailsCache(cache, 'newest', {status: 'ready', guid: 'newest'}, 2);

    expect(cache.has('oldest')).toBe(false);
    expect(getIitcCachedPortalDetails(cache, 'portal.16')).toEqual({
      status: 'ready',
      guid: 'portal.16',
      owner: 'AgentA',
      cached: true,
    });
    expect(getIitcCachedPortalDetails(cache, 'missing')).toBeNull();
  });
});
