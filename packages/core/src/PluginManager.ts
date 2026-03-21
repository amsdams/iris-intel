import { ITTCAPlugin, ITTCA_API } from '@ittca/plugin-sdk';
import { useStore } from './store';

export class PluginManager {
  private plugins: Map<string, ITTCAPlugin> = new Map();
  private api: ITTCA_API;

  constructor() {
    this.api = {
      portals: {
        getAll: () => useStore.getState().portals,
        subscribe: (callback) => 
          useStore.subscribe((state) => callback(state.portals)),
      },
      links: {
        getAll: () => useStore.getState().links,
        subscribe: (callback) => 
          useStore.subscribe((state) => callback(state.links)),
      },
      fields: {
        getAll: () => useStore.getState().fields,
        subscribe: (callback) => 
          useStore.subscribe((state) => callback(state.fields)),
      },
      map: {
        getCenter: () => {
          const { lat, lng } = useStore.getState().mapState;
          return { lat, lng };
        },
        getZoom: () => useStore.getState().mapState.zoom,
      },
      ui: {
        addStatsItem: (id, label, value) => 
          useStore.getState().addStatsItem({ id, label, value }),
        removeStatsItem: (id) => 
          useStore.getState().removeStatsItem(id),
      },
    };
  }

  async load(plugin: ITTCAPlugin) {
    if (this.plugins.has(plugin.manifest.id)) {
      console.warn(`ITTCA: Plugin ${plugin.manifest.id} already loaded`);
      return;
    }

    try {
      await plugin.setup(this.api);
      this.plugins.set(plugin.manifest.id, plugin);
      console.log(`ITTCA: Plugin ${plugin.manifest.name} loaded`);
    } catch (e) {
      console.error(`ITTCA: Error loading plugin ${plugin.manifest.id}`, e);
    }
  }

  async unload(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    try {
      if (plugin.teardown) {
        await plugin.teardown();
      }
      this.plugins.delete(id);
      console.log(`ITTCA: Plugin ${plugin.manifest.name} unloaded`);
    } catch (e) {
      console.error(`ITTCA: Error unloading plugin ${id}`, e);
    }
  }
}

export const pluginManager = new PluginManager();
