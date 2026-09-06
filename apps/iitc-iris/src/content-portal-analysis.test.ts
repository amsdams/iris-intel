import { describe, expect, it } from 'vitest';
import { IitcPortalsListEntry } from '@iris/iitc-core';
import {
  filterPortalsList,
  formatPortalAnalysisPercent,
  formatTeamClass,
  formatTeamShortLabel,
  getPortalCountsBars,
  getPortalCountsPieSegments,
  getScoreboardTeamLabel,
  sortPortalsList,
  summarizePortalsList,
} from './content-portal-analysis';

function mockEntry(overrides: Partial<IitcPortalsListEntry> = {}): IitcPortalsListEntry {
  return {
    guid: 'portal-1',
    title: 'Alpha Portal',
    team: 'R',
    latE6: 52373080,
    lngE6: 4892453,
    level: 5,
    health: 80,
    resCount: 8,
    links: {in: 2, out: 3, count: 5},
    fields: 2,
    ap: {friendlyAp: 0, enemyAp: 3000, destroyAp: 2000, destroyResoAp: 600, captureAp: 1000},
    history: {visited: true, captured: false, scoutControlled: true},
    ornaments: 0,
    artifacts: 0,
    keyCount: 3,
    mission: false,
    ...overrides,
  };
}

describe('content-portal-analysis', () => {
  it('formats team classes and short labels correctly', () => {
    expect(formatTeamShortLabel('R')).toBe('RES');
    expect(formatTeamShortLabel('E')).toBe('ENL');
    expect(formatTeamShortLabel('M')).toBe('MAC');
    expect(formatTeamShortLabel('N')).toBe('NEU');

    expect(formatTeamClass('R')).toBe('iitc-iris-team-res');
    expect(formatTeamClass('E')).toBe('iitc-iris-team-enl');
    expect(formatTeamClass('M')).toBe('iitc-iris-team-machina');
    expect(formatTeamClass('N')).toBe('iitc-iris-team-neutral');
  });

  it('filters portal list by team, level, and text', () => {
    const list: IitcPortalsListEntry[] = [
      mockEntry({guid: 'p1', title: 'Dam Square', team: 'R', level: 8}),
      mockEntry({guid: 'p2', title: 'Central Station', team: 'E', level: 5}),
      mockEntry({guid: 'p3', title: 'Vondelpark Gate', team: 'R', level: 5}),
    ];

    expect(filterPortalsList(list, 'all', 'all', '')).toHaveLength(3);
    expect(filterPortalsList(list, 'R', 'all', '')).toHaveLength(2);
    expect(filterPortalsList(list, 'all', '5', '')).toHaveLength(2);
    expect(filterPortalsList(list, 'all', 'all', 'square')).toHaveLength(1);
    expect(filterPortalsList(list, 'R', '5', 'vondel')).toHaveLength(1);
  });

  it('sorts portal list by specified fields and order', () => {
    const list: IitcPortalsListEntry[] = [
      mockEntry({guid: 'p1', title: 'Zebra', level: 3}),
      mockEntry({guid: 'p2', title: 'Apple', level: 8}),
      mockEntry({guid: 'p3', title: 'Mango', level: 5}),
    ];

    const sortedByLevelDesc = sortPortalsList(list, 'level', -1);
    expect(sortedByLevelDesc.map((entry) => entry.level)).toEqual([8, 5, 3]);

    const sortedByTitleAsc = sortPortalsList(list, 'title', 1);
    expect(sortedByTitleAsc.map((entry) => entry.title)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('summarizes portal list counts and history flags', () => {
    const list: IitcPortalsListEntry[] = [
      mockEntry({guid: 'p1', team: 'R', links: {in: 1, out: 1, count: 2}, fields: 1, keyCount: 5, history: {visited: true, captured: true, scoutControlled: false}}),
      mockEntry({guid: 'p2', team: 'E', links: {in: 0, out: 1, count: 1}, fields: 0, keyCount: 2, history: {visited: true, captured: false, scoutControlled: true}}),
    ];

    const summary = summarizePortalsList(list);
    expect(summary.portals).toBe(2);
    expect(summary.links).toBe(3);
    expect(summary.fields).toBe(1);
    expect(summary.keys).toBe(7);
    expect(summary.teams.R).toBe(1);
    expect(summary.teams.E).toBe(1);
    expect(summary.history.visited).toBe(2);
    expect(summary.history.captured).toBe(1);
    expect(summary.history.scoutControlled).toBe(1);
  });

  it('computes portal counts bars and pie segments', () => {
    const levels = [
      {level: 0, count: 2, teams: {E: 1, R: 1, N: 0, M: 0}},
      {level: 8, count: 8, teams: {E: 4, R: 4, N: 0, M: 0}},
    ];

    const bars = getPortalCountsBars(levels);
    expect(bars).toHaveLength(4);
    expect(bars[0].id).toBe('all');
    expect(bars[1].id).toBe('R');

    const pieSegments = getPortalCountsPieSegments({R: 5, E: 5, M: 0, N: 0}, 10);
    expect(pieSegments).toHaveLength(2);
    expect(pieSegments[0].team).toBe('R');
    expect(pieSegments[0].label).toBe('50%');
  });

  it('formats percentages and scoreboard team labels', () => {
    expect(formatPortalAnalysisPercent(25, 100)).toBe('25%');
    expect(formatPortalAnalysisPercent(0, 0)).toBe('0%');
    expect(getScoreboardTeamLabel('E')).toBe('Enlightened');
    expect(getScoreboardTeamLabel('R')).toBe('Resistance');
    expect(getScoreboardTeamLabel('M')).toBe('Machina');
  });
});
