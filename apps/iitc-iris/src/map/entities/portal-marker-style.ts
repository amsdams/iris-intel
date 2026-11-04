import type {IitcIrisRenderPolicy, IitcIrisRenderPortal} from '../../messages';
import {IITC_LEVEL_COLORS, IITC_TEAM_COLORS} from '../../iitc-colors';

type PortalAppearance = Pick<IitcIrisRenderPortal, 'level' | 'health' | 'team' | 'isPlaceholder'>;
type FillPolicy = Pick<IitcIrisRenderPolicy, 'levelFill' | 'healthFill'>;
export interface PortalMarkerStyle {
  radius: number;
  color: string;
  fillColor: string;
  fillOpacity: number;
  opacity: number;
  weight: number;
  dashArray?: string;
}

const TEAM_COLORS = IITC_TEAM_COLORS;
const getTeamColor = (team: keyof typeof TEAM_COLORS): string => TEAM_COLORS[team] ?? TEAM_COLORS.N;
const HEALTH_COLORS = {
  cond85: '#ffff00',
  cond70: '#ffa500',
  cond60: '#ff8c00',
  cond45: '#ff0000',
  cond30: '#ff0000',
  cond15: '#ff0000',
  cond0: '#ff00ff',
} as const;
const LEVEL_COLORS = IITC_LEVEL_COLORS;
const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4] as const;
const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11] as const;

export function getPortalMarkerScale(zoom: number): number {
  return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
}

export function getPortalLevel(level: number | undefined, isPlaceholder: boolean): number {
  if (isPlaceholder) return 0;
  return Math.max(0, Math.min(8, Math.floor(level ?? 0)));
}

export function getPortalRadius(level: number | undefined, isPlaceholder: boolean, zoom: number): number {
  const scale = getPortalMarkerScale(zoom);
  return LEVEL_TO_RADIUS[getPortalLevel(level, isPlaceholder)] * scale;
}

function getPortalWeight(level: number | undefined, isPlaceholder: boolean, zoom: number): number {
  if (isPlaceholder) return 1;
  const scale = getPortalMarkerScale(zoom);
  return LEVEL_TO_WEIGHT[getPortalLevel(level, isPlaceholder)] * Math.sqrt(scale);
}

function getPortalFillOpacity(renderPolicy: FillPolicy, _health: number | undefined, _level: number | undefined, _team: keyof typeof TEAM_COLORS, _isPlaceholder: boolean): number {
  if (getPortalHealthFillColor(renderPolicy, _health, _team)) return getPortalHealthFillOpacity(_health ?? 100);
  if (getPortalLevelFillColor(renderPolicy, _level, _team, _isPlaceholder)) return 0.6;
  return 0.5;
}

function getPortalFillColor(renderPolicy: FillPolicy, team: keyof typeof TEAM_COLORS, level: number | undefined, isPlaceholder: boolean, health: number | undefined): string {
  const healthColor = getPortalHealthFillColor(renderPolicy, health, team);
  if (healthColor) return healthColor;
  const levelColor = getPortalLevelFillColor(renderPolicy, level, team, isPlaceholder);
  if (levelColor) return levelColor;
  return getTeamColor(team);
}

function getPortalLevelFillColor(renderPolicy: FillPolicy, level: number | undefined, team: keyof typeof TEAM_COLORS, isPlaceholder: boolean): string | null {
  if (!renderPolicy.levelFill || isPlaceholder || level === undefined) return null;
  return LEVEL_COLORS[getPortalLevel(level, false)] ?? null;
}

function getPortalHealthFillColor(renderPolicy: FillPolicy, health: number | undefined, team: keyof typeof TEAM_COLORS): string | null {
  if (!renderPolicy.healthFill || team === 'N' || health === undefined || health >= 100) return null;
  if (health > 85) return HEALTH_COLORS.cond85;
  if (health > 70) return HEALTH_COLORS.cond70;
  if (health > 60) return HEALTH_COLORS.cond60;
  if (health > 45) return HEALTH_COLORS.cond45;
  if (health > 30) return HEALTH_COLORS.cond30;
  if (health > 15) return HEALTH_COLORS.cond15;
  return HEALTH_COLORS.cond0;
}

function getPortalHealthFillOpacity(health: number): number {
  if (health > 85) return 0.5;
  if (health > 70) return 0.5;
  if (health > 60) return 0.5;
  if (health > 45) return 0.4;
  if (health > 30) return 0.6;
  if (health > 15) return 0.8;
  return 1;
}

/** Base appearance only: the renderer supplies zoom and applies highlighter overrides afterward. */
export function getPortalMarkerStyle(portal: PortalAppearance, renderPolicy: FillPolicy, zoom: number): PortalMarkerStyle {
  const color = getTeamColor(portal.team);
  return {
    radius: getPortalRadius(portal.level, portal.isPlaceholder, zoom),
    color,
    fillColor: renderPolicy.healthFill || renderPolicy.levelFill
      ? getPortalFillColor(renderPolicy, portal.team, portal.level, portal.isPlaceholder, portal.health)
      : getTeamColor(portal.team),
    fillOpacity: renderPolicy.healthFill || renderPolicy.levelFill
      ? getPortalFillOpacity(renderPolicy, portal.health, portal.level, portal.team, portal.isPlaceholder)
      : 0.5,
    opacity: portal.isPlaceholder ? 0.6 : 1,
    weight: getPortalWeight(portal.level, portal.isPlaceholder, zoom),
    dashArray: portal.isPlaceholder ? '1,2' : undefined,
  };
}
