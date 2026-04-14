import { IRISPlugin, IRIS_API, Portal } from '@iris/plugin-sdk';

const LEVEL_COLORS: Record<number, string> = {
  1: '#FECE5A',
  2: '#FFA630',
  3: '#FF7315',
  4: '#E80000',
  5: '#FF0099',
  6: '#EE26CD',
  7: '#C124E0',
  8: '#9627F4',
};

let unsubscribePortalLevel: (() => void) | undefined;

function buildFeatures(portals: Record<string, Portal>): GeoJSON.Feature[] {
  return Object.values(portals)
    .filter((portal) => portal.team !== 'N' && portal.level && portal.level > 0)
    .map((portal) => ({
      type: 'Feature',
      id: `portal-level:${portal.id}`,
      geometry: {
        type: 'Point',
        coordinates: [portal.lng, portal.lat],
      },
      properties: {
        id: `portal-level:${portal.id}`,
        color: LEVEL_COLORS[portal.level as number] || '#ffffff',
        opacity: 0.9,
      },
    }));
}

const PortalLevelFillPlugin: IRISPlugin = {
  manifest: {
    id: 'portal-level-fill',
    name: 'Portal Level Fill',
    version: '0.1.0',
    description: 'Highlights portals using Ingress level colours.',
    author: 'IRIS Team',
    defaultEnabled: false,
    capabilities: ['overlay', 'highlighter'],
  },
  setup: (api: IRIS_API): void => {
    unsubscribePortalLevel?.();
    api.map.setFeatures(buildFeatures(api.portals.getAll()));
    unsubscribePortalLevel = api.portals.subscribe((portals) => {
      api.map.setFeatures(buildFeatures(portals));
    });
  },
  teardown: (api: IRIS_API): void => {
    unsubscribePortalLevel?.();
    unsubscribePortalLevel = undefined;
    api.map.setFeatures([]);
  },
};

export default PortalLevelFillPlugin;
