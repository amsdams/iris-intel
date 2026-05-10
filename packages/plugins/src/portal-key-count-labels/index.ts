import { IRISPlugin, IRIS_API, InventoryItem, Portal } from '@iris/plugin-sdk';
import { InventoryParser } from '@iris/core';

let unsubscribePortalKeysInventory: (() => void) | undefined;
let unsubscribePortalKeysPortals: (() => void) | undefined;
let latestInventory: InventoryItem[] = [];
let latestPortals: Record<string, Portal> = {};

function buildFeatures(portals: Record<string, Portal>, inventory: InventoryItem[]): GeoJSON.Feature[] {
  const keyCounts = InventoryParser.aggregatePortalKeys(inventory);

  return Object.values(portals)
    .map((portal) => {
      const count = keyCounts[portal.id]?.total ?? 0;
      if (count <= 0) {
        return null;
      }

      return {
        type: 'Feature',
        id: `portal-key-count:${portal.id}`,
        geometry: {
          type: 'Point',
          coordinates: [portal.lng, portal.lat],
        },
        properties: {
          id: `portal-key-count:${portal.id}`,
          color: '#D1FFFF',
          label: String(count),
          isHtmlMarker: true,
          isLabelMarker: true,
          isInteractive: false,
          /*minZoom: 15,*/
          opacity: 0.95,
          portalName: portal.name || 'Unknown portal',
          lat: portal.lat,
          lng: portal.lng,
        },
      } as GeoJSON.Feature;
    })
    .filter((feature): feature is GeoJSON.Feature => feature !== null);
}

function syncFeatures(api: IRIS_API): void {
  api.map.setFeatures(buildFeatures(latestPortals, latestInventory));
}

const PortalKeyCountLabelsPlugin: IRISPlugin = {
  manifest: {
    id: 'portal-key-count-labels',
    name: 'Portal Key Count Labels',
    version: '0.1.0',
    description: 'Shows portal key counts on the map using the captured inventory snapshot.',
    author: 'IRIS Team',
    defaultEnabled: false,
    capabilities: ['overlay', 'inventory', 'label-heavy', 'highlighter'],
  },
  setup: (api: IRIS_API): void => {
    unsubscribePortalKeysInventory?.();
    unsubscribePortalKeysPortals?.();

    latestInventory = api.inventory.getAll();
    latestPortals = api.portals.getAll();
    syncFeatures(api);

    unsubscribePortalKeysInventory = api.inventory.subscribe((inventory) => {
      latestInventory = inventory;
      syncFeatures(api);
    });

    unsubscribePortalKeysPortals = api.portals.subscribe((portals) => {
      latestPortals = portals;
      syncFeatures(api);
    });
  },
  teardown: (api: IRIS_API): void => {
    unsubscribePortalKeysInventory?.();
    unsubscribePortalKeysPortals?.();
    unsubscribePortalKeysInventory = undefined;
    unsubscribePortalKeysPortals = undefined;
    latestInventory = [];
    latestPortals = {};
    api.map.setFeatures([]);
  },
};

export default PortalKeyCountLabelsPlugin;
