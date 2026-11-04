import {describe, expect, it, vi} from 'vitest';
import type {IitcGetEntitiesResponse, IitcPortalHistory, IitcRawGameEntity} from '@iris/iitc-core';
import {adaptArtifactPortalEntities, adaptMapEntities, getArtifactTypes} from './map-entity-adapter';

type History = IitcPortalHistory;
const history = (raw: number): History => ({raw, visited: Boolean(raw & 1), captured: Boolean(raw & 2), scoutControlled: Boolean(raw & 4)});
const portal = (guid: string, bits?: number, artifactBrief: unknown = null): IitcRawGameEntity => {
  const data: unknown[] = ['p', 'E', 52373000, 4895000, 6, 80, 8, 'image', guid, ['ornament'], true, false, artifactBrief, 123];
  if (bits !== undefined) data.push([], [], 'owner', null, bits);
  return [guid, 123, data];
};
const response = (...gameEntities: IitcRawGameEntity[]): IitcGetEntitiesResponse => ({result: {map: {tile: {gameEntities}}}});

describe('map response adaptation', () => {
  it('projects portal, link and field payloads and preserves placeholders from core decoding', () => {
    const result = adaptMapEntities(response(portal('a'),
      ['link', 123, ['e', 'R', 'a', 52373000, 4895000, 'b', 52374000, 4896000]],
      ['field', 123, ['r', 'E', [['a', 52373000, 4895000], ['b', 52374000, 4896000], ['c', 52375000, 4897000]]]],
    ), 42, new Map());
    expect(result.entities.generation).toBe(42);
    expect(result.entities.portals.find(p => p.guid === 'a')).toEqual({
      guid: 'a', title: 'a', image: 'image', team: 'E', latE6: 52373000, lngE6: 4895000,
      level: 6, health: 80, resCount: 8, mission: true, mission50plus: false, ornaments: ['ornament'],
      artifacts: undefined, history: undefined, isPlaceholder: false,
    });
    expect(result.entities.portals.filter(p => p.isPlaceholder).map(p => p.guid)).toEqual(['b', 'c']);
    expect(result.entities.links).toEqual([{guid: 'link', team: 'R', oGuid: 'a', oLatE6: 52373000, oLngE6: 4895000,
      dGuid: 'b', dLatE6: 52374000, dLngE6: 4896000}]);
    expect(result.entities.fields).toEqual([{guid: 'field', team: 'E', points: [
      {guid: 'a', latE6: 52373000, lngE6: 4895000}, {guid: 'b', latE6: 52374000, lngE6: 4896000},
      {guid: 'c', latE6: 52375000, lngE6: 4897000},
    ]}]);
    expect(result.historyUpdates.size).toBe(0);
  });

  it('returns only explicit history updates, including zero, without changing cached history', () => {
    const cached = new Map([['known', history(3)], ['detail', history(1)], ['zero', history(7)], ['unrelated', history(4)]]);
    const before = new Map(cached);
    const {entities, historyUpdates} = adaptMapEntities(response(
      portal('known'), portal('detail', 7), portal('zero', 0), portal('unknown'),
    ), 1, cached);
    expect(entities.portals.map(p => p.history)).toEqual([history(3), history(7), history(0), undefined]);
    expect(historyUpdates).toEqual(new Map([['detail', history(7)], ['zero', history(0)]]));
    expect(cached).toEqual(before);
  });

  it('keeps artifact portal override priority, artifact metadata and cached-history fallback', () => {
    const artifact = portal('same', undefined, [[['jarvis', 'fragment-1']], [['jarvis']]]);
    artifact[1] = 1;
    artifact[2][13] = 1;
    artifact[2][8] = 'Artifact portal';
    const {entities, historyUpdates} = adaptMapEntities(response(portal('same', 7)), 5,
      new Map([['same', history(3)]]), [artifact, portal('outside', 0)]);
    expect(entities.portals).toHaveLength(2);
    expect(entities.portals[0]).toMatchObject({guid: 'same', title: 'Artifact portal', history: history(3), artifacts: [
      {role: 'fragment', type: 'jarvis', ids: ['fragment-1']}, {role: 'target', type: 'jarvis', ids: []},
    ]});
    expect(historyUpdates).toEqual(new Map([['outside', history(0)]]));
  });

  it('keeps empty responses empty without clearing cached history', () => {
    const cached = new Map([['known', history(3)]]);
    for (const value of [{}, {result: {}}, response()]) {
      expect(adaptMapEntities(value, 8, cached)).toEqual({entities: {generation: 8, portals: [], links: [], fields: []}, historyUpdates: new Map()});
    }
    expect(cached).toEqual(new Map([['known', history(3)]]));
  });
});

describe('artifact response adaptation', () => {
  it('accepts flat and nested results, retains raw tuples and ignores other values', () => {
    const tuple = portal('tuple');
    const summary = portal('summary')[2];
    const input = {tuple, summary, invalid: ['e'], null: null, number: 7, object: {}};
    const now = vi.fn(() => 999);
    for (const result of [input, {portals: input, ignored: portal('ignored')}]) {
      const entities = adaptArtifactPortalEntities(result, now);
      expect(entities).toEqual([tuple, ['summary', 123, summary]]);
      expect(entities[0]).toBe(tuple);
    }
    expect(now).not.toHaveBeenCalled();
    for (const result of [null, undefined, [], 1, 'invalid']) expect(adaptArtifactPortalEntities(result, now)).toEqual([]);
  });

  it('uses the explicit clock only for missing or nonfinite summary timestamps', () => {
    const now = vi.fn().mockReturnValueOnce(1001).mockReturnValueOnce(1002).mockReturnValueOnce(1003);
    const inputs = Object.fromEntries([0, -1, 123, undefined, NaN, Infinity].map((timestamp, i) => {
      const data = portal(`p${i}`)[2];
      data[13] = timestamp;
      return [`p${i}`, data];
    }));
    const entities = adaptArtifactPortalEntities(inputs, now);
    expect(entities.map(e => e[1])).toEqual([0, -1, 123, 1001, 1002, 1003]);
    expect(now).toHaveBeenCalledTimes(3);
  });

  it('deduplicates and sorts artifact types for diagnostics', () => {
    expect(getArtifactTypes([
      portal('one', undefined, [[['jarvis', 'fragment-1'], ['enlightened', 'fragment-2']], [['jarvis']]]),
      portal('two', undefined, [[['jarvis', 'fragment-3']], []]), portal('none'),
    ])).toEqual(['enlightened', 'jarvis']);
    expect(getArtifactTypes([])).toEqual([]);
  });
});
