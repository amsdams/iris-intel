import { IRISPlugin, IRIS_API } from '@iris/plugin-sdk';
import { useStore } from './store';
import { normalizeTeam } from './index';

export class PluginManager {
  private availablePlugins: Map<string, IRISPlugin> = new Map();
  private api: IRIS_API;

  constructor() {
    this.api = {
      portals: {
        getAll: () => useStore.getState().portals,
        subscribe: (callback) => 
          useStore.subscribe(
            (state) => state.portals,
            (portals) => callback(portals)
          ),
      },
      links: {
        getAll: () => useStore.getState().links,
        subscribe: (callback) => 
          useStore.subscribe(
            (state) => state.links,
            (links) => callback(links)
          ),
      },
      fields: {
        getAll: () => useStore.getState().fields,
        subscribe: (callback) => 
          useStore.subscribe(
            (state) => state.fields,
            (fields) => callback(fields)
          ),
      },
      plexts: {
        subscribe: (callback) =>
          useStore.subscribe(
            (state) => state.plexts,
            (plexts) => callback(plexts)
          ),
      },
      map: {
        getCenter: () => {
          const { lat, lng } = useStore.getState().mapState;
          return { lat, lng };
        },
        getZoom: () => useStore.getState().mapState.zoom,
        setFeatures: (features) =>
          useStore.getState().setPluginFeatures({
            type: 'FeatureCollection',
            features,
          }),
      },
      ui: {
        addStatsItem: (id, label, value) => 
          useStore.getState().addStatsItem({ id, label, value }),
        removeStatsItem: (id) => 
          useStore.getState().removeStatsItem(id),
        addMenuItem: (id, label, onClick) =>
          useStore.getState().addMenuItem({ id, label, onClick }),
        removeMenuItem: (id) =>
          useStore.getState().removeMenuItem(id),
        setTheme: (id) => useStore.getState().setTheme(id),
        getTheme: () => useStore.getState().themeId,
      },
      utils: {
        normalizeTeam: (team) => normalizeTeam(team),
      },
    };
  }

  /**
   * Register a plugin and enable it if not already tracked.
   */
  async load(plugin: IRISPlugin) {
    if (this.availablePlugins.has(plugin.manifest.id)) {
      return;
    }

    this.availablePlugins.set(plugin.manifest.id, plugin);
    
    // If not in store yet, enable by default
    const state = useStore.getState().pluginStates;
    if (state[plugin.manifest.id] === undefined) {
      useStore.getState().setPluginEnabled(plugin.manifest.id, true);
    }

    // If enabled in store, setup now
    if (useStore.getState().pluginStates[plugin.manifest.id]) {
      try {
        await plugin.setup(this.api);
        console.log(`IRIS: Plugin ${plugin.manifest.name} enabled`);
      } catch (e) {
        console.error(`IRIS: Error enabling plugin ${plugin.manifest.id}`, e);
      }
    }
  }

  /**
   * Toggle plugin state and call setup/teardown.
   */
  async setEnabled(id: string, enabled: boolean) {
    const plugin = this.availablePlugins.get(id);
    if (!plugin) return;

    const currentState = !!useStore.getState().pluginStates[id];
    if (currentState === enabled) return;

    useStore.getState().setPluginEnabled(id, enabled);

    try {
      if (enabled) {
        await plugin.setup(this.api);
        console.log(`IRIS: Plugin ${plugin.manifest.name} enabled`);
      } else {
        if (plugin.teardown) {
          await plugin.teardown(this.api);
        }
        console.log(`IRIS: Plugin ${plugin.manifest.name} disabled`);
      }
    } catch (e) {
      console.error(`IRIS: Error toggling plugin ${id}`, e);
    }
  }

  getAvailablePlugins() {
    return Array.from(this.availablePlugins.values());
  }
}

export const pluginManager = new PluginManager();
