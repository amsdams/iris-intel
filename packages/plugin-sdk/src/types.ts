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

export interface Link {
  id: string;
  team: string;
  fromPortalId: string;
  fromLat: number;
  fromLng: number;
  toPortalId: string;
  toLat: number;
  toLng: number;
}

export interface Field {
  id: string;
  team: string;
  points: { lat: number; lng: number }[];
}

export interface IRIS_API {
  portals: {
    getAll: () => Record<string, Portal>;
    subscribe: (callback: (portals: Record<string, Portal>) => void) => () => void;
  };
  links: {
    getAll: () => Record<string, Link>;
    subscribe: (callback: (links: Record<string, Link>) => void) => () => void;
  };
  fields: {
    getAll: () => Record<string, Field>;
    subscribe: (callback: (fields: Record<string, Field>) => void) => () => void;
  };
  map: {
    getCenter: () => { lat: number; lng: number };
    getZoom: () => number;
  };
  ui: {
    addStatsItem: (id: string, label: string, value: string | (() => string)) => void;
    removeStatsItem: (id: string) => void;
  };
}

export interface IRISPlugin {
  manifest: PluginManifest;
  setup: (api: IRIS_API) => void | Promise<void>;
  teardown?: () => void | Promise<void>;
}
