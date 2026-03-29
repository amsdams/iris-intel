import { useStore } from '@iris/core';
import { PortalDetailsData } from './types';
import { parsePortalDetails } from './parser';

export function handlePortalDetails(data: PortalDetailsData, params: { guid?: string }): void {
  const portal = parsePortalDetails(data, params);
  if (portal) {
    useStore.getState().updatePortals([portal]);
  }
}
