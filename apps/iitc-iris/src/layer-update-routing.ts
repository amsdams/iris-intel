import type {IitcIrisLayerSettings} from './messages';

const ENTITY_RENDER_LAYER_SETTING_KEYS = new Set<keyof IitcIrisLayerSettings>([
  'fields',
  'links',
  'portals',
  'unclaimedPortals',
  'level1Portals',
  'level2Portals',
  'level3Portals',
  'level4Portals',
  'level5Portals',
  'level6Portals',
  'level7Portals',
  'level8Portals',
  'resistance',
  'enlightened',
  'machina',
  'ornaments',
  'artifacts',
  'labels',
  'keyCount',
]);
const DRAW_TOOLS_LAYER_SETTING_KEYS = new Set<keyof IitcIrisLayerSettings>(['drawnLinks', 'drawnMarkers']);
const PLAYER_TRACKER_LAYER_SETTING_KEYS = new Set<keyof IitcIrisLayerSettings>([
  'playerTracker',
  'playerTrackerResistance',
  'playerTrackerEnlightened',
  'playerTrackerMachina',
]);

export interface IitcIrisLayerUpdatePlan {
  changedKeys: (keyof IitcIrisLayerSettings)[];
  renderEntities: boolean;
  renderTileDebug: boolean;
  renderDrawTools: boolean;
  renderPlayerTracker: boolean;
}

export function getChangedLayerSettingKeys(previous: IitcIrisLayerSettings, next: IitcIrisLayerSettings): (keyof IitcIrisLayerSettings)[] {
  return (Object.keys(next) as (keyof IitcIrisLayerSettings)[]).filter((key) => previous[key] !== next[key]);
}

export function getLayerUpdatePlan(previous: IitcIrisLayerSettings, next: IitcIrisLayerSettings): IitcIrisLayerUpdatePlan {
  const changedKeys = getChangedLayerSettingKeys(previous, next);
  return {
    changedKeys,
    renderEntities: changedKeys.some((key) => ENTITY_RENDER_LAYER_SETTING_KEYS.has(key)),
    renderTileDebug: changedKeys.includes('tiles'),
    renderDrawTools: changedKeys.some((key) => DRAW_TOOLS_LAYER_SETTING_KEYS.has(key)),
    renderPlayerTracker: changedKeys.some((key) => PLAYER_TRACKER_LAYER_SETTING_KEYS.has(key)),
  };
}
