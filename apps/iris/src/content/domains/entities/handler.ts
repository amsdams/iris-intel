import { useStore, EntityParser, IntelMapData } from '@iris/core';

export function handleEntities(
  data: IntelMapData,
  hasInitialPosition: boolean,
  setHasInitialPosition: () => void,
  tileKeys?: string[],
): void {
  const { portals, links, fields, deletedGuids } = EntityParser.parse(data);
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

  if (tileKeys && tileKeys.length > 0) {
    store.setTileFreshness(tileKeys);
  }
}
