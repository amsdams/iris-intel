import { IRISPlugin, IRIS_API, Portal } from '@iris/plugin-sdk';

let unsubscribePortalLevels: (() => void) | undefined;

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

function buildFeatures(portals: Record<string, Portal>): GeoJSON.Feature[] {
  return Object.values(portals)
    .filter((portal) => portal.team !== 'N' && typeof portal.level === 'number' && portal.level > 0)
    .map((portal) => ({
      type: 'Feature',
      id: `portal-level-label:${portal.id}`,
      geometry: {
        type: 'Point',
        coordinates: [portal.lng, portal.lat],
      },
      properties: {
        id: `portal-level-label:${portal.id}`,
        color: LEVEL_COLORS[portal.level as number] || '#ffffff',
        label: `L${portal.level}`,
        isHtmlMarker: true,
        isLabelMarker: true,
        isInteractive: false,
        minZoom: 15,
        opacity: 0.95,
        portalName: portal.name || 'Unknown portal',
        lat: portal.lat,
        lng: portal.lng,
      },
    }));
}

const PortalLevelLabelsPlugin: IRISPlugin = {
  manifest: {
    id: 'portal-level-labels',
    name: 'Portal Level Labels',
    version: '0.1.0',
    description: 'Shows portal level numbers on the map using Ingress level colours.',
    author: 'IRIS Team',
    defaultEnabled: false,
    capabilities: ['overlay', 'highlighter', 'label-heavy'],
  },
  setup: (api: IRIS_API): void => {
    unsubscribePortalLevels?.();
    api.map.setFeatures(buildFeatures(api.portals.getAll()));
    unsubscribePortalLevels = api.portals.subscribe((portals) => {
      api.map.setFeatures(buildFeatures(portals));
    });
  },
  teardown: (api: IRIS_API): void => {
    unsubscribePortalLevels?.();
    unsubscribePortalLevels = undefined;
    api.map.setFeatures([]);
  },
};

export default PortalLevelLabelsPlugin;
