import { IRISPlugin } from '@iris/plugin-sdk';
import { useStore } from '@iris/core';

const PlannedLinksPlugin: IRISPlugin = {
  manifest: {
    id: 'planned-links',
    name: 'Draw Tools',
    version: '0.1.0',
    description: 'Plan links and mark portals on the map before acting in Intel.',
    author: 'IRIS Team',
    defaultEnabled: false,
    capabilities: ['planning', 'overlay'],
  },
  setup: (): void => {
    // Planning UI and map interactions are currently provided by IRIS core support.
  },
  teardown: (): void => {
    const state = useStore.getState();
    state.setPlanningMode(false);
  },
};

export default PlannedLinksPlugin;
