import {describe, expect, it} from 'vitest';
import {getIitcPortalAnalysis, getIitcPortalsListApGain, type IitcPortalAnalysisEntities} from './portal-analysis';

const entities: IitcPortalAnalysisEntities = {
  portals: [
    {
      guid: 'enl-8',
      title: 'ENL Eight',
      team: 'E',
      latE6: 52_000_000,
      lngE6: 4_000_000,
      level: 8,
      health: 90,
      resCount: 8,
      history: {visited: true, captured: true, scoutControlled: false},
      ornaments: ['sc5_p'],
      artifacts: [{type: 'jarvis'}],
      isPlaceholder: false,
    },
    {
      guid: 'res-5',
      title: 'RES Five',
      team: 'R',
      latE6: 52_001_000,
      lngE6: 4_001_000,
      level: 5,
      health: 50,
      resCount: 6,
      mission: true,
      history: {visited: true, captured: false, scoutControlled: true},
      isPlaceholder: false,
    },
    {
      guid: 'placeholder',
      team: 'R',
      latE6: 52_002_000,
      lngE6: 4_002_000,
      isPlaceholder: true,
    },
    {
      guid: 'neutral',
      title: 'Neutral',
      team: 'N',
      latE6: 52_003_000,
      lngE6: 4_003_000,
      level: 3,
      health: 0,
      resCount: 0,
      isPlaceholder: false,
    },
    {
      guid: 'outside',
      title: 'Outside',
      team: 'M',
      latE6: 53_000_000,
      lngE6: 5_000_000,
      level: 4,
      health: 100,
      resCount: 8,
      isPlaceholder: false,
    },
  ],
  links: [
    {
      guid: 'link-1',
      team: 'E',
      oGuid: 'enl-8',
      oLatE6: 52_000_000,
      oLngE6: 4_000_000,
      dGuid: 'res-5',
      dLatE6: 52_001_000,
      dLngE6: 4_001_000,
    },
  ],
  fields: [
    {
      guid: 'field-1',
      team: 'E',
      points: [
        {guid: 'enl-8', latE6: 52_000_000, lngE6: 4_000_000},
        {guid: 'res-5', latE6: 52_001_000, lngE6: 4_001_000},
        {guid: 'placeholder', latE6: 52_002_000, lngE6: 4_002_000},
      ],
    },
  ],
};

const bounds = {south: 51.9, west: 3.9, north: 52.1, east: 4.1};

describe('portal analysis', () => {
  it('counts visible portals by team, level, history, and feature flags', () => {
    const analysis = getIitcPortalAnalysis(entities, bounds, {
      hasPortals: false,
      getKeyCount: (guid) => guid === 'res-5' ? 2 : 0,
    });

    expect(analysis.portalcounts.total).toBe(4);
    expect(analysis.portalcounts.real).toBe(3);
    expect(analysis.portalcounts.placeholders).toBe(1);
    expect(analysis.portalcounts.teams).toMatchObject({E: 1, R: 2, M: 0, N: 1});
    expect(analysis.portalcounts.levels[8].teams.E).toBe(1);
    expect(analysis.portalcounts.levels[0].teams.R).toBe(1);
    expect(analysis.portalcounts.levels[0].teams.N).toBe(1);
    expect(analysis.portalcounts.levels[3].teams.N).toBe(0);
    expect(analysis.portalcounts.history).toEqual({visited: 2, captured: 1, scoutControlled: 1});
    expect(analysis.portalcounts.ornaments).toBe(1);
    expect(analysis.portalcounts.artifacts).toBe(1);
    expect(analysis.portalcounts.missions).toBe(1);
    expect(analysis.portalcounts.withKeys).toBe(1);
    expect(analysis.portalcounts.inaccurateAtLinkLevel).toBe(true);
  });

  it('builds a portals list compatible with IITC visible portal columns', () => {
    const analysis = getIitcPortalAnalysis(entities, bounds, {getKeyCount: (guid) => guid === 'res-5' ? 2 : 0});

    expect(analysis.portalslist.map((portal) => portal.guid)).toEqual(['enl-8', 'res-5', 'neutral']);
    expect(analysis.portalslist[0]).toMatchObject({
      title: 'ENL Eight',
      level: 8,
      health: 90,
      resCount: 8,
      links: {in: 0, out: 1, count: 1},
      fields: 1,
      ornaments: 1,
      artifacts: 1,
    });
    expect(analysis.portalslist[1]).toMatchObject({
      links: {in: 1, out: 0, count: 1},
      keyCount: 2,
      mission: true,
    });
    expect(analysis.portalslist[2]).toMatchObject({
      team: 'N',
      level: 0,
      health: null,
    });
  });

  it('computes localized scoreboard metrics for visible entities', () => {
    const analysis = getIitcPortalAnalysis(entities, bounds);

    expect(analysis.scoreboard.teams.E).toMatchObject({
      total: 1,
      placeholders: 0,
      avgLevel: 8,
      avgHealth: 90,
      level8: 1,
      maxLevel: 8,
      links: 1,
      fields: 1,
    });
    expect(analysis.scoreboard.teams.R).toMatchObject({
      total: 1,
      placeholders: 1,
      avgLevel: 5,
      avgHealth: 50,
      links: 0,
      fields: 0,
    });
  });

  it('uses IITC portals-list AP math', () => {
    expect(getIitcPortalsListApGain(6, 2, 1)).toEqual({
      friendlyAp: 500,
      enemyAp: 3499,
      destroyAp: 1574,
      destroyResoAp: 450,
      captureAp: 1925,
    });
  });
});
