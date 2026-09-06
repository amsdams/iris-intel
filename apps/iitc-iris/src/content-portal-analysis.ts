import {
  IitcPortalCountsLevel,
  IitcPortalAnalysisTeam,
  IitcPortalsListEntry,
  IitcScoreboardTeam,
} from '@iris/iitc-core';
import { formatInteger } from './ui-status';
import { getIitcLevelColor, IITC_TEAM_COLORS } from './iitc-colors';

export type PortalsListSortField = 'title' | 'level' | 'team' | 'health' | 'resCount' | 'links' | 'fields' | 'enemyAp' | 'keys';
export type PortalsListTeamFilter = 'all' | IitcPortalAnalysisTeam;
export type PortalsListLevelFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type SortOrder = 1 | -1;

export interface PortalCountsBarSegment {
  level: number;
  y: number;
  height: number;
}

export interface PortalCountsBar {
  id: string;
  label: string;
  color: string;
  levels: number[];
  segments: PortalCountsBarSegment[];
}

export interface PortalCountsPieSegment {
  team: IitcPortalAnalysisTeam;
  start: number;
  end: number;
  path: string;
  label: string;
  labelX: number;
  labelY: number;
}

export interface PortalCountsLevelRingSegment {
  team: IitcPortalAnalysisTeam;
  level: number;
  path: string;
}

export interface PortalAnalysisListSummary {
  portals: number;
  links: number;
  fields: number;
  enemyAp: number;
  keys: number;
  teams: Record<IitcPortalAnalysisTeam, number>;
  history: {
    visited: number;
    captured: number;
    scoutControlled: number;
  };
}

export const PORTAL_COUNTS_BAR_TOP = 20;
export const PORTAL_COUNTS_BAR_HEIGHT = 180;
export const PORTAL_COUNTS_BAR_WIDTH = 25;
export const PORTAL_COUNTS_BAR_PADDING = 5;
export const PORTAL_COUNTS_RADIUS_INNER = 70;
export const PORTAL_COUNTS_RADIUS_OUTER = 100;
export const PORTAL_COUNTS_BAR_COUNT = 4;
export const PORTAL_COUNTS_SVG_WIDTH = (PORTAL_COUNTS_BAR_COUNT + 1) * (PORTAL_COUNTS_BAR_WIDTH + PORTAL_COUNTS_BAR_PADDING) + 2 * PORTAL_COUNTS_RADIUS_OUTER;
export const PORTAL_COUNTS_SVG_HEIGHT = Math.max(PORTAL_COUNTS_BAR_HEIGHT, 2 * PORTAL_COUNTS_RADIUS_OUTER);
export const PORTAL_COUNTS_PIE_CENTER_X = (PORTAL_COUNTS_BAR_COUNT + 1) * (PORTAL_COUNTS_BAR_WIDTH + PORTAL_COUNTS_BAR_PADDING) + PORTAL_COUNTS_RADIUS_OUTER;
export const PORTAL_COUNTS_PIE_CENTER_Y = PORTAL_COUNTS_RADIUS_OUTER;
export const PORTAL_ANALYSIS_PLAYER_TEAMS = ['R', 'E', 'M'] as const;
export const PORTAL_ANALYSIS_PIE_TEAMS = ['R', 'E', 'M', 'N'] as const;

export function formatTeamShortLabel(team: IitcPortalAnalysisTeam): string {
  if (team === 'E') return 'ENL';
  if (team === 'R') return 'RES';
  if (team === 'M') return 'MAC';
  return 'NEU';
}

export function formatTeamClass(team: string): string {
  if (team === 'E') return 'iitc-iris-team-enl';
  if (team === 'R') return 'iitc-iris-team-res';
  if (team === 'M') return 'iitc-iris-team-machina';
  return 'iitc-iris-team-neutral';
}

export function getTeamColor(team: IitcPortalAnalysisTeam): string {
  return IITC_TEAM_COLORS[team];
}

export function getPortalCountsLevelColor(level: number): string {
  if (level === 0) return '#000000';
  return getIitcLevelColor(level) ?? '#9aa8b4';
}

export function formatPortalAnalysisValue(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${formatInteger(value)}${suffix}`;
}

export function formatPortalHistory(entry: IitcPortalsListEntry): string {
  if (entry.history.captured) return 'C';
  if (entry.history.visited) return 'V';
  return '-';
}

export function formatScoutControlled(entry: IitcPortalsListEntry): string {
  return entry.history.scoutControlled ? 'S' : '-';
}

export function formatPortalMission(entry: IitcPortalsListEntry): string {
  return entry.mission ? 'M' : '-';
}

export function getPortalsListSortValue(entry: IitcPortalsListEntry, field: PortalsListSortField): string | number {
  if (field === 'title') return entry.title.toLowerCase();
  if (field === 'level') return entry.level;
  if (field === 'team') return entry.team;
  if (field === 'health') return entry.health ?? -1;
  if (field === 'resCount') return entry.resCount;
  if (field === 'links') return entry.links.count;
  if (field === 'fields') return entry.fields;
  if (field === 'enemyAp') return entry.ap.enemyAp;
  return entry.keyCount ?? 0;
}

export function filterPortalsList(
  entries: IitcPortalsListEntry[],
  teamFilter: PortalsListTeamFilter,
  levelFilter: PortalsListLevelFilter,
  textFilter: string,
): IitcPortalsListEntry[] {
  const normalizedTextFilter = textFilter.trim().toLowerCase();
  return entries.filter((entry) => {
    if (teamFilter !== 'all' && entry.team !== teamFilter) return false;
    if (levelFilter !== 'all' && entry.level !== Number(levelFilter)) return false;
    return normalizedTextFilter.length === 0 || entry.title.toLowerCase().includes(normalizedTextFilter);
  });
}

export function sortPortalsList(entries: IitcPortalsListEntry[], sortBy: PortalsListSortField, sortOrder: SortOrder): IitcPortalsListEntry[] {
  return [...entries].sort((a, b) => {
    const aValue = getPortalsListSortValue(a, sortBy);
    const bValue = getPortalsListSortValue(b, sortBy);
    if (aValue < bValue) return -sortOrder;
    if (aValue > bValue) return sortOrder;
    return a.title.localeCompare(b.title) || a.guid.localeCompare(b.guid);
  });
}

export function summarizePortalsList(entries: IitcPortalsListEntry[]): PortalAnalysisListSummary {
  return entries.reduce<PortalAnalysisListSummary>((summary, entry) => {
    summary.portals += 1;
    summary.links += entry.links.count;
    summary.fields += entry.fields;
    summary.enemyAp += entry.ap.enemyAp;
    summary.keys += entry.keyCount ?? 0;
    summary.teams[entry.team] += 1;
    if (entry.history.visited) summary.history.visited += 1;
    if (entry.history.captured) summary.history.captured += 1;
    if (entry.history.scoutControlled) summary.history.scoutControlled += 1;
    return summary;
  }, {
    portals: 0,
    links: 0,
    fields: 0,
    enemyAp: 0,
    keys: 0,
    teams: {E: 0, R: 0, M: 0, N: 0},
    history: {
      visited: 0,
      captured: 0,
      scoutControlled: 0,
    },
  });
}

export function formatPortalAnalysisPercent(value: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function getPortalCountsBarSegments(levels: number[], chartHeight: number): PortalCountsBarSegment[] {
  const total = levels.reduce((sum, count) => sum + count, 0);
  let y = chartHeight;
  return levels.flatMap((count, level) => {
    if (count <= 0 || total <= 0) return [];
    const height = Math.max(1, (count / total) * chartHeight);
    y -= height;
    return [{level, y, height}];
  }).reverse();
}

export function getPortalCountsBars(levels: IitcPortalCountsLevel[]): PortalCountsBar[] {
  const allLevels = levels.map((level) => level.count);
  return [
    {id: 'all', label: 'All', color: '#ffffff', levels: allLevels, segments: getPortalCountsBarSegments(allLevels, PORTAL_COUNTS_BAR_HEIGHT)},
    ...PORTAL_ANALYSIS_PLAYER_TEAMS.map((team) => {
      const teamLevels = levels.map((level) => level.teams[team]);
      return {
        id: team,
        label: formatTeamShortLabel(team),
        color: getTeamColor(team),
        levels: teamLevels,
        segments: getPortalCountsBarSegments(teamLevels, PORTAL_COUNTS_BAR_HEIGHT),
      };
    }),
  ];
}

export function getPortalCountsPieSegments(teams: Record<IitcPortalAnalysisTeam, number>, total: number): PortalCountsPieSegment[] {
  let start = 0;
  return PORTAL_ANALYSIS_PIE_TEAMS.flatMap((team) => {
    const count = teams[team];
    if (count <= 0 || total <= 0) return [];
    const end = start + count / total;
    const labelAngle = 0.5 - (start + end) / 2;
    const segment = {
      team,
      start,
      end,
      path: createPortalCountsPiePath(start, end, PORTAL_COUNTS_RADIUS_INNER),
      label: `${Math.round((end - start) * 100)}%`,
      labelX: Math.sin(labelAngle * 2 * Math.PI) * PORTAL_COUNTS_RADIUS_INNER / 1.5,
      labelY: Math.cos(labelAngle * 2 * Math.PI) * PORTAL_COUNTS_RADIUS_INNER / 1.5,
    };
    start = end;
    return [segment];
  });
}

export function getPortalCountsLevelRingSegments(
  levels: PortalCountsPieSegment[],
  portalCountsLevels: IitcPortalCountsLevel[],
  total: number,
): PortalCountsLevelRingSegment[] {
  return levels.flatMap((teamSegment) => {
    let start = teamSegment.start;
    return portalCountsLevels.flatMap((levelData, level) => {
      const count = levelData.teams[teamSegment.team];
      if (count <= 0 || total <= 0) return [];
      const end = start + count / total;
      const segment = {
        team: teamSegment.team,
        level,
        path: createPortalCountsRingPath(start, end, PORTAL_COUNTS_RADIUS_OUTER, PORTAL_COUNTS_RADIUS_INNER),
      };
      start = end;
      return [segment];
    });
  });
}

export function createPortalCountsPiePath(startFraction: number, endFraction: number, radius: number): string {
  if (startFraction === endFraction) return '';
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  const startAngle = 0.5 - startFraction;
  const endAngle = 0.5 - endFraction;
  const p1x = Math.sin(startAngle * 2 * Math.PI) * radius;
  const p1y = Math.cos(startAngle * 2 * Math.PI) * radius;
  let p2x = Math.sin(endAngle * 2 * Math.PI) * radius;
  const p2y = Math.cos(endAngle * 2 * Math.PI) * radius;
  if (startFraction === 0 && endFraction === 1) {
    p2x -= 0.001;
  }
  return `M 0 0 L ${p1x.toFixed(2)} ${p1y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${p2x.toFixed(2)} ${p2y.toFixed(2)} Z`;
}

export function createPortalCountsRingPath(startFraction: number, endFraction: number, outerRadius: number, innerRadius: number): string {
  if (startFraction === endFraction) return '';
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  const startAngle = 0.5 - startFraction;
  const endAngle = 0.5 - endFraction;
  const o1x = Math.sin(startAngle * 2 * Math.PI) * outerRadius;
  const o1y = Math.cos(startAngle * 2 * Math.PI) * outerRadius;
  let o2x = Math.sin(endAngle * 2 * Math.PI) * outerRadius;
  const o2y = Math.cos(endAngle * 2 * Math.PI) * outerRadius;
  const i1x = Math.sin(startAngle * 2 * Math.PI) * innerRadius;
  const i1y = Math.cos(startAngle * 2 * Math.PI) * innerRadius;
  let i2x = Math.sin(endAngle * 2 * Math.PI) * innerRadius;
  const i2y = Math.cos(endAngle * 2 * Math.PI) * innerRadius;
  if (startFraction === 0 && endFraction === 1) {
    o2x -= 0.001;
    i2x -= 0.001;
  }
  return `M ${o1x.toFixed(2)} ${o1y.toFixed(2)} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${o2x.toFixed(2)} ${o2y.toFixed(2)} L ${i2x.toFixed(2)} ${i2y.toFixed(2)} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${i1x.toFixed(2)} ${i1y.toFixed(2)} Z`;
}

export function getScoreboardTeamLabel(team: Exclude<IitcPortalAnalysisTeam, 'N'>): string {
  if (team === 'E') return 'Enlightened';
  if (team === 'R') return 'Resistance';
  return 'Machina';
}

export function formatScoreboardAverage(value: number | null): string {
  return value === null ? '-' : value.toFixed(1);
}

export function formatScoreboardTotal(team: IitcScoreboardTeam): string {
  return team.placeholders > 0 ? `${formatInteger(team.total)} + ${formatInteger(team.placeholders)}` : formatInteger(team.total);
}

export const SCOREBOARD_ROWS: {label: string; format: (team: IitcScoreboardTeam) => string}[] = [
  {label: 'Portals', format: (team): string => formatScoreboardTotal(team)},
  {label: 'avg Level', format: (team): string => formatScoreboardAverage(team.avgLevel)},
  {label: 'avg Health', format: (team): string => formatScoreboardAverage(team.avgHealth)},
  {label: 'Level 8', format: (team): string => formatPortalAnalysisValue(team.level8)},
  {label: 'Max Level', format: (team): string => formatPortalAnalysisValue(team.maxLevel)},
  {label: 'Links', format: (team): string => formatPortalAnalysisValue(team.links)},
  {label: 'Fields', format: (team): string => formatPortalAnalysisValue(team.fields)},
];
