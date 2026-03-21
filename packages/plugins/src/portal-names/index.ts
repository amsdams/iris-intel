import { ITTCAPlugin, ITTCA_API } from '@ittca/plugin-sdk';

const PortalNamesPlugin: ITTCAPlugin = {
  manifest: {
    id: 'portal-names',
    name: 'Portal Names Logger',
    version: '0.1.0',
    description: 'Logs portal names to the console.',
    author: 'ITTCA Team',
  },
  setup: (api: ITTCA_API) => {
    console.log('Portal Names Plugin setup');
    
    let lastPortalName = 'None';
    
    api.ui.addStatsItem('last-portal', 'Last Portal', () => lastPortalName);

    api.portals.subscribe((portals) => {
      const names = Object.values(portals)
        .map((p) => p.name)
        .filter(Boolean);
      
      if (names.length > 0) {
        lastPortalName = names[names.length - 1] as string;
        console.log(`Portal Names Update: ${names.join(', ')}`);
      }
    });
  },
  teardown: () => {
    console.log('Portal Names Plugin teardown');
  },
};

export default PortalNamesPlugin;
