import { IRISPlugin, IRIS_API, Portal, Link, Field, Plext, InventoryItem } from '@iris/plugin-sdk';
import { useStore } from './store';
import { normalizeTeam } from './index';

export class PluginManager {
  private availablePlugins = new Map<string, IRISPlugin>();
  private pluginFeaturesByPlugin = new Map<string, GeoJSON.Feature[]>();

  private syncPluginFeatures(): void {
    const activeVisualOverlayIds = useStore.getState().activeVisualOverlayIds;
    const features: GeoJSON.Feature[] = [];

    for (const [id, pluginFeatures] of this.pluginFeaturesByPlugin) {
        const plugin = this.availablePlugins.get(id);
        const isHighlighter = plugin?.manifest.capabilities?.includes('highlighter');
        
        // If it's a highlighter, only include if active.
        // If it's not a highlighter (e.g. Draw Tools, Player Tracker), include always if enabled.
        if (!isHighlighter || activeVisualOverlayIds.includes(id)) {
            features.push(...pluginFeatures);
        }
    }

    useStore.getState().setPluginFeatures({
      type: 'FeatureCollection',
      features,
    });
  }

  /**
   * Public way for UI to trigger a re-sync when activeVisualOverlayIds changes.
   */
  public syncVisualOverlays(): void {
    this.syncPluginFeatures();
  }

  private clearPluginFeatures(id: string): void {
    if (!this.pluginFeaturesByPlugin.has(id)) {
      return;
    }

    this.pluginFeaturesByPlugin.delete(id);
    this.syncPluginFeatures();
  }

  private createApi(pluginId: string): IRIS_API {
    return {
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
      inventory: {
        getAll: (): InventoryItem[] => useStore.getState().inventory,
        subscribe: (callback: (inventory: InventoryItem[]) => void): () => void =>
          useStore.subscribe(
            (state) => state.inventory,
            (inventory) => callback(inventory)
          ),
      },
      map: {
        getCenter: (): { lat: number; lng: number } => {
          const { lat, lng } = useStore.getState().mapState;
          return { lat, lng };
        },
        getZoom: (): number => useStore.getState().mapState.zoom,
        setFeatures: (features: GeoJSON.Feature[]): void => {
          this.pluginFeaturesByPlugin.set(pluginId, features);
          this.syncPluginFeatures();
        },
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
          return {
            E: '#03DC03',
            R: '#0088FF',
            M: '#FF1010',
            N: '#C0C0C0',
          };
        }
      },
      utils: {
        normalizeTeam: (team: string | undefined): string => normalizeTeam(team),
      },
    };
  }

  async load(plugin: IRISPlugin): Promise<void> {
    if (this.availablePlugins.has(plugin.manifest.id)) {
      return;
    }

    this.availablePlugins.set(plugin.manifest.id, plugin);
    
    const state = useStore.getState().pluginStates;
    if (state[plugin.manifest.id] === undefined) {
      useStore.getState().setPluginEnabled(
        plugin.manifest.id,
        plugin.manifest.defaultEnabled ?? true
      );
    }

    if (useStore.getState().pluginStates[plugin.manifest.id]) {
      try {
        await plugin.setup(this.createApi(plugin.manifest.id));
        console.log(`IRIS: Plugin ${plugin.manifest.name} enabled`);
      } catch (e) {
        console.error(`IRIS: Error enabling plugin ${plugin.manifest.id}`, e);
      }
    }
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const plugin = this.availablePlugins.get(id);
    if (!plugin) return;

    const currentState = useStore.getState().pluginStates[id] ?? false;
    if (currentState === enabled) return;

    useStore.getState().setPluginEnabled(id, enabled);

    try {
      if (enabled) {
        await plugin.setup(this.createApi(id));
        console.log(`IRIS: Plugin ${plugin.manifest.name} enabled`);
      } else {
        if (plugin.teardown) {
          await plugin.teardown(this.createApi(id));
        }
        this.clearPluginFeatures(id);
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
