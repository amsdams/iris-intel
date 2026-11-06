import type {IitcIrisLayerSettings, IitcIrisRenderField, IitcIrisRenderLink, IitcIrisRenderPortal} from '../../messages';
import type {IitcIrisCoreLayerKey} from '../map-layers';

export interface IitcIrisSecondaryEntityRenderUpdate {
  readonly portalOverlays: boolean;
  readonly selectedPortal: boolean;
  readonly selectedMapObject: boolean;
  readonly drawTools: boolean;
}

type IitcIrisCoreFilterEntityKind = 'portal' | 'link' | 'field';

type IitcIrisCoreFilterDataConstraint = Partial<{
  team: IitcIrisRenderPortal['team'];
  level: number | undefined;
  isPlaceholder: boolean;
}>;

interface IitcIrisCoreFilterDesc {
  portal?: boolean;
  link?: boolean;
  field?: boolean;
  data?: IitcIrisCoreFilterDataConstraint;
  pred?: (entity: IitcIrisRenderPortal | IitcIrisRenderLink | IitcIrisRenderField) => boolean;
}

interface IitcIrisCoreFilterLayer {
  name: string;
  setting: keyof IitcIrisLayerSettings;
  filter: IitcIrisCoreFilterDesc | IitcIrisCoreFilterDesc[];
}

function createIitcIrisLevelFilterLayer(level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): IitcIrisCoreFilterLayer {
  return {
    name: `Level ${level} Portals`,
    setting: `level${level}Portals` as keyof IitcIrisLayerSettings,
    filter: [
      {portal: true, data: {level, team: 'R'}},
      {portal: true, data: {level, team: 'E'}},
      {portal: true, data: {level, team: 'M'}},
    ],
  };
}

const IITC_IRIS_CORE_FILTER_LAYERS: IitcIrisCoreFilterLayer[] = [
  {name: 'Fields', setting: 'fields', filter: {field: true}},
  {name: 'Links', setting: 'links', filter: {link: true}},
  {name: 'Portals', setting: 'portals', filter: {portal: true}},
  {
    name: 'Unclaimed/Placeholder Portals',
    setting: 'unclaimedPortals',
    filter: [
      {portal: true, data: {team: 'N'}},
      {portal: true, data: {level: undefined}},
      {portal: true, data: {isPlaceholder: true}},
    ],
  },
  ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map(createIitcIrisLevelFilterLayer),
  {
    name: 'Resistance',
    setting: 'resistance',
    filter: {portal: true, link: true, field: true, data: {team: 'R'}},
  },
  {
    name: 'Enlightened',
    setting: 'enlightened',
    filter: {portal: true, link: true, field: true, data: {team: 'E'}},
  },
  {
    name: 'Machina',
    setting: 'machina',
    filter: {portal: true, link: true, field: true, data: {team: 'M'}},
  },
];

function getCoreFilterEntityData(entity: IitcIrisRenderPortal | IitcIrisRenderLink | IitcIrisRenderField): IitcIrisCoreFilterDataConstraint {
  if (!entity || typeof entity !== 'object') {
    return {team: undefined};
  }
  if ('level' in entity || 'isPlaceholder' in entity) {
    const portal = entity as IitcIrisRenderPortal;
    return {
      team: portal.team,
      level: portal.level,
      isPlaceholder: portal.isPlaceholder,
    };
  }
  return {team: entity.team};
}

function doesCoreFilterDataMatch(
  constraint: IitcIrisCoreFilterDataConstraint | undefined,
  entity: IitcIrisRenderPortal | IitcIrisRenderLink | IitcIrisRenderField,
): boolean {
  if (!constraint) return true;
  const data = getCoreFilterEntityData(entity);
  return Object.entries(constraint).every(([key, value]) => data[key as keyof IitcIrisCoreFilterDataConstraint] === value);
}

function doesCoreFilterMatch(
  kind: IitcIrisCoreFilterEntityKind,
  entity: IitcIrisRenderPortal | IitcIrisRenderLink | IitcIrisRenderField,
  filter: IitcIrisCoreFilterDesc,
): boolean {
  if (!filter[kind]) return false;
  if (filter.pred) return filter.pred(entity);
  return doesCoreFilterDataMatch(filter.data, entity);
}

function isCoreEntityFilteredWith(
  settings: IitcIrisLayerSettings,
  kind: IitcIrisCoreFilterEntityKind,
  entity: IitcIrisRenderPortal | IitcIrisRenderLink | IitcIrisRenderField,
): boolean {
  for (const layer of IITC_IRIS_CORE_FILTER_LAYERS) {
    if (settings[layer.setting] === true) continue;
    const filters = Array.isArray(layer.filter) ? layer.filter : [layer.filter];
    if (filters.some((filter) => doesCoreFilterMatch(kind, entity, filter))) return true;
  }
  return false;
}

export function isPortalVisibleWith(settings: IitcIrisLayerSettings, portal: IitcIrisRenderPortal): boolean {
  return !isCoreEntityFilteredWith(settings, 'portal', portal);
}

export function isLinkVisibleWith(settings: IitcIrisLayerSettings, link: IitcIrisRenderLink): boolean {
  return !isCoreEntityFilteredWith(settings, 'link', link);
}

export function isFieldVisibleWith(settings: IitcIrisLayerSettings, field: IitcIrisRenderField): boolean {
  return !isCoreEntityFilteredWith(settings, 'field', field);
}

export const ALL_SECONDARY_ENTITY_RENDER_UPDATE: IitcIrisSecondaryEntityRenderUpdate = {
  portalOverlays: true,
  selectedPortal: true,
  selectedMapObject: true,
  drawTools: true,
};

export function getSecondaryEntityRenderUpdate(layerSettings: IitcIrisLayerSettings, changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisSecondaryEntityRenderUpdate {
  if (!changedLayerKeys) return ALL_SECONDARY_ENTITY_RENDER_UPDATE;
  const changedKeySet = new Set(changedLayerKeys);
  const changesPortalVisibility = changedLayerKeys.some((key) => (
    key === 'portals' ||
    key === 'unclaimedPortals' ||
    key === 'resistance' ||
    key === 'enlightened' ||
    key === 'machina' ||
    /^level[1-8]Portals$/.test(key)
  ));
  const enabledPortalOverlay = layerSettings.labels ||
    layerSettings.keyCount ||
    layerSettings.ornaments ||
    layerSettings.artifacts;
  const needsPortalOverlayUpdate = (changesPortalVisibility && enabledPortalOverlay) ||
    changedKeySet.has('labels') ||
    changedKeySet.has('keyCount') ||
    changedKeySet.has('ornaments') ||
    changedKeySet.has('artifacts');
  const changesLinkVisibility = changedKeySet.has('links') ||
    changedKeySet.has('resistance') ||
    changedKeySet.has('enlightened') ||
    changedKeySet.has('machina');

  return {
    portalOverlays: needsPortalOverlayUpdate,
    selectedPortal: changesPortalVisibility,
    selectedMapObject: changedKeySet.has('fields') || changesLinkVisibility,
    drawTools: changesLinkVisibility,
  };
}

export type IitcIrisPortalLevelBucket = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'unclaimed';

export interface IitcIrisCoreEntityRenderScope {
  readonly fields: boolean;
  readonly links: boolean;
  readonly portals: boolean;
  readonly allFields: boolean;
  readonly allLinks: boolean;
  readonly allPortals: boolean;
  readonly fieldTeams: ReadonlySet<IitcIrisRenderField['team']>;
  readonly linkTeams: ReadonlySet<IitcIrisRenderLink['team']>;
  readonly portalTeams: ReadonlySet<IitcIrisRenderPortal['team']>;
  readonly portalLevels: ReadonlySet<IitcIrisPortalLevelBucket>;
}

// Only the local scope builder mutates flags and buckets; consumers receive a read-only plan.
type MutableCoreEntityRenderScope = {
  -readonly [Key in keyof IitcIrisCoreEntityRenderScope]:
    IitcIrisCoreEntityRenderScope[Key] extends ReadonlySet<infer Value> ? Set<Value> : IitcIrisCoreEntityRenderScope[Key];
};

export const ALL_CORE_ENTITY_RENDER_SCOPE: IitcIrisCoreEntityRenderScope = {
  fields: true,
  links: true,
  portals: true,
  allFields: true,
  allLinks: true,
  allPortals: true,
  fieldTeams: new Set(),
  linkTeams: new Set(),
  portalTeams: new Set(),
  portalLevels: new Set(),
};

function createEmptyCoreEntityRenderScope(): MutableCoreEntityRenderScope {
  return {
    fields: false,
    links: false,
    portals: false,
    allFields: false,
    allLinks: false,
    allPortals: false,
    fieldTeams: new Set(),
    linkTeams: new Set(),
    portalTeams: new Set(),
    portalLevels: new Set(),
  };
}

export function getPortalLevelBucket(portal: IitcIrisRenderPortal): IitcIrisPortalLevelBucket {
  if (portal.team === 'N' || portal.isPlaceholder || portal.level === undefined || portal.level < 1 || portal.level > 8) {
    return 'unclaimed';
  }
  return portal.level as IitcIrisPortalLevelBucket;
}

export function getFactionLayerSetting(team: IitcIrisRenderPortal['team'], settings: IitcIrisLayerSettings): boolean {
  if (team === 'R') return settings.resistance;
  if (team === 'E') return settings.enlightened;
  if (team === 'M') return settings.machina;
  return true;
}

export function arePortalLevelFiltersEnabled(settings: IitcIrisLayerSettings): boolean {
  return settings.unclaimedPortals &&
    settings.level1Portals &&
    settings.level2Portals &&
    settings.level3Portals &&
    settings.level4Portals &&
    settings.level5Portals &&
    settings.level6Portals &&
    settings.level7Portals &&
    settings.level8Portals;
}

export function getDirectFactionToggleTeam(scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderPortal['team'] | null {
  if (!scope.fields || !scope.links || !scope.portals) return null;
  if (scope.allFields || scope.allLinks || scope.allPortals) return null;
  if (scope.fieldTeams.size !== 1 || scope.linkTeams.size !== 1 || scope.portalTeams.size !== 1) return null;
  if (scope.portalLevels.size > 0) return null;
  const [fieldTeam] = scope.fieldTeams;
  const [linkTeam] = scope.linkTeams;
  const [portalTeam] = scope.portalTeams;
  return fieldTeam === linkTeam && linkTeam === portalTeam ? portalTeam : null;
}

function addFactionScope(scope: MutableCoreEntityRenderScope, team: IitcIrisRenderPortal['team']): void {
  scope.fields = true;
  scope.links = true;
  scope.portals = true;
  if (!scope.allFields) scope.fieldTeams.add(team);
  if (!scope.allLinks) scope.linkTeams.add(team);
  if (!scope.allPortals) scope.portalTeams.add(team);
}

export function getCoreEntityRenderScope(changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisCoreEntityRenderScope {
  if (!changedLayerKeys) return ALL_CORE_ENTITY_RENDER_SCOPE;
  const scope = createEmptyCoreEntityRenderScope();

  for (const key of changedLayerKeys) {
    if (key === 'fields') {
      scope.fields = true;
      scope.allFields = true;
      scope.fieldTeams.clear();
    } else if (key === 'links') {
      scope.links = true;
      scope.allLinks = true;
      scope.linkTeams.clear();
    } else if (key === 'portals') {
      scope.portals = true;
      scope.allPortals = true;
      scope.portalTeams.clear();
      scope.portalLevels.clear();
    } else if (key === 'resistance') {
      addFactionScope(scope, 'R');
    } else if (key === 'enlightened') {
      addFactionScope(scope, 'E');
    } else if (key === 'machina') {
      addFactionScope(scope, 'M');
    } else if (key === 'unclaimedPortals') {
      scope.portals = true;
      if (!scope.allPortals) {
        scope.portalTeams.add('N');
        scope.portalLevels.add('unclaimed');
      }
    } else if (/^level[1-8]Portals$/.test(key)) {
      scope.portals = true;
      if (!scope.allPortals) scope.portalLevels.add(Number(key.slice(5, 6)) as IitcIrisPortalLevelBucket);
    }
  }

  return scope;
}

export function getWholeCoreOverlayToggleKey(changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisCoreLayerKey | null {
  if (!changedLayerKeys || changedLayerKeys.length !== 1) return null;
  const [key] = changedLayerKeys;
  if (key === 'fields' || key === 'links' || key === 'portals') return key;
  return null;
}
