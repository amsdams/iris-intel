import { IRISPlugin, IRIS_API, Portal } from '@iris/plugin-sdk';

let unsubscribePortals: (() => void) | undefined;

const PortalNamesPlugin: IRISPlugin = {
  manifest: {
    id: 'portal-names',
    name: 'Portal Names Debug',
    version: '0.1.0',
    description: 'Shows the latest known portal name for debugging.',
    author: 'IRIS Team',
    defaultEnabled: false,
    capabilities: ['stats', 'debug'],
  },
  setup: (api: IRIS_API) => {
    unsubscribePortals?.();

    let lastPortalName = 'None';

    const updateLastPortal = (portals: Record<string, Portal>): void => {
      for (const portal of Object.values(portals)) {
        if (portal.name) {
          lastPortalName = portal.name;
        }
      }
    };

    updateLastPortal(api.portals.getAll());
    api.ui.addStatsItem('last-portal', 'Last Portal', () => lastPortalName);

    unsubscribePortals = api.portals.subscribe((portals) => {
      updateLastPortal(portals);
    });
  },
  teardown: (api: IRIS_API) => {
    unsubscribePortals?.();
    unsubscribePortals = undefined;
    api.ui.removeStatsItem('last-portal');
  },
};

export default PortalNamesPlugin;
