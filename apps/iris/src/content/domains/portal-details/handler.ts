import { parsePortalDetailsForStore, PortalDetailsData, useStore } from '@iris/core';
import { reportDomainError } from '../report-domain-error';

export function handlePortalDetails(data: PortalDetailsData, params: { guid?: string }): void {
  const store = useStore.getState();
  const guid = params.guid || '';

  const portal = parsePortalDetailsForStore(data, params, Object.values(store.links), {
    onError: (error) => reportDomainError('portalDetails', error, `guid: ${guid || 'unknown'}`),
  });
  if (portal) {
    store.updatePortals([portal]);
  }
}
