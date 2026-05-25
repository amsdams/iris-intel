import type {Link, Portal} from './store';
import {PortalDetailsParser} from './parsers/PortalDetailsParser';
import type {PortalDetailsData} from './parsers/intel-types';

export interface ParsePortalDetailsForStoreOptions {
  onError?: (error: unknown) => void;
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
