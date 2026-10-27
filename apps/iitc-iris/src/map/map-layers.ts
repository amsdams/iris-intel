import type {Layer as LeafletLayer, LayerGroup} from 'leaflet';
import type {IitcIrisLayerSettings} from '../messages';

export type IitcIrisCoreLayerKey = 'fields' | 'links' | 'portals';
export type IitcIrisEntityLayerIndex = Map<string, LeafletLayer[]>;
export type IitcIrisLayerPaneKey = keyof IitcIrisLayerSettings | 'drawnItems' | 'selectedPortal' | 'selectedMapObject' | 'search' | 'missions' | 'userLocation';

export interface IitcIrisMapLayers {
  tiles: LeafletLayer[];
  fields: LeafletLayer[];
  links: LeafletLayer[];
  portals: LeafletLayer[];
  coreLayerGroups: Record<IitcIrisCoreLayerKey, LayerGroup>;
  selectedPortal: LeafletLayer[];
  selectedMapObject: LeafletLayer[];
  ornaments: LeafletLayer[];
  artifacts: LeafletLayer[];
  labels: LeafletLayer[];
  drawnItems: LeafletLayer[];
  playerTracker: LeafletLayer[];
  search: LeafletLayer[];
  missions: LeafletLayer[];
  userLocation: LeafletLayer[];
  entityLayerIndex: {
    fields: IitcIrisEntityLayerIndex;
    links: IitcIrisEntityLayerIndex;
    portals: IitcIrisEntityLayerIndex;
  };
}

export function getLayerPane(layerKey: IitcIrisLayerPaneKey): string {
  return `iitc-iris-${layerKey}`;
}
