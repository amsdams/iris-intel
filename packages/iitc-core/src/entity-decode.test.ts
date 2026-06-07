import {describe, expect, it} from 'vitest';
import {decodeIitcGameEntities, decodeIitcGetEntitiesResponse, getIitcPortalArtifacts, isIitcFakeFieldEdgeLink, type IitcGetEntitiesResponse, type IitcRawGameEntity} from './index';

function rawCounts(response: IitcGetEntitiesResponse): {p: number; e: number; realLinks: number; uniqueRealLinks: number; r: number; uniqueFields: number} {
  const counts = {p: 0, e: 0, realLinks: 0, r: 0};
  const uniqueRealLinks = new Set<string>();
  const uniqueFields = new Set<string>();

  for (const tile of Object.values(response.result?.map ?? {})) {
    for (const entity of tile.gameEntities ?? []) {
      const type = entity[2][0];
      if (type === 'p' || type === 'e' || type === 'r') counts[type] += 1;
      if (type === 'e' && !isIitcFakeFieldEdgeLink(entity[0])) {
        counts.realLinks += 1;
        uniqueRealLinks.add(entity[0]);
      }
      if (type === 'r') uniqueFields.add(entity[0]);
    }
  }

  return {...counts, uniqueRealLinks: uniqueRealLinks.size, uniqueFields: uniqueFields.size};
}

function getEntitiesResponse(gameEntities: IitcRawGameEntity[]): IitcGetEntitiesResponse {
  return {
    result: {
      map: {
        'mock-tile': {gameEntities},
      },
    },
  };
}

describe('IITC entity decoding', () => {
  it('decodes raw portals, links, and fields from Amsterdam z14 fixture', () => {
    const fixture = getEntitiesResponse([
      [
        'portal-a.16',
        1000,
        ['p', 'E', 52_373_000, 4_895_000, 6, 80, 8, 'image-a', 'Portal A', ['sc5_p'], false, false, null, 1000],
      ],
      [
        'portal-b.16',
        1001,
        ['p', 'R', 52_374_000, 4_896_000, 5, 60, 7, 'image-b', 'Portal B', [], false, false, null, 1001],
      ],
      [
        'link-ab.9',
        1002,
        ['e', 'E', 'portal-a.16', 52_373_000, 4_895_000, 'portal-b.16', 52_374_000, 4_896_000],
      ],
      [
        '0123456789abcdef0123456789abcdef.b_ab',
        1003,
        ['e', 'E', 'portal-a.16', 52_373_000, 4_895_000, 'portal-b.16', 52_374_000, 4_896_000],
      ],
      [
        'field-ab.9',
        1004,
        ['r', 'E', [
          ['portal-a.16', 52_373_000, 4_895_000],
          ['portal-b.16', 52_374_000, 4_896_000],
          ['portal-c.16', 52_375_000, 4_897_000],
        ]],
      ],
    ]);
    const decoded = decodeIitcGetEntitiesResponse(fixture);
    const counts = rawCounts(fixture);

    expect(Object.values(decoded.portals).filter((portal) => !portal.isPlaceholder)).toHaveLength(counts.p);
    expect(Object.values(decoded.links)).toHaveLength(counts.uniqueRealLinks);
    expect(Object.values(decoded.fields)).toHaveLength(counts.uniqueFields);
    expect(Object.values(decoded.portals).some((portal) => portal.ornaments?.includes('sc5_p'))).toBe(true);
  });

  it('creates placeholder portals from low-zoom links and fields like IITC', () => {
    const fixture = getEntitiesResponse([
      [
        'low-link.9',
        2000,
        ['e', 'R', 'low-a.16', 52_300_000, 4_800_000, 'low-b.16', 52_400_000, 4_900_000],
      ],
      [
        'low-field.9',
        2001,
        ['r', 'R', [
          ['low-a.16', 52_300_000, 4_800_000],
          ['low-b.16', 52_400_000, 4_900_000],
          ['low-c.16', 52_500_000, 5_000_000],
        ]],
      ],
    ]);
    const decoded = decodeIitcGetEntitiesResponse(fixture);
    const counts = rawCounts(fixture);

    expect(counts.p).toBe(0);
    expect(Object.values(decoded.portals).length).toBeGreaterThan(0);
    expect(Object.values(decoded.portals).every((portal) => portal.isPlaceholder)).toBe(true);
    expect(Object.values(decoded.links)).toHaveLength(counts.uniqueRealLinks);
    expect(Object.values(decoded.fields)).toHaveLength(counts.uniqueFields);
  });

  it('filters fake field-edge links that IITC ignores', () => {
    const fakeLink: IitcRawGameEntity = [
      '0123456789abcdef0123456789abcdef.b_ab',
      1,
      ['e', 'R', 'a.16', 1, 2, 'b.16', 3, 4],
    ];
    const realLink: IitcRawGameEntity = [
      '0123456789abcdef0123456789abcdef.9',
      1,
      ['e', 'R', 'a.16', 1, 2, 'b.16', 3, 4],
    ];

    expect(isIitcFakeFieldEdgeLink(fakeLink[0])).toBe(true);
    expect(decodeIitcGameEntities([fakeLink, realLink]).links[realLink[0]]).toMatchObject({guid: realLink[0]});
  });

  it('decodes artifact brief data from portal summaries', () => {
    const artifactPortal: IitcRawGameEntity = [
      'artifact.16',
      123,
      ['p', 'E', 52_373_000, 4_895_000, 6, 80, 8, 'image', 'Artifact Portal', ['sc5_p'], false, false, [[['jarvis', 'fragment-1']], [['jarvis']]], 123],
    ];

    const portal = decodeIitcGameEntities([artifactPortal]).portals['artifact.16'];

    expect(portal).toMatchObject({
      artifactBrief: {
        fragment: {jarvis: ['fragment-1']},
        target: {jarvis: []},
      },
    });
    expect(getIitcPortalArtifacts(portal.artifactBrief)).toEqual([
      {role: 'fragment', type: 'jarvis', ids: ['fragment-1']},
      {role: 'target', type: 'jarvis', ids: []},
    ]);
  });

  it('decodes extended portal history bits like IITC', () => {
    const historyPortal: IitcRawGameEntity = [
      'history.16',
      123,
      ['p', 'R', 52_373_000, 4_895_000, 6, 80, 8, 'image', 'History Portal', [], false, false, null, 123, [], [], 'owner', null, 3],
    ];

    const portal = decodeIitcGameEntities([historyPortal]).portals['history.16'];

    expect(portal.history).toEqual({
      raw: 3,
      visited: true,
      captured: true,
      scoutControlled: false,
    });
  });
});
