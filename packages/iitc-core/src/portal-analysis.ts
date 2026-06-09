export type IitcPortalAnalysisTeam = 'E' | 'R' | 'N' | 'M';

export interface IitcPortalAnalysisBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface IitcPortalAnalysisPortal {
  guid: string;
  title?: string;
  team: IitcPortalAnalysisTeam;
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  resCount?: number;
  mission?: boolean;
  mission50plus?: boolean;
  ornaments?: unknown[];
  artifacts?: unknown[];
  history?: {
    visited: boolean;
    captured: boolean;
    scoutControlled: boolean;
  };
  isPlaceholder: boolean;
}

export interface IitcPortalAnalysisLink {
  guid: string;
  team: IitcPortalAnalysisTeam;
  oGuid?: string;
  oLatE6: number;
  oLngE6: number;
  dGuid?: string;
  dLatE6: number;
  dLngE6: number;
}

export interface IitcPortalAnalysisField {
  guid: string;
  team: IitcPortalAnalysisTeam;
  points: {guid?: string; latE6: number; lngE6: number}[];
}

export interface IitcPortalAnalysisEntities {
  portals: IitcPortalAnalysisPortal[];
  links: IitcPortalAnalysisLink[];
  fields: IitcPortalAnalysisField[];
}

export interface IitcPortalsListAp {
  friendlyAp: number;
  enemyAp: number;
  destroyAp: number;
  destroyResoAp: number;
  captureAp: number;
}

export interface IitcPortalsListEntry {
  guid: string;
  title: string;
  team: IitcPortalAnalysisTeam;
  latE6: number;
  lngE6: number;
  level: number;
  health: number | null;
  resCount: number;
  links: {
    in: number;
    out: number;
    count: number;
  };
  fields: number;
  ap: IitcPortalsListAp;
  history: {
    visited: boolean;
    captured: boolean;
    scoutControlled: boolean;
  };
  ornaments: number;
  artifacts: number;
  keyCount?: number;
  mission: boolean;
}

export interface IitcPortalCountsLevel {
  level: number;
  count: number;
  teams: Record<IitcPortalAnalysisTeam, number>;
}

export interface IitcPortalCounts {
  total: number;
  real: number;
  placeholders: number;
  teams: Record<IitcPortalAnalysisTeam, number>;
  levels: IitcPortalCountsLevel[];
  history: {
    visited: number;
    captured: number;
    scoutControlled: number;
  };
  ornaments: number;
  artifacts: number;
  missions: number;
  withKeys: number;
  inaccurateAtLinkLevel: boolean;
}

export interface IitcScoreboardTeam {
  total: number;
  placeholders: number;
  avgLevel: number | null;
  avgHealth: number | null;
  level8: number;
  maxLevel: number | null;
  links: number;
  fields: number;
}

export interface IitcScoreboard {
  teams: Record<Exclude<IitcPortalAnalysisTeam, 'N'>, IitcScoreboardTeam>;
}

const DESTROY_RESONATOR = 75;
const DESTROY_LINK = 187;
const DESTROY_FIELD = 750;
const CAPTURE_PORTAL = 675;
const DEPLOY_RESONATOR = 125;
const COMPLETION_BONUS = 250;

const SCOREBOARD_TEAMS: Exclude<IitcPortalAnalysisTeam, 'N'>[] = ['E', 'R', 'M'];

function emptyTeamCounts(): Record<IitcPortalAnalysisTeam, number> {
  return {E: 0, R: 0, N: 0, M: 0};
}

function emptyScoreboardTeam(): IitcScoreboardTeam {
  return {
    total: 0,
    placeholders: 0,
    avgLevel: null,
    avgHealth: null,
    level8: 0,
    maxLevel: null,
    links: 0,
    fields: 0,
  };
}

export function isIitcPortalAnalysisLatLngInBounds(latE6: number, lngE6: number, bounds: IitcPortalAnalysisBounds): boolean {
  const lat = latE6 / 1e6;
  const lng = lngE6 / 1e6;
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

export function getIitcPortalsListApGain(resCount: number, linkCount: number, fieldCount: number): IitcPortalsListAp {
  let deployAp = (8 - resCount) * DEPLOY_RESONATOR;
  if (resCount === 0) deployAp += CAPTURE_PORTAL;
  if (resCount !== 8) deployAp += COMPLETION_BONUS;

  const destroyResoAp = resCount * DESTROY_RESONATOR;
  const destroyLinkAp = linkCount * DESTROY_LINK;
  const destroyFieldAp = fieldCount * DESTROY_FIELD;
  const captureAp = CAPTURE_PORTAL + 8 * DEPLOY_RESONATOR + COMPLETION_BONUS;
  const destroyAp = destroyResoAp + destroyLinkAp + destroyFieldAp;

  return {
    friendlyAp: deployAp,
    enemyAp: destroyAp + captureAp,
    destroyAp,
    destroyResoAp,
    captureAp,
  };
}

export function getIitcPortalsInBounds(entities: IitcPortalAnalysisEntities, bounds: IitcPortalAnalysisBounds): IitcPortalAnalysisPortal[] {
  return entities.portals.filter((portal) => isIitcPortalAnalysisLatLngInBounds(portal.latE6, portal.lngE6, bounds));
}

function getIitcLinksInBounds(entities: IitcPortalAnalysisEntities, bounds: IitcPortalAnalysisBounds): IitcPortalAnalysisLink[] {
  return entities.links.filter((link) =>
    isIitcPortalAnalysisLatLngInBounds(link.oLatE6, link.oLngE6, bounds) ||
    isIitcPortalAnalysisLatLngInBounds(link.dLatE6, link.dLngE6, bounds)
  );
}

function getIitcFieldsInBounds(entities: IitcPortalAnalysisEntities, bounds: IitcPortalAnalysisBounds): IitcPortalAnalysisField[] {
  return entities.fields.filter((field) =>
    field.points.some((point) => isIitcPortalAnalysisLatLngInBounds(point.latE6, point.lngE6, bounds))
  );
}

export function getIitcPortalCounts(
  entities: IitcPortalAnalysisEntities,
  bounds: IitcPortalAnalysisBounds,
  options: {hasPortals?: boolean; getKeyCount?: (guid: string) => number | undefined} = {},
): IitcPortalCounts {
  const levels = Array.from({length: 9}, (_, level): IitcPortalCountsLevel => ({
    level,
    count: 0,
    teams: emptyTeamCounts(),
  }));
  const counts: IitcPortalCounts = {
    total: 0,
    real: 0,
    placeholders: 0,
    teams: emptyTeamCounts(),
    levels,
    history: {
      visited: 0,
      captured: 0,
      scoutControlled: 0,
    },
    ornaments: 0,
    artifacts: 0,
    missions: 0,
    withKeys: 0,
    inaccurateAtLinkLevel: options.hasPortals === false,
  };

  for (const portal of getIitcPortalsInBounds(entities, bounds)) {
    const level = portal.isPlaceholder ? 0 : Math.max(0, Math.min(8, portal.level ?? 0));
    counts.total += 1;
    counts.teams[portal.team] += 1;
    counts.levels[level].count += 1;
    counts.levels[level].teams[portal.team] += 1;
    if (portal.isPlaceholder) counts.placeholders += 1;
    else counts.real += 1;
    if (portal.history?.visited) counts.history.visited += 1;
    if (portal.history?.captured) counts.history.captured += 1;
    if (portal.history?.scoutControlled) counts.history.scoutControlled += 1;
    if ((portal.ornaments?.length ?? 0) > 0) counts.ornaments += 1;
    if ((portal.artifacts?.length ?? 0) > 0) counts.artifacts += 1;
    if (portal.mission || portal.mission50plus) counts.missions += 1;
    if ((options.getKeyCount?.(portal.guid) ?? 0) > 0) counts.withKeys += 1;
  }

  return counts;
}

export function getIitcPortalsList(
  entities: IitcPortalAnalysisEntities,
  bounds: IitcPortalAnalysisBounds,
  options: {getKeyCount?: (guid: string) => number | undefined} = {},
): IitcPortalsListEntry[] {
  const links = entities.links;
  const fields = entities.fields;
  return getIitcPortalsInBounds(entities, bounds)
    .filter((portal) => !portal.isPlaceholder && portal.title !== undefined)
    .map((portal) => {
      const incoming = links.filter((link) => link.dGuid === portal.guid).length;
      const outgoing = links.filter((link) => link.oGuid === portal.guid).length;
      const fieldCount = fields.filter((field) => field.points.some((point) => point.guid === portal.guid)).length;
      const resCount = portal.resCount ?? 0;
      return {
        guid: portal.guid,
        title: portal.title ?? portal.guid,
        team: portal.team,
        latE6: portal.latE6,
        lngE6: portal.lngE6,
        level: portal.level ?? 0,
        health: portal.team === 'N' ? null : portal.health ?? null,
        resCount,
        links: {
          in: incoming,
          out: outgoing,
          count: incoming + outgoing,
        },
        fields: fieldCount,
        ap: getIitcPortalsListApGain(resCount, incoming + outgoing, fieldCount),
        history: {
          visited: portal.history?.visited ?? false,
          captured: portal.history?.captured ?? false,
          scoutControlled: portal.history?.scoutControlled ?? false,
        },
        ornaments: portal.ornaments?.length ?? 0,
        artifacts: portal.artifacts?.length ?? 0,
        keyCount: options.getKeyCount?.(portal.guid),
        mission: Boolean(portal.mission || portal.mission50plus),
      };
    });
}

export function getIitcScoreboard(entities: IitcPortalAnalysisEntities, bounds: IitcPortalAnalysisBounds): IitcScoreboard {
  const teams: IitcScoreboard['teams'] = {
    E: emptyScoreboardTeam(),
    R: emptyScoreboardTeam(),
    M: emptyScoreboardTeam(),
  };
  const levelSums: Record<Exclude<IitcPortalAnalysisTeam, 'N'>, number> = {E: 0, R: 0, M: 0};
  const healthSums: Record<Exclude<IitcPortalAnalysisTeam, 'N'>, number> = {E: 0, R: 0, M: 0};

  for (const portal of getIitcPortalsInBounds(entities, bounds)) {
    if (portal.team === 'N') continue;
    const team = teams[portal.team];
    if (portal.isPlaceholder || portal.title === undefined) {
      team.placeholders += 1;
      continue;
    }
    const level = portal.level ?? 0;
    const health = portal.health ?? 0;
    team.total += 1;
    levelSums[portal.team] += level;
    healthSums[portal.team] += health;
    if (level === 8) team.level8 += 1;
    team.maxLevel = Math.max(team.maxLevel ?? 0, level);
  }

  for (const team of SCOREBOARD_TEAMS) {
    if (teams[team].total > 0) {
      teams[team].avgLevel = Number((levelSums[team] / teams[team].total).toFixed(1));
      teams[team].avgHealth = Number((healthSums[team] / teams[team].total).toFixed(1));
    }
  }

  for (const link of getIitcLinksInBounds(entities, bounds)) {
    if (link.team !== 'N') teams[link.team].links += 1;
  }
  for (const field of getIitcFieldsInBounds(entities, bounds)) {
    if (field.team !== 'N') teams[field.team].fields += 1;
  }

  return {teams};
}

export function getIitcPortalAnalysis(
  entities: IitcPortalAnalysisEntities,
  bounds: IitcPortalAnalysisBounds,
  options: {hasPortals?: boolean; getKeyCount?: (guid: string) => number | undefined} = {},
): {portalcounts: IitcPortalCounts; portalslist: IitcPortalsListEntry[]; scoreboard: IitcScoreboard} {
  return {
    portalcounts: getIitcPortalCounts(entities, bounds, options),
    portalslist: getIitcPortalsList(entities, bounds, options),
    scoreboard: getIitcScoreboard(entities, bounds),
  };
}
