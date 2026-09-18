import {describe, expect, it} from 'vitest';
import {filterPortalsList, sortPortalsList, summarizePortalsList} from './content-portal-analysis';
import type {IitcPortalsListEntry} from '@iris/iitc-core';

const SAMPLE_ENTRIES: IitcPortalsListEntry[] = [
  {
    guid: 'p1',
    title: 'Alpha Portal',
    team: 'E',
    level: 8,
    health: 100,
    resCount: 8,
    links: {in: 2, out: 2, count: 4},
    fields: 2,
    ap: {enemyAp: 0, friendlyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
    history: {visited: false, captured: false, scoutControlled: false},
    latE6: 52300000,
    lngE6: 4900000,
    ornaments: 0,
    artifacts: 0,
    mission: false,
  },
  {
    guid: 'p2',
    title: 'Beta Portal',
    team: 'R',
    level: 5,
    health: 60,
    resCount: 5,
    links: {in: 1, out: 0, count: 1},
    fields: 0,
    ap: {enemyAp: 1200, friendlyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
    history: {visited: false, captured: false, scoutControlled: false},
    latE6: 52310000,
    lngE6: 4910000,
    ornaments: 0,
    artifacts: 0,
    mission: false,
  },
];

describe('content-portal-analysis-workflow', () => {
  it('filters portal list by team and level correctly', () => {
    const filteredEnlightened = filterPortalsList(SAMPLE_ENTRIES, 'E', 'all', '');
    expect(filteredEnlightened.length).toBe(1);
    expect(filteredEnlightened[0].guid).toBe('p1');

    const filteredLevel8 = filterPortalsList(SAMPLE_ENTRIES, 'all', '8', '');
    expect(filteredLevel8.length).toBe(1);
    expect(filteredLevel8[0].guid).toBe('p1');
  });

  it('sorts portal list by field and order', () => {
    const sortedDescending = sortPortalsList(SAMPLE_ENTRIES, 'level', -1);
    expect(sortedDescending[0].guid).toBe('p1');

    const sortedAscending = sortPortalsList(SAMPLE_ENTRIES, 'level', 1);
    expect(sortedAscending[0].guid).toBe('p2');
  });

  it('summarizes portal list entries correctly', () => {
    const summary = summarizePortalsList(SAMPLE_ENTRIES);
    expect(summary.portals).toBe(2);
    expect(summary.teams.E).toBe(1);
    expect(summary.teams.R).toBe(1);
  });
});
