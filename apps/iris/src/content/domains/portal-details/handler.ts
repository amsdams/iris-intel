import { mergePortalDetailsForStore, PortalDetailsData, useStore } from '@iris/core';
import { reportDomainError } from '../report-domain-error';

export function handlePortalDetails(data: PortalDetailsData, params: { guid?: string }): void {
  const store = useStore.getState();
  const guid = params.guid || '';

  const result = mergePortalDetailsForStore(data, params, store.portals, Object.values(store.links), {
    onError: (error) => reportDomainError('portalDetails', error, `guid: ${guid || 'unknown'}`),
  });
  if (result) {
    store.updatePortals([result.merged]);
  }
}
