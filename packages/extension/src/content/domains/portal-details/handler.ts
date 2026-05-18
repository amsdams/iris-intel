import { useStore, PortalDetailsParser, PortalDetailsData } from '@iris/core';
import { reportDomainError } from '../report-domain-error';

export function handlePortalDetails(data: PortalDetailsData, params: { guid?: string }): void {
  const store = useStore.getState();
  const guid = params.guid || '';
  const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
  const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;

  const portal = PortalDetailsParser.parse(data, params, linksIn + linksOut, {
    onError: (error) => reportDomainError('portalDetails', error, `guid: ${guid || 'unknown'}`),
  });
  if (portal) {
    store.updatePortals([portal]);
  }
}
