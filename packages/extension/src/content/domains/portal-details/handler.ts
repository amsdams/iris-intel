import { useStore } from '@iris/core';
import { PortalDetailsData } from './types';
import { parsePortalDetails } from './parser';

export function handlePortalDetails(data: PortalDetailsData, params: { guid?: string }): void {
  const store = useStore.getState();
  const guid = params.guid || '';
  const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
  const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;

  const portal = parsePortalDetails(data, params, linksIn + linksOut);
  if (portal) {
    store.updatePortals([portal]);
  }
}
