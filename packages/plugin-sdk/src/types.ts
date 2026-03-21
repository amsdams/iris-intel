export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface Portal {
  id: string;
  lat: number;
  lng: number;
  team: string;
  name?: string;
}

export interface ITTCA_API {
  portals: {
    getAll: () => Record<string, Portal>;
    subscribe: (callback: (portals: Record<string, Portal>) => void) => () => void;
  };
  map: {
    getCenter: () => { lat: number; lng: number };
    getZoom: () => number;
  };
}

export interface ITTCAPlugin {
  manifest: PluginManifest;
  setup: (api: ITTCA_API) => void | Promise<void>;
  teardown?: () => void | Promise<void>;
}
