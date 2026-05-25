import type {Link, Portal} from './store';
import {PortalDetailsParser} from './parsers/PortalDetailsParser';
import type {PortalDetailsData} from './parsers/intel-types';

export interface ParsePortalDetailsForStoreOptions {
  onError?: (error: unknown) => void;
}

export interface MergePortalDetailsResult {
  parsed: Partial<Portal>;
  merged: Portal;
  changed: boolean;
  teamChanged: boolean;
}

export function countPortalLinks(links: Iterable<Link>, portalId: string): number {
  if (!portalId) return 0;

  let count = 0;
  for (const link of links) {
    if (link.fromPortalId === portalId || link.toPortalId === portalId) {
      count += 1;
    }
  }

  return count;
}

export function parsePortalDetailsForStore(
  data: PortalDetailsData,
  params: {guid?: string},
  links: Iterable<Link>,
  options?: ParsePortalDetailsForStoreOptions,
): Partial<Portal> | null {
  const guid = params.guid || '';
  return PortalDetailsParser.parse(data, params, countPortalLinks(links, guid), options);
}

function shallowEqualPortal(left: Portal, right: Portal): boolean {
  if (left === right) return true;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)] as (keyof Portal)[]);
  for (const key of keys) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

export function mergePortalDetailsForStore(
  data: PortalDetailsData,
  params: {guid?: string},
  existingPortals: Record<string, Portal>,
  links: Iterable<Link>,
  options?: ParsePortalDetailsForStoreOptions,
): MergePortalDetailsResult | null {
  const parsed = parsePortalDetailsForStore(data, params, links, options);
  if (!parsed?.id) return null;

  const existing = existingPortals[parsed.id];
  if (!existing) {
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      typeof parsed.team !== 'string'
    ) {
      return null;
    }
    return {
      parsed,
      merged: parsed as Portal,
      changed: true,
      teamChanged: false,
    };
  }

  const merged: Portal = {
    ...existing,
    ...parsed,
    ornaments: parsed.ornaments ?? existing.ornaments,
  };

  return {
    parsed,
    merged,
    changed: !shallowEqualPortal(existing, merged),
    teamChanged: parsed.team !== undefined && parsed.team !== existing.team,
  };
}
