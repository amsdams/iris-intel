import type {IitcTeam} from './types';

export interface IitcPortalMod {
  owner: string;
  name: string;
  rarity: string;
  stats: Record<string, string | number>;
}

export interface IitcPortalResonator {
  owner: string;
  level: number;
  energy: number;
}

export interface IitcPortalMitigation {
  total: number;
  shields: number;
  links: number;
  linkDefenseBoost: number;
  excess: number;
}

export interface IitcPortalDetails {
  guid: string;
  team: IitcTeam;
  latE6: number;
  lngE6: number;
  level: number;
  health: number;
  resCount: number;
  image: string;
  title: string;
  owner: string;
  mods: IitcPortalMod[];
  resonators: IitcPortalResonator[];
  history: number;
  visited: boolean;
  captured: boolean;
  scoutControlled: boolean;
  hasMissionsStartingHere: boolean;
  mitigation: IitcPortalMitigation;
}

export interface IitcPortalDetailsResponse {
  error?: string;
  result?: unknown;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asTeam(value: unknown): IitcTeam {
  if (value === 'E' || value === 'R' || value === 'N' || value === 'M') return value;
  return 'N';
}

function parseModStats(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const stats: Record<string, string | number> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue !== 'string') continue;
    const parsed = Number(rawValue);
    stats[key] = Number.isFinite(parsed) ? parsed : rawValue;
  }
  return stats;
}

function parseMods(value: unknown): IitcPortalMod[] {
  if (!Array.isArray(value)) return [];
  return value.filter(Array.isArray).map((mod) => ({
    owner: asString(mod[0]),
    name: asString(mod[1]),
    rarity: asString(mod[2]),
    stats: parseModStats(mod[3]),
  }));
}

function parseResonators(value: unknown): IitcPortalResonator[] {
  if (!Array.isArray(value)) return [];
  return value.filter(Array.isArray).map((resonator) => ({
    owner: asString(resonator[0]),
    level: asNumber(resonator[1]),
    energy: asNumber(resonator[2]),
  }));
}

function getLinkDefenseBoost(mods: IitcPortalMod[]): number {
  let boost = 1;
  for (const mod of mods) {
    const value = mod.stats.LINK_DEFENSE_BOOST;
    if (typeof value === 'number') boost *= value / 1000;
  }
  return Math.round(10 * boost) / 10;
}

function getShieldMitigation(mods: IitcPortalMod[]): number {
  return mods.reduce((sum, mod) => {
    const value = mod.stats.MITIGATION;
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
}

export function getIitcPortalMitigation(mods: IitcPortalMod[], linkCount: number): IitcPortalMitigation {
  const shields = getShieldMitigation(mods);
  const linkDefenseBoost = getLinkDefenseBoost(mods);
  const links = Math.round((400 / 9) * Math.atan(linkCount / Math.E));
  const rawTotal = shields + links * linkDefenseBoost;
  const total = Math.min(95, rawTotal);
  return {
    total,
    shields,
    links,
    linkDefenseBoost,
    excess: Math.round(10 * (rawTotal - total)) / 10,
  };
}

export function parseIitcPortalDetailsResponse(
  response: IitcPortalDetailsResponse,
  guid: string,
  linkCount = 0,
): IitcPortalDetails | null {
  if (!Array.isArray(response.result)) return null;
  const details = response.result;
  const mods = parseMods(details[14]);
  const resonators = parseResonators(details[15]);
  const history = asNumber(details[18]);

  return {
    guid,
    team: asTeam(details[1]),
    latE6: Math.round(asNumber(details[2])),
    lngE6: Math.round(asNumber(details[3])),
    level: asNumber(details[4]),
    health: asNumber(details[5]),
    resCount: asNumber(details[6]),
    image: asString(details[7]),
    title: asString(details[8]),
    owner: asString(details[16]),
    mods,
    resonators,
    history,
    visited: Boolean(history & 1),
    captured: Boolean(history & 2),
    scoutControlled: Boolean(history & 4),
    hasMissionsStartingHere: Boolean(details[10]),
    mitigation: getIitcPortalMitigation(mods, linkCount),
  };
}
