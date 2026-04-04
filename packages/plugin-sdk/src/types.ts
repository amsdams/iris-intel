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

export interface PlextMarkupData {
  plain?: string;
  team?: string;
  name?: string;
  address?: string;
  latE6?: number;
  lngE6?: number;
}

export interface Plext {
  id: string;
  time: number;
  text: string;
  markup: [string, PlextMarkupData][];
  categories: number;
  team: string;
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
  plexts: {
    subscribe: (callback: (plexts: Plext[]) => void) => () => void;
  };
  map: {
    getCenter: () => { lat: number; lng: number };
    getZoom: () => number;
    setFeatures: (features: GeoJSON.Feature[]) => void;
  };
  ui: {
    addStatsItem: (id: string, label: string, value: string | (() => string)) => void;
    removeStatsItem: (id: string) => void;
    addMenuItem: (id: string, label: string, onClick: () => void) => void;
    removeMenuItem: (id: string) => void;
    setTheme: (id: string) => void;
    getTheme: () => string;
    getThemeColors: () => { E: string; R: string; M: string; N: string };
  };
  utils: {
    normalizeTeam: (source: string, team: string | undefined) => string;
  };
}

export interface IRISPlugin {
  manifest: PluginManifest;
  setup: (api: IRIS_API) => void | Promise<void>;
  teardown?: (api: IRIS_API) => void | Promise<void>;
}
