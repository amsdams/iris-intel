import { IRISPlugin, IRIS_API } from '@iris/plugin-sdk';

const ExportDataPlugin: IRISPlugin = {
  manifest: {
    id: 'export-data',
    name: 'Export Data',
    version: '1.0.0',
    description: 'Allows exporting captured portal, link, and field data to JSON, KML, or GeoJSON.',
    author: 'IRIS Team',
  },
  setup: (api: IRIS_API) => {
    api.ui.addMenuItem('export-data-trigger', 'Export Data', () => {
        // Dispatch a custom event that Overlay.tsx will listen for
        document.dispatchEvent(new CustomEvent('iris:plugin:export:toggle'));
    });

    console.log('Export Data Plugin loaded.');
  },
  teardown: (api: IRIS_API) => {
    api.ui.removeMenuItem('export-data-trigger');
    console.log('Export Data Plugin disabled.');
  },
};

export default ExportDataPlugin;
