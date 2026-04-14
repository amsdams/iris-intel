import { IRISPlugin, IRIS_API, Portal } from '@iris/plugin-sdk';

function getRechargeColor(health: number): string | null {
  if (health >= 100) return null;
  if (health > 85) return '#ffff00';
  if (health > 50) return '#ff9900';
  if (health > 15) return '#ff0000';
  return '#ff00ff';
}

function getRechargeOpacity(health: number): number {
  if (health > 95) return (1 - health / 100) * 0.5 + 0.5;
  if (health > 75) return (1 - health / 100) * 0.5 + 0.5;
  return (1 - health / 100) * 0.75 + 0.25;
}

let unsubscribeRecharge: (() => void) | undefined;

function buildFeatures(portals: Record<string, Portal>): GeoJSON.Feature[] {
  return Object.values(portals)
    .filter((portal) => portal.team !== 'N' && typeof portal.health === 'number' && portal.health < 100)
    .map((portal) => {
      const health = portal.health as number;
      const color = getRechargeColor(health);
      if (!color) return null;

      return {
        type: 'Feature',
        id: `portal-recharge:${portal.id}`,
        geometry: {
          type: 'Point',
          coordinates: [portal.lng, portal.lat],
        },
        properties: {
          id: `portal-recharge:${portal.id}`,
          color,
          opacity: getRechargeOpacity(health),
        },
      } as GeoJSON.Feature;
    })
    .filter((feature): feature is GeoJSON.Feature => feature !== null);
}

const PortalHealthFillPlugin: IRISPlugin = {
  manifest: {
    id: 'portal-health-fill',
    name: 'Portal Health Fill',
    version: '0.1.0',
    description: 'Highlights portals that need recharging using yellow, orange, red, and magenta.',
    author: 'IRIS Team',
    defaultEnabled: false,
    capabilities: ['overlay', 'highlighter'],
  },
  setup: (api: IRIS_API): void => {
    unsubscribeRecharge?.();
    api.map.setFeatures(buildFeatures(api.portals.getAll()));
    unsubscribeRecharge = api.portals.subscribe((portals) => {
      api.map.setFeatures(buildFeatures(portals));
    });
  },
  teardown: (api: IRIS_API): void => {
    unsubscribeRecharge?.();
    unsubscribeRecharge = undefined;
    api.map.setFeatures([]);
  },
};

export default PortalHealthFillPlugin;
