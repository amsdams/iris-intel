import { useStore, PortalDetailsParser, PortalDetailsData } from '@iris/core';

export function handlePortalDetails(data: PortalDetailsData, params: { guid?: string }): void {
  const store = useStore.getState();
  const guid = params.guid || '';
  const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
  const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;

  const portal = PortalDetailsParser.parse(data, params, linksIn + linksOut);
  if (portal) {
    store.updatePortals([portal]);
  }
}
