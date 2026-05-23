import { IRISPlugin, IRIS_API, Portal } from '@iris/plugin-sdk';
import { INGRESS_LEVEL_COLORS } from '@iris/core/ingress-map-style';

let unsubscribePortalLevels: (() => void) | undefined;
let unsubscribePortalLevelMap: (() => void) | undefined;

const MIN_LABEL_ZOOM = 14;

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
        color: INGRESS_LEVEL_COLORS[portal.level as keyof typeof INGRESS_LEVEL_COLORS] || '#ffffff',
        label: `L${portal.level}`,
        isHtmlMarker: true,
        isLabelMarker: true,
        isInteractive: false,
        /*minZoom: 15,*/
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
    unsubscribePortalLevelMap?.();

    let latestPortals = api.portals.getAll();
    let labelsVisible = api.map.getZoom() >= MIN_LABEL_ZOOM;

    const syncFeatures = (): void => {
      api.map.setFeatures(labelsVisible ? buildFeatures(latestPortals) : []);
    };

    syncFeatures();

    unsubscribePortalLevels = api.portals.subscribe((portals) => {
      latestPortals = portals;
      syncFeatures();
    });

    unsubscribePortalLevelMap = api.map.subscribe((mapState) => {
      const shouldShowLabels = mapState.zoom >= MIN_LABEL_ZOOM;
      if (shouldShowLabels === labelsVisible) return;

      labelsVisible = shouldShowLabels;
      syncFeatures();
    });
  },
  teardown: (api: IRIS_API): void => {
    unsubscribePortalLevels?.();
    unsubscribePortalLevelMap?.();
    unsubscribePortalLevels = undefined;
    unsubscribePortalLevelMap = undefined;
    api.map.setFeatures([]);
  },
};

export default PortalLevelLabelsPlugin;
