import type {Artifact, Field, Link, Portal} from './store';
import {isPortalHealthBucketVisible} from './portal-display';
import {matchesPortalHistoryFilters, type HistoryFilterState} from './portal-history';

export interface TeamVisibilityFilters {
  showResistance: boolean;
  showEnlightened: boolean;
  showMachina: boolean;
  showUnclaimedPortals: boolean;
}

export interface PortalVisibilityFilters extends TeamVisibilityFilters {
  showLevel: Record<number, boolean>;
  showHealth: Record<number, boolean>;
  showVisited: HistoryFilterState;
  showCaptured: HistoryFilterState;
  showScanned: HistoryFilterState;
}

export function isTeamVisible(team: string, filters: TeamVisibilityFilters): boolean {
  if (team === 'N') return filters.showUnclaimedPortals;
  if (team === 'M') return filters.showMachina;
  if (team === 'R') return filters.showResistance;
  if (team === 'E') return filters.showEnlightened;
  return true;
}

export function isPortalVisibleForDisplay(
  portal: Portal,
  filters: PortalVisibilityFilters,
  options: {selectedPortalId?: string | null} = {},
): boolean {
  if (options.selectedPortalId && portal.id === options.selectedPortalId) return true;
  if (!isTeamVisible(portal.team, filters)) return false;
  if (portal.level !== undefined && !filters.showLevel[portal.level]) return false;
  if (!isPortalHealthBucketVisible(portal.health, filters.showHealth)) return false;
  return matchesPortalHistoryFilters(portal, {
    showVisited: filters.showVisited,
    showCaptured: filters.showCaptured,
    showScanned: filters.showScanned,
  });
}

export function isLinkVisibleForDisplay(link: Link, filters: TeamVisibilityFilters & {showLinks: boolean}): boolean {
  return filters.showLinks && isTeamVisible(link.team, filters);
}

export function isFieldVisibleForDisplay(field: Field, filters: TeamVisibilityFilters & {showFields: boolean}): boolean {
  return filters.showFields && isTeamVisible(field.team, filters);
}

export function shouldRenderArtifactFeature(
  artifact: Artifact | null | undefined,
  portal: Portal | null | undefined,
  visible: boolean,
): artifact is Artifact {
  return visible && !!artifact && !!portal;
}

export function getVisiblePortalOrnaments(
  portal: Portal,
  mockOrnaments: Record<string, string[]> = {},
  visible = true,
): string[] {
  if (!visible) return [];
  return [...(portal.ornaments || []), ...(mockOrnaments[portal.id] || [])];
}
