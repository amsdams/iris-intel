import { IRISPlugin, IRIS_API } from '@iris/plugin-sdk';

const ThemeSelectorPlugin: IRISPlugin = {
  manifest: {
    id: 'theme-selector',
    name: 'Theme Selector',
    version: '1.1.0',
    description: 'Allows switching between UI themes via a custom popup.',
    author: 'IRIS Team',
  },
  setup: (api: IRIS_API) => {
    api.ui.addMenuItem('theme-selector-settings', 'Theme Settings', () => {
        // Dispatch a custom event that Overlay.tsx will listen for
        document.dispatchEvent(new CustomEvent('iris:plugin:theme:toggle'));
    });

    api.ui.addStatsItem('theme-selector', 'Current Theme', () => {
        return api.ui.getTheme();
    });

    console.log('Theme Selector Plugin loaded.');
  },
  teardown: (api: IRIS_API) => {
    api.ui.removeMenuItem('theme-selector-settings');
    api.ui.removeStatsItem('theme-selector');
    console.log('Theme Selector Plugin disabled.');
  },
};

export default ThemeSelectorPlugin;
