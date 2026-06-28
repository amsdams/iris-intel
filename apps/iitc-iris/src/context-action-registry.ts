export type IitcIrisContextTarget = 'map' | 'link' | 'field';
export type IitcIrisContextActionId = 'copyGuid' | 'copyAnchorGuids' | 'center' | 'copyLatLng' | 'copyIntelUrl';

export interface IitcIrisContextTargetRegistryEntry {
  id: IitcIrisContextTarget;
  panelLabel: string;
  objectLabel: string;
  distanceLabel?: string;
}

export interface IitcIrisContextActionRegistryEntry {
  id: IitcIrisContextActionId;
  label: string;
  title: string;
  targets: IitcIrisContextTarget[];
}

export const CONTEXT_TARGET_REGISTRY: IitcIrisContextTargetRegistryEntry[] = [
  {id: 'map', panelLabel: 'Context', objectLabel: 'Map'},
  {id: 'link', panelLabel: 'Link details', objectLabel: 'Link', distanceLabel: 'Length'},
  {id: 'field', panelLabel: 'Field details', objectLabel: 'Field', distanceLabel: 'Edge total'},
];

export const CONTEXT_ACTION_REGISTRY: IitcIrisContextActionRegistryEntry[] = [
  {id: 'copyGuid', label: 'GUID', title: 'Copy context GUID', targets: ['link', 'field']},
  {id: 'copyAnchorGuids', label: 'Anchors', title: 'Copy anchor portal GUIDs', targets: ['link', 'field']},
  {id: 'center', label: 'Center', title: 'Center map on this context point', targets: ['map', 'link', 'field']},
  {id: 'copyLatLng', label: 'LL', title: 'Copy context coordinates', targets: ['map', 'link', 'field']},
  {id: 'copyIntelUrl', label: 'URL', title: 'Copy Intel URL for this context point', targets: ['map', 'link', 'field']},
];

export function getContextTarget(target: IitcIrisContextTarget): IitcIrisContextTargetRegistryEntry {
  return CONTEXT_TARGET_REGISTRY.find((entry) => entry.id === target) ?? CONTEXT_TARGET_REGISTRY[0];
}

export function getContextAction(action: IitcIrisContextActionId): IitcIrisContextActionRegistryEntry {
  return CONTEXT_ACTION_REGISTRY.find((entry) => entry.id === action) ?? CONTEXT_ACTION_REGISTRY[0];
}

export function isContextActionVisible(action: IitcIrisContextActionId, target: IitcIrisContextTarget): boolean {
  return getContextAction(action).targets.includes(target);
}
