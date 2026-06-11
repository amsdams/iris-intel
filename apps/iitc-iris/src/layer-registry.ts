import type {
  IitcIrisLayerRegistryEntry,
  IitcIrisLayerRegistryGroup,
  IitcIrisLayerRegistryKind,
  IitcIrisLayerSettings,
} from './messages';

export type IitcIrisLegacyBooleanLayerSettingKey = 'playerTracker';
export type IitcIrisBooleanLayerSettingKey = Exclude<keyof IitcIrisLayerSettings, IitcIrisLegacyBooleanLayerSettingKey>;

export interface IitcIrisBooleanLayerRegistryEntry {
  id: IitcIrisBooleanLayerSettingKey;
  label: string;
  title: string;
  group: IitcIrisLayerRegistryGroup;
  kind: IitcIrisLayerRegistryKind;
  defaultValue: boolean;
}

export const BOOLEAN_LAYER_REGISTRY: IitcIrisBooleanLayerRegistryEntry[] = [
  {id: 'fields', label: 'F', title: 'Fields', group: 'core', kind: 'overlay', defaultValue: true},
  {id: 'links', label: 'LN', title: 'Links', group: 'core', kind: 'overlay', defaultValue: true},
  {id: 'portals', label: 'P', title: 'Portals', group: 'core', kind: 'overlay', defaultValue: true},
  {id: 'unclaimedPortals', label: 'U', title: 'Unclaimed portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level1Portals', label: 'L1', title: 'Level 1 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level2Portals', label: 'L2', title: 'Level 2 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level3Portals', label: 'L3', title: 'Level 3 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level4Portals', label: 'L4', title: 'Level 4 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level5Portals', label: 'L5', title: 'Level 5 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level6Portals', label: 'L6', title: 'Level 6 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level7Portals', label: 'L7', title: 'Level 7 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'level8Portals', label: 'L8', title: 'Level 8 portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'resistance', label: 'RES', title: 'Resistance portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'enlightened', label: 'ENL', title: 'Enlightened portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'machina', label: 'MAC', title: 'Machina portals', group: 'core', kind: 'filter', defaultValue: true},
  {id: 'ornaments', label: 'OR', title: 'Ornaments', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'artifacts', label: 'AR', title: 'Artifacts', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'labels', label: 'LV', title: 'Level labels', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'tiles', label: 'T', title: 'Tile debug overlay', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'drawnLinks', label: 'DL', title: 'Drawn Links', group: 'detail', kind: 'overlay', defaultValue: true},
  {id: 'drawnMarkers', label: 'DM', title: 'Drawn Markers', group: 'detail', kind: 'overlay', defaultValue: true},
  {id: 'playerTrackerResistance', label: 'PTR', title: 'Resistance player tracker', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'playerTrackerEnlightened', label: 'PTE', title: 'Enlightened player tracker', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'playerTrackerMachina', label: 'PTM', title: 'Machina player tracker', group: 'detail', kind: 'overlay', defaultValue: false},
  {id: 'keyCount', label: 'KEY', title: 'Key counts', group: 'detail', kind: 'overlay', defaultValue: false},
];

export const LAYER_REGISTRY_DIAGNOSTICS: IitcIrisLayerRegistryEntry[] = [
  ...BOOLEAN_LAYER_REGISTRY.map((entry) => ({...entry, setting: 'boolean' as const})),
];

export const CORE_LAYER_TOGGLE_REGISTRY = BOOLEAN_LAYER_REGISTRY.filter((entry) => entry.group === 'core');
export const DETAIL_LAYER_TOGGLE_REGISTRY = BOOLEAN_LAYER_REGISTRY.filter((entry) => entry.group === 'detail');

export const DEFAULT_LAYER_SETTINGS: IitcIrisLayerSettings = {
  ...(Object.fromEntries(BOOLEAN_LAYER_REGISTRY.map((entry) => [entry.id, entry.defaultValue])) as Record<IitcIrisBooleanLayerSettingKey, boolean>),
  playerTracker: false,
};
