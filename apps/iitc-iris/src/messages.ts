export const IITC_IRIS_MESSAGES = {
  boot: 'IITC_IRIS_BOOT',
  pageReady: 'IITC_IRIS_PAGE_READY',
  mapMoved: 'IITC_IRIS_MAP_MOVED',
  renderEntities: 'IITC_IRIS_RENDER_ENTITIES',
  fetchEntities: 'IITC_IRIS_FETCH_ENTITIES',
  entitiesResponse: 'IITC_IRIS_ENTITIES_RESPONSE',
  entityStatus: 'IITC_IRIS_ENTITY_STATUS',
  layerSettings: 'IITC_IRIS_LAYER_SETTINGS',
} as const;

export type IitcIrisMessageType = typeof IITC_IRIS_MESSAGES[keyof typeof IITC_IRIS_MESSAGES];

export interface IitcIrisMessage {
  type: IitcIrisMessageType;
  lat?: number;
  lng?: number;
  zoom?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  entities?: IitcIrisRenderEntities;
  requestId?: number;
  tileKeys?: string[];
  data?: unknown;
  error?: string;
  status?: string;
  authRequired?: boolean;
  portals?: number;
  realPortals?: number;
  placeholderPortals?: number;
  ornamentPortals?: number;
  levelLabels?: number;
  damagedPortals?: number;
  links?: number;
  fields?: number;
  requestedTiles?: number;
  returnedTiles?: number;
  nonEmptyTiles?: number;
  emptyTileKeys?: string[];
  nonEmptyTileKeys?: string[];
  layerSettings?: IitcIrisLayerSettings;
}

export interface IitcIrisLayerSettings {
  fields: boolean;
  links: boolean;
  portals: boolean;
  ornaments: boolean;
  labels: boolean;
  tiles: boolean;
}

export interface IitcIrisRenderPortal {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  ornaments?: string[];
  isPlaceholder: boolean;
}

export interface IitcIrisRenderLink {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  oLatE6: number;
  oLngE6: number;
  dLatE6: number;
  dLngE6: number;
}

export interface IitcIrisRenderField {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  points: {latE6: number; lngE6: number}[];
}

export interface IitcIrisRenderEntities {
  generation: number;
  portals: IitcIrisRenderPortal[];
  links: IitcIrisRenderLink[];
  fields: IitcIrisRenderField[];
}
