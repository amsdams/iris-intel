import { useStore } from '@iris/core';
import { IntelMapData } from './types';
import { parseEntities } from './parser';

export function handleEntities(
  data: IntelMapData,
  hasInitialPosition: boolean,
  setHasInitialPosition: () => void,
): void {
  const { portals, links, fields, deletedGuids } = parseEntities(data);
  const store = useStore.getState();

  if (!hasInitialPosition && portals.length > 0) {
    setHasInitialPosition();
    const mid = portals[Math.floor(portals.length / 2)];
    if (mid.lat !== undefined && mid.lng !== undefined) {
      store.updateMapState(mid.lat, mid.lng, 15);
    }
  }

  if (deletedGuids.length > 0) store.removeEntities(deletedGuids);
  if (portals.length > 0) store.updatePortals(portals);
  if (links.length > 0) store.updateLinks(links);
  if (fields.length > 0) store.updateFields(fields);
}
