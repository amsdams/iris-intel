import { IRISPlugin, IRIS_API, Portal, Link, Field, Plext } from '@iris/plugin-sdk';
import { useStore } from './store';
import { normalizeTeam } from './index';

export class PluginManager {
  private availablePlugins = new Map<string, IRISPlugin>();
  private api: IRIS_API;

  constructor() {
    this.api = {
      portals: {
        getAll: (): Record<string, Portal> => useStore.getState().portals,
        subscribe: (callback: (portals: Record<string, Portal>) => void): () => void => 
          useStore.subscribe(
            (state) => state.portals,
            (portals) => callback(portals)
          ),
      },
      links: {
        getAll: (): Record<string, Link> => useStore.getState().links,
        subscribe: (callback: (links: Record<string, Link>) => void): () => void => 
          useStore.subscribe(
            (state) => state.links,
            (links) => callback(links)
          ),
      },
      fields: {
        getAll: (): Record<string, Field> => useStore.getState().fields,
        subscribe: (callback: (fields: Record<string, Field>) => void): () => void => 
          useStore.subscribe(
            (state) => state.fields,
            (fields) => callback(fields)
          ),
      },
      plexts: {
        subscribe: (callback: (plexts: Plext[]) => void): () => void =>
          useStore.subscribe(
            (state) => state.plexts,
            (plexts) => callback(plexts)
          ),
      },
      map: {
        getCenter: (): { lat: number; lng: number } => {
          const { lat, lng } = useStore.getState().mapState;
          return { lat, lng };
        },
        getZoom: (): number => useStore.getState().mapState.zoom,
        setFeatures: (features: GeoJSON.Feature[]): void =>
          useStore.getState().setPluginFeatures({
            type: 'FeatureCollection',
            features,
          }),
      },
      ui: {
        addStatsItem: (id: string, label: string, value: string | (() => string)): void => 
          useStore.getState().addStatsItem({ id, label, value }),
        removeStatsItem: (id: string): void => 
          useStore.getState().removeStatsItem(id),
        addMenuItem: (id: string, label: string, onClick: () => void): void =>
          useStore.getState().addMenuItem({ id, label, onClick }),
        removeMenuItem: (id: string): void =>
          useStore.getState().removeMenuItem(id),
        setTheme: (id: string): void => useStore.getState().setTheme(id),
        getTheme: (): string => useStore.getState().themeId,
        getThemeColors: (): { E: string; R: string; M: string; N: string } => {
          // Keep plugin API colors stable even before theme-specific lookup is added.
          return {
            E: '#00ff00',
            R: '#0000ff',
            M: '#ff0000',
            N: '#ffffff',
          };
        }
      },
      utils: {
        normalizeTeam: (team: string | undefined): string => normalizeTeam(team),
      },
    };
  }

  /**
   * Register a plugin and enable it if not already tracked.
   */
  async load(plugin: IRISPlugin): Promise<void> {
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
  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const plugin = this.availablePlugins.get(id);
    if (!plugin) return;

    const currentState = useStore.getState().pluginStates[id] ?? false;
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

  getAvailablePlugins(): IRISPlugin[] {
    return Array.from(this.availablePlugins.values());
  }
}

export const pluginManager = new PluginManager();
