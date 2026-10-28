import L, {type Layer as LeafletLayer, type LeafletMouseEvent, type Map as LeafletMap} from 'leaflet';
import {getIitcOrnamentDefinition, isIitcExcludedOrnament, parseIitcOrnamentVisibilitySettings, type IitcOrnamentVisibilitySettings} from '@iris/iitc-core';
import type {
  IitcIrisHighlighterSettings, IitcIrisLayerSettings, IitcIrisLayerUpdateTimingDiagnostics,
  IitcIrisRenderArtifact, IitcIrisRenderEntities, IitcIrisRenderField, IitcIrisRenderLink,
  IitcIrisRenderMutationDiagnostics, IitcIrisRenderMutationLayerDiagnostics, IitcIrisRenderPolicy, IitcIrisRenderPortal,
} from '../../messages';
import {IITC_LEVEL_COLORS, IITC_TEAM_COLORS} from '../../iitc-colors';
import {createPortalLevelCanvas, createPortalLevelLabel} from './portal-level-canvas';
import {getVisibleLevelLabelGuids} from './portal-level-numbers';
import {DEFAULT_HIGHLIGHTER_ID, getPortalHighlighter} from '../layers/highlighter-registry';
import {createIitcGeodesicPolygon, createIitcGeodesicPolyline} from '../leaflet-geodesic';
import {getLayerPane, type IitcIrisCoreLayerKey, type IitcIrisEntityLayerIndex, type IitcIrisMapLayers} from '../map-layers';

const TEAM_COLORS = IITC_TEAM_COLORS;
const OPTIONAL_OVERLAY_MIN_ZOOM = 14;

interface OrnamentDiagnostics {
  drawnMarkers: number;
  hiddenMarkers: number;
  types: Record<string, number>;
}

interface MapRendererOptions {
  getMap: () => LeafletMap | undefined;
  defaultZoom: number;
  ensureLayers: () => IitcIrisMapLayers;
  clearRenderedLayers: (layers: LeafletLayer[]) => void;
  addRenderedLayer: (layers: LeafletLayer[], layer: LeafletLayer) => void;
  getEntities: () => IitcIrisRenderEntities | undefined;
  onEntitiesChanged: (entities: IitcIrisRenderEntities) => void;
  getLayerSettings: () => IitcIrisLayerSettings;
  getHighlighterSettings: () => IitcIrisHighlighterSettings;
  hasDetailedPortals: () => boolean;
  hasPendingPortalSelection: () => boolean;
  getPortalHistory: (guid: string) => IitcIrisRenderPortal['history'];
  getPortalKeyCount: (guid: string) => number | undefined;
  isPortalClickSuppressed: () => boolean;
  selectPortal: (portal: IitcIrisRenderPortal) => void;
  openPortalContext: (portal: IitcIrisRenderPortal, event?: LeafletMouseEvent) => void;
  renderSelectedPortal: () => void;
  renderSelectedMapObject: () => void;
  renderIitcDrawTools: () => void;
}

interface IitcIrisSecondaryEntityRenderUpdate {
  portalOverlays: boolean;
  selectedPortal: boolean;
  selectedMapObject: boolean;
  drawTools: boolean;
}

interface RenderEntitiesOptions {
  previousLayerSettings?: IitcIrisLayerSettings;
  changedLayerKeys?: (keyof IitcIrisLayerSettings)[];
  secondaryUpdate?: IitcIrisSecondaryEntityRenderUpdate;
  timing?: IitcIrisLayerUpdateTimingDiagnostics;
}

interface MapRenderer {
  renderEntities: (entities: IitcIrisRenderEntities, options?: RenderEntitiesOptions) => IitcIrisLayerUpdateTimingDiagnostics | undefined;
  getPortalRadius: (level: number | undefined, isPlaceholder: boolean) => number;
  getRenderPolicy: () => IitcIrisRenderPolicy;
  isPortalVisible: (portal: IitcIrisRenderPortal) => boolean;
  isLinkVisible: (link: IitcIrisRenderLink) => boolean;
  isFieldVisible: (field: IitcIrisRenderField) => boolean;
  getSecondaryEntityRenderUpdate: (changedKeys?: (keyof IitcIrisLayerSettings)[]) => IitcIrisSecondaryEntityRenderUpdate;
  refreshPortalMarkerStylesForHighlighter: () => boolean;
  clearCoreEntityLayerGroup: (layers: IitcIrisMapLayers, key: IitcIrisCoreLayerKey) => void;
  clearEntityLayerIndexes: (layers: IitcIrisMapLayers) => void;
  invalidateRenderContext: () => void;
  resetRenderDiagnostics: () => void;
  getRenderDiagnostics: () => {mutation: IitcIrisRenderMutationDiagnostics | null; ornaments: OrnamentDiagnostics};
}

/** Own entity layer identity, visibility, styling and incremental synchronization, independent of fetching. */
export function createMapRenderer({
  getMap, defaultZoom, ensureLayers, clearRenderedLayers, addRenderedLayer, getEntities, onEntitiesChanged,
  getLayerSettings, getHighlighterSettings, hasDetailedPortals, hasPendingPortalSelection, getPortalHistory,
  getPortalKeyCount, isPortalClickSuppressed, selectPortal, openPortalContext,
  renderSelectedPortal, renderSelectedMapObject, renderIitcDrawTools,
}: MapRendererOptions): MapRenderer {
  let latestEntityRenderContextKey = '';
  let latestRenderMutationDiagnostics: IitcIrisRenderMutationDiagnostics | null = null;
  let latestOrnamentDiagnostics: OrnamentDiagnostics = {drawnMarkers: 0, hiddenMarkers: 0, types: {}};
  const toLatLng = (latE6: number, lngE6: number): [number, number] => [latE6 / 1e6, lngE6 / 1e6];
  const getTeamColor = (team: keyof typeof TEAM_COLORS): string => TEAM_COLORS[team] ?? TEAM_COLORS.N;
  const roundTimingMs = (value: number): number => Math.round(value * 10) / 10;

  const HEALTH_COLORS = {
    cond85: '#ffff00',
    cond70: '#ffa500',
    cond60: '#ff8c00',
    cond45: '#ff0000',
    cond30: '#ff0000',
    cond15: '#ff0000',
    cond0: '#ff00ff',
  } as const;
  const LEVEL_COLORS = IITC_LEVEL_COLORS;
  const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4] as const;
  const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11] as const;
  const levelLabelIndex: IitcIrisEntityLayerIndex = new Map();
  let previousLevelLabelPortals: IitcIrisRenderPortal[] = [];

  function resetLevelLabels(): void {
    levelLabelIndex.clear();
    previousLevelLabelPortals = [];
  }

  function getPortalMarkerScale(zoom: number): number {
    return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
  }

  function getPortalLevel(level: number | undefined, isPlaceholder: boolean): number {
    if (isPlaceholder) return 0;
    return Math.max(0, Math.min(8, Math.floor(level ?? 0)));
  }

  function getPortalRadius(level: number | undefined, isPlaceholder: boolean): number {
    const scale = getPortalMarkerScale(getMap()?.getZoom() ?? defaultZoom);
    return LEVEL_TO_RADIUS[getPortalLevel(level, isPlaceholder)] * scale;
  }

  function getPortalWeight(level: number | undefined, isPlaceholder: boolean): number {
    if (isPlaceholder) return 1;
    const scale = getPortalMarkerScale(getMap()?.getZoom() ?? defaultZoom);
    return LEVEL_TO_WEIGHT[getPortalLevel(level, isPlaceholder)] * Math.sqrt(scale);
  }

  function getPortalFillOpacity(renderPolicy: IitcIrisRenderPolicy, _health: number | undefined, _level: number | undefined, _team: keyof typeof TEAM_COLORS, _isPlaceholder: boolean): number {
    if (getPortalHealthFillColor(renderPolicy, _health, _team)) return getPortalHealthFillOpacity(_health ?? 100);
    if (getPortalLevelFillColor(renderPolicy, _level, _team, _isPlaceholder)) return 0.6;
    return 0.5;
  }

  function getPortalFillColor(renderPolicy: IitcIrisRenderPolicy, team: keyof typeof TEAM_COLORS, level: number | undefined, isPlaceholder: boolean, health: number | undefined): string {
    const healthColor = getPortalHealthFillColor(renderPolicy, health, team);
    if (healthColor) return healthColor;
    const levelColor = getPortalLevelFillColor(renderPolicy, level, team, isPlaceholder);
    if (levelColor) return levelColor;
    return getTeamColor(team);
  }

  function getPortalLevelFillColor(renderPolicy: IitcIrisRenderPolicy, level: number | undefined, team: keyof typeof TEAM_COLORS, isPlaceholder: boolean): string | null {
    if (!renderPolicy.levelFill || isPlaceholder || level === undefined) return null;
    return LEVEL_COLORS[getPortalLevel(level, false)] ?? null;
  }

  function getPortalHealthFillColor(renderPolicy: IitcIrisRenderPolicy, health: number | undefined, team: keyof typeof TEAM_COLORS): string | null {
    if (!renderPolicy.healthFill || team === 'N' || health === undefined || health >= 100) return null;
    if (health > 85) return HEALTH_COLORS.cond85;
    if (health > 70) return HEALTH_COLORS.cond70;
    if (health > 60) return HEALTH_COLORS.cond60;
    if (health > 45) return HEALTH_COLORS.cond45;
    if (health > 30) return HEALTH_COLORS.cond30;
    if (health > 15) return HEALTH_COLORS.cond15;
    return HEALTH_COLORS.cond0;
  }

  function getPortalHealthFillOpacity(health: number): number {
    if (health > 85) return 0.5;
    if (health > 70) return 0.5;
    if (health > 60) return 0.5;
    if (health > 45) return 0.4;
    if (health > 30) return 0.6;
    if (health > 15) return 0.8;
    return 1;
  }

  function getPortalDataOverlayStyle(portal: IitcIrisRenderPortal, renderPolicy: IitcIrisRenderPolicy): Partial<L.CircleMarkerOptions> {
    const history = portal.history ?? getPortalHistory(portal.guid);
    return getPortalHighlighter(renderPolicy.activeHighlighter).getStyle?.({portal, history}) ?? {};
  }

  function createKeyCountMarker(latLng: [number, number], count: number, portalRadius: number): LeafletLayer {
    return L.marker(latLng, {
      icon: L.divIcon({
        className: 'iitc-iris-key-count-label',
        html: String(count),
        iconSize: [20, 14],
        iconAnchor: [10, portalRadius + 12],
      }),
      interactive: false,
      keyboard: false,
      pane: getLayerPane('labels'),
      zIndexOffset: 1001,
    });
  }

  function clearRenderedLayersFromGroup(layers: LeafletLayer[], group: L.LayerGroup): void {
    group.clearLayers();
    layers.length = 0;
  }

  function addRenderedLayerToGroup(layers: LeafletLayer[], group: L.LayerGroup, layer: LeafletLayer): void {
    group.addLayer(layer);
    layers.push(layer);
  }

  function clearEntityLayerIndex(index: IitcIrisEntityLayerIndex): void {
    index.clear();
  }

  function clearEntityLayerIndexes(layers: IitcIrisMapLayers): void {
    clearEntityLayerIndex(layers.entityLayerIndex.fields);
    clearEntityLayerIndex(layers.entityLayerIndex.links);
    clearEntityLayerIndex(layers.entityLayerIndex.portals);
  }

  function clearCoreEntityLayerGroup(
    layers: IitcIrisMapLayers,
    key: IitcIrisCoreLayerKey,
  ): void {
    clearRenderedLayersFromGroup(layers[key], layers.coreLayerGroups[key]);
    clearEntityLayerIndex(layers.entityLayerIndex[key]);
  }

  function clearDisabledCoreEntityLayerGroups(layers: IitcIrisMapLayers): void {
    const layerSettings = getLayerSettings();
    if (!layerSettings.fields) clearCoreEntityLayerGroup(layers, 'fields');
    if (!layerSettings.links) clearCoreEntityLayerGroup(layers, 'links');
    if (!layerSettings.portals) clearCoreEntityLayerGroup(layers, 'portals');
  }

  function clearNonVisibleCoreEntityLayerIndexes(
    layerList: LeafletLayer[],
    index: IitcIrisEntityLayerIndex,
    entities: {guid: string}[],
    isVisible: (entity: {guid: string}) => boolean,
    group: L.LayerGroup,
  ): void {
    const entityByGuid = mapEntitiesByGuid(entities);
    const removedLayers = new Set<LeafletLayer>();
    for (const [guid, indexedLayers] of index) {
      const entity = entityByGuid.get(guid);
      if (entity && isVisible(entity)) continue;
      for (const layer of indexedLayers) {
        group.removeLayer(layer);
        removedLayers.add(layer);
      }
      index.delete(guid);
    }
    compactRenderedLayers(layerList, removedLayers);
  }

  function clearNonVisibleCoreEntityLayers(
    layers: IitcIrisMapLayers,
    entities: IitcIrisRenderEntities,
  ): void {
    clearNonVisibleCoreEntityLayerIndexes(
      layers.fields,
      layers.entityLayerIndex.fields,
      entities.fields,
      (entity) => isFieldVisible(entity as IitcIrisRenderField) && (entity as IitcIrisRenderField).points.length === 3,
      layers.coreLayerGroups.fields,
    );
    clearNonVisibleCoreEntityLayerIndexes(
      layers.links,
      layers.entityLayerIndex.links,
      entities.links,
      (entity) => isLinkVisible(entity as IitcIrisRenderLink),
      layers.coreLayerGroups.links,
    );
    clearNonVisibleCoreEntityLayerIndexes(
      layers.portals,
      layers.entityLayerIndex.portals,
      entities.portals,
      (entity) => isPortalVisible(entity as IitcIrisRenderPortal),
      layers.coreLayerGroups.portals,
    );
  }

  function addEntityRenderedLayer(
    layers: LeafletLayer[],
    index: IitcIrisEntityLayerIndex,
    guid: string,
    layer: LeafletLayer,
    group?: L.LayerGroup,
  ): void {
    const previousLayerCount = layers.length;
    if (group) {
      addRenderedLayerToGroup(layers, group, layer);
    } else {
      addRenderedLayer(layers, layer);
    }
    if (layers.length === previousLayerCount) return;
    const indexedLayers = index.get(guid) ?? [];
    indexedLayers.push(layer);
    index.set(guid, indexedLayers);
  }

  function removeEntityRenderedLayers(
    layers: LeafletLayer[],
    index: IitcIrisEntityLayerIndex,
    guid: string,
    removedLayers?: Set<LeafletLayer>,
    group?: L.LayerGroup,
  ): void {
    const indexedLayers = index.get(guid);
    if (!indexedLayers) return;
    for (const layer of indexedLayers) {
      if (group) {
        group.removeLayer(layer);
      } else {
        layer.remove();
      }
      if (removedLayers) {
        removedLayers.add(layer);
        continue;
      }
      const layerIndex = layers.indexOf(layer);
      if (layerIndex >= 0) layers.splice(layerIndex, 1);
    }
    index.delete(guid);
  }

  function compactRenderedLayers(layers: LeafletLayer[], removedLayers: Set<LeafletLayer>): void {
    if (removedLayers.size === 0) return;
    let nextIndex = 0;
    for (const layer of layers) {
      if (removedLayers.has(layer)) continue;
      layers[nextIndex] = layer;
      nextIndex += 1;
    }
    layers.length = nextIndex;
  }

  function getLayerRenderer(layerKey: 'fields' | 'links' | 'portals'): L.Renderer | undefined {
    const map = getMap();
    if (!map) return undefined;
    const rendererKey = `__iitcIris${layerKey[0].toUpperCase()}${layerKey.slice(1)}Renderer`;
    const runtimeMap = map as LeafletMap & Record<string, L.Renderer | undefined>;
    runtimeMap[rendererKey] ??= L.canvas({pane: getLayerPane(layerKey)});
    return runtimeMap[rendererKey];
  }

  function clearEntityLayers(): void {
    const layers = ensureLayers();
    clearCoreEntityLayerGroup(layers, 'fields');
    clearCoreEntityLayerGroup(layers, 'links');
    clearCoreEntityLayerGroup(layers, 'portals');
    clearRenderedLayers(layers.selectedPortal);
    clearRenderedLayers(layers.selectedMapObject);
    clearRenderedLayers(layers.ornaments);
    clearRenderedLayers(layers.artifacts);
    clearRenderedLayers(layers.labels);
    resetLevelLabels();
    clearEntityLayerIndexes(layers);
  }

  function clearSecondaryEntityLayers(
    layers: IitcIrisMapLayers,
    update: IitcIrisSecondaryEntityRenderUpdate = ALL_SECONDARY_ENTITY_RENDER_UPDATE,
  ): void {
    if (update.selectedPortal) clearRenderedLayers(layers.selectedPortal);
    if (update.selectedMapObject) clearRenderedLayers(layers.selectedMapObject);
    if (update.portalOverlays) {
      clearRenderedLayers(layers.ornaments);
      clearRenderedLayers(layers.artifacts);
      // Key-count markers are separate decorations; keep unchanged level markers attached.
      const levelLayers = new Set([...levelLabelIndex.values()].flat());
      const removedLabels = new Set(layers.labels.filter((layer) => !levelLayers.has(layer)));
      clearRenderedLayers([...removedLabels]);
      compactRenderedLayers(layers.labels, removedLabels);
    }
  }

  function createOrnamentMarker(latLng: [number, number], ornament: string, portalRadius: number): LeafletLayer {
    const definition = getIitcOrnamentDefinition(ornament);
    const size = Math.round(60 * getPortalMarkerScale(getMap()?.getZoom() ?? defaultZoom));
    const iconUrl = definition?.url ?? `https://commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/${ornament}.png`;
    const offset = definition?.url && definition.offset ? definition.offset : [0, 0];
    const anchor: [number, number] = [
      size * offset[0] + size / 2,
      size * offset[1] + size / 2,
    ];

    return L.marker(latLng, {
      icon: L.icon({
        iconUrl,
        iconSize: [size, size],
        iconAnchor: anchor,
        className: 'iitc-iris-ornament-icon',
      }),
      interactive: false,
      keyboard: false,
      opacity: definition?.opacity ?? 0.6,
      pane: getLayerPane('ornaments'),
      zIndexOffset: Math.round(portalRadius),
    });
  }

  function loadOrnamentVisibilitySettings(): IitcOrnamentVisibilitySettings {
    let excludedOrnaments: unknown;
    let knownOrnaments: unknown;
    let layerGroupDisplayed: unknown;
    try {
      const rawExcluded = window.localStorage.getItem('excludedOrnaments');
      excludedOrnaments = rawExcluded ? JSON.parse(rawExcluded) : [];
    } catch {
      excludedOrnaments = [];
    }
    try {
      const rawKnown = window.localStorage.getItem('knownOrnaments');
      knownOrnaments = rawKnown ? JSON.parse(rawKnown) : {};
    } catch {
      knownOrnaments = {};
    }
    try {
      const rawLayers = window.localStorage.getItem('ingress.intelmap.layergroupdisplayed');
      layerGroupDisplayed = rawLayers ? JSON.parse(rawLayers) : {};
    } catch {
      layerGroupDisplayed = {};
    }
    return parseIitcOrnamentVisibilitySettings({
      excludedOrnaments,
      knownOrnaments,
      layerGroupDisplayed,
    });
  }

  function createEmptyOrnamentDiagnostics(): OrnamentDiagnostics {
    return {
      drawnMarkers: 0,
      hiddenMarkers: 0,
      types: {},
    };
  }

  function createArtifactMarker(latLng: [number, number], artifact: IitcIrisRenderArtifact): LeafletLayer {
    const isTarget = artifact.role === 'target';
    const size = isTarget ? 50 : 30;
    const suffix = isTarget ? 'shard_target' : 'shard';
    const iconUrl = `https://commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/${artifact.type}_${suffix}.png`;

    return L.marker(latLng, {
      icon: L.icon({
        iconUrl,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        className: 'iitc-iris-artifact-icon',
      }),
      interactive: false,
      keyboard: false,
      opacity: isTarget ? 1 : 0.6,
      pane: getLayerPane('artifacts'),
      zIndexOffset: isTarget ? 1200 : 1100,
    });
  }

  function createLevelLabelMarker(latLng: [number, number], level: number, team: keyof typeof TEAM_COLORS): LeafletLayer {
    const map = getMap() as (LeafletMap & {__iitcIrisLevelLabelRenderer?: L.Canvas}) | undefined;
    if (!map) throw new Error('Cannot create portal level labels without a map');
    map.__iitcIrisLevelLabelRenderer ??= createPortalLevelCanvas(getLayerPane('labels'));
    return createPortalLevelLabel(latLng, level, team, map.__iitcIrisLevelLabelRenderer);
  }

  function getLevelLabelCandidates(portals: IitcIrisRenderEntities['portals']): Parameters<typeof getVisibleLevelLabelGuids>[0] {
    const map = getMap();
    if (!map) return [];
    return portals
      .filter((portal) => !portal.isPlaceholder && portal.level !== undefined)
      .map((portal) => ({
        guid: portal.guid,
        level: getPortalLevel(portal.level, false),
        point: map.project(L.latLng(portal.latE6 / 1e6, portal.lngE6 / 1e6)),
      }));
  }

  function syncLevelLabels(layers: IitcIrisMapLayers, portals: IitcIrisRenderPortal[]): void {
    syncEntityLayers(
      layers.labels, levelLabelIndex, previousLevelLabelPortals, portals,
      (previous, next) => previous.level === next.level && previous.team === next.team &&
        previous.latE6 === next.latE6 && previous.lngE6 === next.lngE6,
      (portal) => createLevelLabelMarker(toLatLng(portal.latE6, portal.lngE6), portal.level ?? 0, portal.team),
    );
    previousLevelLabelPortals = portals;
  }

  function getRenderPolicy(): IitcIrisRenderPolicy {
    const layerSettings = getLayerSettings();
    const highlighterSettings = getHighlighterSettings();
    const mapZoom = getMap()?.getZoom() ?? defaultZoom;
    const detailedPortals = hasDetailedPortals();
    const optionalOverlaysVisible = detailedPortals && mapZoom >= OPTIONAL_OVERLAY_MIN_ZOOM;
    const activeHighlighter = optionalOverlaysVisible ? highlighterSettings.active : DEFAULT_HIGHLIGHTER_ID;
    const highlighter = getPortalHighlighter(activeHighlighter);
    return {
      optionalOverlayMinZoom: OPTIONAL_OVERLAY_MIN_ZOOM,
      detailedPortals,
      activeHighlighter,
      levelFill: highlighter.levelFill === true,
      healthFill: highlighter.healthFill === true,
      ornaments: layerSettings.ornaments,
      artifacts: layerSettings.artifacts,
      labels: layerSettings.labels && optionalOverlaysVisible,
    };
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

  function isPortalVisibleWith(settings: IitcIrisLayerSettings, portal: IitcIrisRenderPortal): boolean {
    return !isCoreEntityFilteredWith(settings, 'portal', portal);
  }

  function isPortalVisible(portal: IitcIrisRenderPortal): boolean {
    const layerSettings = getLayerSettings();
    return isPortalVisibleWith(layerSettings, portal);
  }

  function isLinkVisibleWith(settings: IitcIrisLayerSettings, link: IitcIrisRenderLink): boolean {
    return !isCoreEntityFilteredWith(settings, 'link', link);
  }

  function isLinkVisible(link: IitcIrisRenderLink): boolean {
    const layerSettings = getLayerSettings();
    return isLinkVisibleWith(layerSettings, link);
  }

  function isFieldVisibleWith(settings: IitcIrisLayerSettings, field: IitcIrisRenderField): boolean {
    return !isCoreEntityFilteredWith(settings, 'field', field);
  }

  function isFieldVisible(field: IitcIrisRenderField): boolean {
    const layerSettings = getLayerSettings();
    return isFieldVisibleWith(layerSettings, field);
  }

  function createFieldLayer(field: IitcIrisRenderField): LeafletLayer {
    return createIitcGeodesicPolygon(field.points.map((point) => toLatLng(point.latE6, point.lngE6)), {
      color: getTeamColor(field.team),
      fillColor: getTeamColor(field.team),
      fillOpacity: 0.25,
      opacity: 0,
      pane: getLayerPane('fields'),
      renderer: getLayerRenderer('fields'),
      weight: 0,
      interactive: false,
    });
  }

  function createLinkLayer(link: IitcIrisRenderLink): LeafletLayer {
    return createIitcGeodesicPolyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
      color: getTeamColor(link.team),
      opacity: 1,
      pane: getLayerPane('links'),
      renderer: getLayerRenderer('links'),
      weight: 2,
      interactive: false,
    });
  }

  function createPortalLayer(portal: IitcIrisRenderPortal, renderPolicy: IitcIrisRenderPolicy): LeafletLayer {
    const latLng = toLatLng(portal.latE6, portal.lngE6);

    const marker = L.circleMarker(latLng, {
      ...getPortalMarkerStyle(portal, renderPolicy),
      pane: getLayerPane('portals'),
      renderer: getLayerRenderer('portals'),
      interactive: true,
    });
    marker.on('click', (event) => {
      L.DomEvent.stop(event);
      if (isPortalClickSuppressed()) return;
      selectPortal(portal);
    });
    marker.on('contextmenu', (event) => openPortalContext(portal, event));
    return marker;
  }

  function getPortalMarkerStyle(portal: IitcIrisRenderPortal, renderPolicy: IitcIrisRenderPolicy): L.CircleMarkerOptions {
    const color = getTeamColor(portal.team);
    const dataOverlayStyle = getPortalDataOverlayStyle(portal, renderPolicy);
    return {
      radius: getPortalRadius(portal.level, portal.isPlaceholder),
      color,
      fillColor: renderPolicy.healthFill || renderPolicy.levelFill
        ? getPortalFillColor(renderPolicy, portal.team, portal.level, portal.isPlaceholder, portal.health)
        : getTeamColor(portal.team),
      fillOpacity: renderPolicy.healthFill || renderPolicy.levelFill
        ? getPortalFillOpacity(renderPolicy, portal.health, portal.level, portal.team, portal.isPlaceholder)
        : 0.5,
      opacity: portal.isPlaceholder ? 0.6 : 1,
      weight: getPortalWeight(portal.level, portal.isPlaceholder),
      dashArray: portal.isPlaceholder ? '1,2' : undefined,
      ...dataOverlayStyle,
    };
  }

  function mapEntitiesByGuid<T extends {guid: string}>(entities: T[]): Map<string, T> {
    const mapped = new Map<string, T>();
    for (const entity of entities) mapped.set(entity.guid, entity);
    return mapped;
  }

  function areFieldPointsEqual(a: IitcIrisRenderField['points'], b: IitcIrisRenderField['points']): boolean {
    return a.length === b.length && a.every((point, index) =>
      point.guid === b[index]?.guid &&
      point.latE6 === b[index]?.latE6 &&
      point.lngE6 === b[index]?.lngE6);
  }

  function areFieldLayersEqual(a: IitcIrisRenderField, b: IitcIrisRenderField): boolean {
    return a.team === b.team && areFieldPointsEqual(a.points, b.points);
  }

  function areLinkLayersEqual(a: IitcIrisRenderLink, b: IitcIrisRenderLink): boolean {
    return a.team === b.team &&
      a.oGuid === b.oGuid &&
      a.oLatE6 === b.oLatE6 &&
      a.oLngE6 === b.oLngE6 &&
      a.dGuid === b.dGuid &&
      a.dLatE6 === b.dLatE6 &&
      a.dLngE6 === b.dLngE6;
  }

  function getPortalHistoryForLayer(portal: IitcIrisRenderPortal): NonNullable<IitcIrisRenderPortal['history']> | undefined {
    return portal.history ?? getPortalHistory(portal.guid);
  }

  function arePortalHistoriesEqual(a: IitcIrisRenderPortal, b: IitcIrisRenderPortal): boolean {
    const aHistory = getPortalHistoryForLayer(a);
    const bHistory = getPortalHistoryForLayer(b);
    return aHistory?.visited === bHistory?.visited &&
      aHistory?.captured === bHistory?.captured &&
      aHistory?.scoutControlled === bHistory?.scoutControlled;
  }

  function arePortalLayersEqual(a: IitcIrisRenderPortal, b: IitcIrisRenderPortal): boolean {
    return a.team === b.team &&
      a.latE6 === b.latE6 &&
      a.lngE6 === b.lngE6 &&
      a.level === b.level &&
      a.health === b.health &&
      a.isPlaceholder === b.isPlaceholder &&
      arePortalHistoriesEqual(a, b);
  }

  function refreshPortalMarkerStylesForHighlighter(): boolean {
    const latestEntities = getEntities();
    if (!latestEntities || !getMap()) return false;
    const layers = ensureLayers();
    const renderPolicy = getRenderPolicy();
    const visiblePortals = latestEntities.portals.filter(isPortalVisible);

    for (const portal of visiblePortals) {
      const portalLayers = layers.entityLayerIndex.portals.get(portal.guid);
      if (!portalLayers || portalLayers.length === 0) return false;
      for (const layer of portalLayers) {
        if (!(layer instanceof L.CircleMarker)) return false;
        layer.setStyle(getPortalMarkerStyle(portal, renderPolicy));
      }
    }

    latestEntityRenderContextKey = getEntityRenderContextKey(renderPolicy);
    latestRenderMutationDiagnostics = {
      mode: 'incremental',
      fields: {...createEmptyRenderMutationLayerDiagnostics(), unchanged: latestEntities.fields.filter(isFieldVisible).length},
      links: {...createEmptyRenderMutationLayerDiagnostics(), unchanged: latestEntities.links.filter(isLinkVisible).length},
      portals: {...createEmptyRenderMutationLayerDiagnostics(), unchanged: visiblePortals.length},
    };
    return true;
  }

  function createEmptyRenderMutationLayerDiagnostics(): IitcIrisRenderMutationLayerDiagnostics {
    return {
      added: 0,
      removed: 0,
      replaced: 0,
      unchanged: 0,
    };
  }

  function createFullRenderMutationLayerDiagnostics(renderedCount: number): IitcIrisRenderMutationLayerDiagnostics {
    return {
      added: renderedCount,
      removed: 0,
      replaced: 0,
      unchanged: 0,
    };
  }

  function syncEntityLayers<T extends {guid: string}>(
    layers: LeafletLayer[],
    index: IitcIrisEntityLayerIndex,
    previousEntities: T[],
    nextEntities: T[],
    areLayersEqual: (previous: T, next: T) => boolean,
    createLayer: (entity: T) => LeafletLayer,
    group?: L.LayerGroup,
  ): IitcIrisRenderMutationLayerDiagnostics {
    const previousByGuid = mapEntitiesByGuid(previousEntities);
    const nextByGuid = mapEntitiesByGuid(nextEntities);
    const diagnostics = createEmptyRenderMutationLayerDiagnostics();
    const removedLayers = new Set<LeafletLayer>();

    for (const [guid, previousEntity] of previousByGuid) {
      const nextEntity = nextByGuid.get(guid);
      if (nextEntity && areLayersEqual(previousEntity, nextEntity)) {
        diagnostics.unchanged += 1;
        continue;
      }
      removeEntityRenderedLayers(layers, index, guid, removedLayers, group);
      if (nextEntity) {
        diagnostics.replaced += 1;
      } else {
        diagnostics.removed += 1;
      }
    }
    compactRenderedLayers(layers, removedLayers);

    for (const [guid, nextEntity] of nextByGuid) {
      const previousEntity = previousByGuid.get(guid);
      if (previousEntity && areLayersEqual(previousEntity, nextEntity)) continue;
      addEntityRenderedLayer(layers, index, guid, createLayer(nextEntity), group);
      if (!previousEntity) diagnostics.added += 1;
    }

    return diagnostics;
  }

  function getEntityRenderContextKey(renderPolicy: IitcIrisRenderPolicy): string {
    const layerSettings = getLayerSettings();
    return JSON.stringify({
      zoom: getMap()?.getZoom() ?? defaultZoom,
      detailedPortals: renderPolicy.detailedPortals,
      activeHighlighter: renderPolicy.activeHighlighter,
      levelFill: renderPolicy.levelFill,
      healthFill: renderPolicy.healthFill,
      fields: layerSettings.fields,
      links: layerSettings.links,
      portals: layerSettings.portals,
      unclaimedPortals: layerSettings.unclaimedPortals,
      level1Portals: layerSettings.level1Portals,
      level2Portals: layerSettings.level2Portals,
      level3Portals: layerSettings.level3Portals,
      level4Portals: layerSettings.level4Portals,
      level5Portals: layerSettings.level5Portals,
      level6Portals: layerSettings.level6Portals,
      level7Portals: layerSettings.level7Portals,
      level8Portals: layerSettings.level8Portals,
      resistance: layerSettings.resistance,
      enlightened: layerSettings.enlightened,
      machina: layerSettings.machina,
      keyCount: layerSettings.keyCount,
    });
  }

  function canUseIncrementalCoreEntityRender(
    previousEntities: IitcIrisRenderEntities | undefined,
    nextEntities: IitcIrisRenderEntities,
    renderContextKey: string,
    previousLayerSettings?: IitcIrisLayerSettings,
  ): previousEntities is IitcIrisRenderEntities {
    return previousEntities !== undefined &&
      (previousEntities !== nextEntities || previousLayerSettings !== undefined) &&
      (latestEntityRenderContextKey === renderContextKey || previousLayerSettings !== undefined) &&
      !hasPendingPortalSelection();
  }

  const ALL_SECONDARY_ENTITY_RENDER_UPDATE: IitcIrisSecondaryEntityRenderUpdate = {
    portalOverlays: true,
    selectedPortal: true,
    selectedMapObject: true,
    drawTools: true,
  };

  function getSecondaryEntityRenderUpdate(changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisSecondaryEntityRenderUpdate {
    const layerSettings = getLayerSettings();
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
    const enabledPortalOverlay = getLayerSettings().labels ||
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

  type IitcIrisPortalLevelBucket = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'unclaimed';

  interface IitcIrisCoreEntityRenderScope {
    fields: boolean;
    links: boolean;
    portals: boolean;
    allFields: boolean;
    allLinks: boolean;
    allPortals: boolean;
    fieldTeams: Set<IitcIrisRenderField['team']>;
    linkTeams: Set<IitcIrisRenderLink['team']>;
    portalTeams: Set<IitcIrisRenderPortal['team']>;
    portalLevels: Set<IitcIrisPortalLevelBucket>;
  }

  interface IitcIrisRenderEntityBuckets {
    fieldsByTeam: Map<IitcIrisRenderField['team'], IitcIrisRenderField[]>;
    linksByTeam: Map<IitcIrisRenderLink['team'], IitcIrisRenderLink[]>;
    portalsByTeam: Map<IitcIrisRenderPortal['team'], IitcIrisRenderPortal[]>;
    portalsByLevel: Map<IitcIrisPortalLevelBucket, IitcIrisRenderPortal[]>;
  }

  const ALL_CORE_ENTITY_RENDER_SCOPE: IitcIrisCoreEntityRenderScope = {
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
  const renderEntityBuckets = new WeakMap<IitcIrisRenderEntities, IitcIrisRenderEntityBuckets>();

  function createEmptyCoreEntityRenderScope(): IitcIrisCoreEntityRenderScope {
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

  function getPortalLevelBucket(portal: IitcIrisRenderPortal): IitcIrisPortalLevelBucket {
    if (portal.team === 'N' || portal.isPlaceholder || portal.level === undefined || portal.level < 1 || portal.level > 8) {
      return 'unclaimed';
    }
    return portal.level as IitcIrisPortalLevelBucket;
  }

  function addToBucket<K, T>(buckets: Map<K, T[]>, key: K, value: T): void {
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(value);
    } else {
      buckets.set(key, [value]);
    }
  }

  function getRenderEntityBuckets(entities: IitcIrisRenderEntities): IitcIrisRenderEntityBuckets {
    const cached = renderEntityBuckets.get(entities);
    if (cached) return cached;

    const buckets: IitcIrisRenderEntityBuckets = {
      fieldsByTeam: new Map(),
      linksByTeam: new Map(),
      portalsByTeam: new Map(),
      portalsByLevel: new Map(),
    };
    for (const field of entities.fields) addToBucket(buckets.fieldsByTeam, field.team, field);
    for (const link of entities.links) addToBucket(buckets.linksByTeam, link.team, link);
    for (const portal of entities.portals) {
      addToBucket(buckets.portalsByTeam, portal.team, portal);
      addToBucket(buckets.portalsByLevel, getPortalLevelBucket(portal), portal);
    }
    renderEntityBuckets.set(entities, buckets);
    return buckets;
  }

  function appendUniqueEntities<T extends {guid: string}>(target: T[], seen: Set<string>, source: T[] | undefined): void {
    if (!source) return;
    for (const entity of source) {
      if (seen.has(entity.guid)) continue;
      seen.add(entity.guid);
      target.push(entity);
    }
  }

  function getScopedFields(entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderField[] {
    if (!scope.fields) return [];
    if (scope.allFields) return entities.fields;
    const buckets = getRenderEntityBuckets(entities);
    const fields: IitcIrisRenderField[] = [];
    const seen = new Set<string>();
    for (const team of scope.fieldTeams) appendUniqueEntities(fields, seen, buckets.fieldsByTeam.get(team));
    return fields;
  }

  function getScopedLinks(entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderLink[] {
    if (!scope.links) return [];
    if (scope.allLinks) return entities.links;
    const buckets = getRenderEntityBuckets(entities);
    const links: IitcIrisRenderLink[] = [];
    const seen = new Set<string>();
    for (const team of scope.linkTeams) appendUniqueEntities(links, seen, buckets.linksByTeam.get(team));
    return links;
  }

  function getScopedPortals(entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderPortal[] {
    if (!scope.portals) return [];
    if (scope.allPortals) return entities.portals;
    const buckets = getRenderEntityBuckets(entities);
    const portals: IitcIrisRenderPortal[] = [];
    const seen = new Set<string>();
    for (const team of scope.portalTeams) appendUniqueEntities(portals, seen, buckets.portalsByTeam.get(team));
    for (const level of scope.portalLevels) appendUniqueEntities(portals, seen, buckets.portalsByLevel.get(level));
    return portals;
  }

  function getFactionLayerSetting(team: IitcIrisRenderPortal['team'], settings: IitcIrisLayerSettings = getLayerSettings()): boolean {
    if (team === 'R') return settings.resistance;
    if (team === 'E') return settings.enlightened;
    if (team === 'M') return settings.machina;
    return true;
  }

  function arePortalLevelFiltersEnabled(settings: IitcIrisLayerSettings = getLayerSettings()): boolean {
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

  function getDirectFactionToggleTeam(scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderPortal['team'] | null {
    if (!scope.fields || !scope.links || !scope.portals) return null;
    if (scope.allFields || scope.allLinks || scope.allPortals) return null;
    if (scope.fieldTeams.size !== 1 || scope.linkTeams.size !== 1 || scope.portalTeams.size !== 1) return null;
    if (scope.portalLevels.size > 0) return null;
    const [fieldTeam] = scope.fieldTeams;
    const [linkTeam] = scope.linkTeams;
    const [portalTeam] = scope.portalTeams;
    return fieldTeam === linkTeam && linkTeam === portalTeam ? portalTeam : null;
  }

  function syncFactionBucketLayers<T extends {guid: string}>(
    layerList: LeafletLayer[],
    index: IitcIrisEntityLayerIndex,
    group: L.LayerGroup,
    entities: T[],
    visible: boolean,
    createLayer: (entity: T) => LeafletLayer,
  ): IitcIrisRenderMutationLayerDiagnostics {
    const diagnostics = createEmptyRenderMutationLayerDiagnostics();
    for (const entity of entities) {
      const indexedLayers = index.get(entity.guid);
      if (visible) {
        if (indexedLayers && indexedLayers.length > 0) {
          for (const layer of indexedLayers) {
            if (!group.hasLayer(layer)) group.addLayer(layer);
          }
        } else {
          addEntityRenderedLayer(layerList, index, entity.guid, createLayer(entity), group);
        }
        diagnostics.added += 1;
      } else {
        if (indexedLayers) {
          for (const layer of indexedLayers) group.removeLayer(layer);
        }
        diagnostics.removed += 1;
      }
    }
    return diagnostics;
  }

  function renderCoreEntityFactionToggle(
    layers: IitcIrisMapLayers,
    entities: IitcIrisRenderEntities,
    renderPolicy: IitcIrisRenderPolicy,
    previousLayerSettings: IitcIrisLayerSettings,
    scope: IitcIrisCoreEntityRenderScope,
    timing?: IitcIrisLayerUpdateTimingDiagnostics,
  ): IitcIrisRenderMutationDiagnostics | null {
    const layerSettings = getLayerSettings();
    if (!arePortalLevelFiltersEnabled(previousLayerSettings) || !arePortalLevelFiltersEnabled(layerSettings)) return null;
    const team = getDirectFactionToggleTeam(scope);
    if (!team || team === 'N') return null;
    if (getFactionLayerSetting(team, previousLayerSettings) === getFactionLayerSetting(team)) return null;

    const buckets = getRenderEntityBuckets(entities);
    const visible = getFactionLayerSetting(team);

    let stepStartedAt = performance.now();
    const fields = syncFactionBucketLayers(
      layers.fields,
      layers.entityLayerIndex.fields,
      layers.coreLayerGroups.fields,
      (buckets.fieldsByTeam.get(team) ?? []).filter((field) => field.points.length === 3),
      visible,
      createFieldLayer,
    );
    if (timing) syncVisibilityTiming(timing, 'syncFieldsMs', stepStartedAt);

    stepStartedAt = performance.now();
    const links = syncFactionBucketLayers(
      layers.links,
      layers.entityLayerIndex.links,
      layers.coreLayerGroups.links,
      buckets.linksByTeam.get(team) ?? [],
      visible,
      createLinkLayer,
    );
    if (timing) syncVisibilityTiming(timing, 'syncLinksMs', stepStartedAt);

    stepStartedAt = performance.now();
    const portals = syncFactionBucketLayers(
      layers.portals,
      layers.entityLayerIndex.portals,
      layers.coreLayerGroups.portals,
      buckets.portalsByTeam.get(team) ?? [],
      visible,
      (portal) => createPortalLayer(portal, renderPolicy),
    );
    if (timing) syncVisibilityTiming(timing, 'syncPortalsMs', stepStartedAt);

    return {
      mode: 'incremental',
      fields,
      links,
      portals,
    };
  }

  function addFactionScope(scope: IitcIrisCoreEntityRenderScope, team: IitcIrisRenderPortal['team']): void {
    scope.fields = true;
    scope.links = true;
    scope.portals = true;
    if (!scope.allFields) scope.fieldTeams.add(team);
    if (!scope.allLinks) scope.linkTeams.add(team);
    if (!scope.allPortals) scope.portalTeams.add(team);
  }

  function getCoreEntityRenderScope(changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisCoreEntityRenderScope {
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

  function syncVisibilityChangedEntityLayers<T extends {guid: string}>(
    layers: LeafletLayer[],
    index: IitcIrisEntityLayerIndex,
    entities: T[],
    wasVisible: (entity: T) => boolean,
    isVisible: (entity: T) => boolean,
    createLayer: (entity: T) => LeafletLayer,
    group?: L.LayerGroup,
    refreshLayer?: (layer: LeafletLayer, entity: T) => void,
  ): IitcIrisRenderMutationLayerDiagnostics {
    const diagnostics = createEmptyRenderMutationLayerDiagnostics();
    const removedLayers = new Set<LeafletLayer>();

    for (const entity of entities) {
      const previousVisible = wasVisible(entity);
      const nextVisible = isVisible(entity);
      if (previousVisible && nextVisible) {
        diagnostics.unchanged += 1;
      } else if (previousVisible) {
        if (group) {
          const indexedLayers = index.get(entity.guid);
          if (indexedLayers) {
            for (const layer of indexedLayers) group.removeLayer(layer);
          }
        } else {
          removeEntityRenderedLayers(layers, index, entity.guid, removedLayers);
        }
        diagnostics.removed += 1;
      } else if (nextVisible) {
        const visibleGroup = group;
        const indexedLayers = visibleGroup ? index.get(entity.guid) : undefined;
        if (visibleGroup && indexedLayers && indexedLayers.length > 0) {
          for (const layer of indexedLayers) {
            refreshLayer?.(layer, entity);
            if (!visibleGroup.hasLayer(layer)) visibleGroup.addLayer(layer);
          }
        } else {
          addEntityRenderedLayer(layers, index, entity.guid, createLayer(entity), visibleGroup);
        }
        diagnostics.added += 1;
      }
    }

    if (!group) compactRenderedLayers(layers, removedLayers);
    return diagnostics;
  }

  function renderCoreEntityLayersVisibilityChange(
    layers: IitcIrisMapLayers,
    entities: IitcIrisRenderEntities,
    renderPolicy: IitcIrisRenderPolicy,
    previousLayerSettings: IitcIrisLayerSettings,
    scope: IitcIrisCoreEntityRenderScope,
    timing?: IitcIrisLayerUpdateTimingDiagnostics,
  ): IitcIrisRenderMutationDiagnostics {
    let stepStartedAt = performance.now();
    const fields = scope.fields
      ? syncVisibilityChangedEntityLayers(
        layers.fields,
        layers.entityLayerIndex.fields,
        getScopedFields(entities, scope).filter((field) => field.points.length === 3),
        (field) => isFieldVisibleWith(previousLayerSettings, field),
        isFieldVisible,
        createFieldLayer,
        layers.coreLayerGroups.fields,
      )
      : createEmptyRenderMutationLayerDiagnostics();
    if (timing) syncVisibilityTiming(timing, 'syncFieldsMs', stepStartedAt);

    stepStartedAt = performance.now();
    const links = scope.links
      ? syncVisibilityChangedEntityLayers(
        layers.links,
        layers.entityLayerIndex.links,
        getScopedLinks(entities, scope),
        (link) => isLinkVisibleWith(previousLayerSettings, link),
        isLinkVisible,
        createLinkLayer,
        layers.coreLayerGroups.links,
      )
      : createEmptyRenderMutationLayerDiagnostics();
    if (timing) syncVisibilityTiming(timing, 'syncLinksMs', stepStartedAt);

    stepStartedAt = performance.now();
    const portals = scope.portals
      ? syncVisibilityChangedEntityLayers(
        layers.portals,
        layers.entityLayerIndex.portals,
        getScopedPortals(entities, scope),
        (portal) => isPortalVisibleWith(previousLayerSettings, portal),
        isPortalVisible,
        (portal) => createPortalLayer(portal, renderPolicy),
        layers.coreLayerGroups.portals,
        (layer, portal) => {
          if (layer instanceof L.CircleMarker) layer.setStyle(getPortalMarkerStyle(portal, renderPolicy));
        },
      )
      : createEmptyRenderMutationLayerDiagnostics();
    if (timing) syncVisibilityTiming(timing, 'syncPortalsMs', stepStartedAt);

    return {
      mode: 'incremental',
      fields,
      links,
      portals,
    };
  }

  function syncVisibilityTiming(
    timing: IitcIrisLayerUpdateTimingDiagnostics,
    key: 'syncFieldsMs' | 'syncLinksMs' | 'syncPortalsMs',
    startedAt: number,
  ): void {
    timing[key] = roundTimingMs(performance.now() - startedAt);
  }

  function getWholeCoreOverlayToggleKey(changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisCoreLayerKey | null {
    if (!changedLayerKeys || changedLayerKeys.length !== 1) return null;
    const [key] = changedLayerKeys;
    if (key === 'fields' || key === 'links' || key === 'portals') return key;
    return null;
  }

  function getCoreLayerSettingValue(key: IitcIrisCoreLayerKey, settings: IitcIrisLayerSettings = getLayerSettings()): boolean {
    return settings[key];
  }

  function setCoreLayerGroupVisible(group: L.LayerGroup, visible: boolean): void {
    const map = getMap();
    if (!map) return;
    const isVisible = map.hasLayer(group);
    if (visible && !isVisible) {
      group.addTo(map);
    } else if (!visible && isVisible) {
      group.removeFrom(map);
    }
  }

  function createCoreGroupToggleMutationDiagnostics(
    key: IitcIrisCoreLayerKey,
    layerCount: number,
    visible: boolean,
  ): IitcIrisRenderMutationDiagnostics {
    return {
      mode: 'incremental',
      fields: key === 'fields'
        ? {...createEmptyRenderMutationLayerDiagnostics(), [visible ? 'added' : 'removed']: layerCount}
        : createEmptyRenderMutationLayerDiagnostics(),
      links: key === 'links'
        ? {...createEmptyRenderMutationLayerDiagnostics(), [visible ? 'added' : 'removed']: layerCount}
        : createEmptyRenderMutationLayerDiagnostics(),
      portals: key === 'portals'
        ? {...createEmptyRenderMutationLayerDiagnostics(), [visible ? 'added' : 'removed']: layerCount}
        : createEmptyRenderMutationLayerDiagnostics(),
    };
  }

  function renderCoreEntityGroupToggle(
    layers: IitcIrisMapLayers,
    key: IitcIrisCoreLayerKey,
    previousLayerSettings: IitcIrisLayerSettings,
    timing?: IitcIrisLayerUpdateTimingDiagnostics,
  ): IitcIrisRenderMutationDiagnostics | null {
    const nextVisible = getCoreLayerSettingValue(key);
    if (getCoreLayerSettingValue(key, previousLayerSettings) === nextVisible) return null;
    const layerList = layers[key];
    if (nextVisible && layerList.length === 0) return null;

    const startedAt = performance.now();
    if (key === 'portals' && nextVisible) refreshPortalMarkerStylesForHighlighter();
    setCoreLayerGroupVisible(layers.coreLayerGroups[key], nextVisible);
    if (timing) timing.coreGroupToggleMs = roundTimingMs(performance.now() - startedAt);
    return createCoreGroupToggleMutationDiagnostics(key, layerList.length, nextVisible);
  }

  function renderCoreEntityLayersIncremental(
    layers: IitcIrisMapLayers,
    previousEntities: IitcIrisRenderEntities,
    entities: IitcIrisRenderEntities,
    renderPolicy: IitcIrisRenderPolicy,
    previousLayerSettings: IitcIrisLayerSettings = getLayerSettings(),
    timing?: IitcIrisLayerUpdateTimingDiagnostics,
    scope: IitcIrisCoreEntityRenderScope = ALL_CORE_ENTITY_RENDER_SCOPE,
  ): IitcIrisRenderMutationDiagnostics {
    let stepStartedAt = performance.now();
    const fields = scope.fields
      ? syncEntityLayers(
        layers.fields,
        layers.entityLayerIndex.fields,
        getScopedFields(previousEntities, scope).filter((field) => isFieldVisibleWith(previousLayerSettings, field) && field.points.length === 3),
        getScopedFields(entities, scope).filter((field) => isFieldVisible(field) && field.points.length === 3),
        areFieldLayersEqual,
        createFieldLayer,
        layers.coreLayerGroups.fields,
      )
      : createEmptyRenderMutationLayerDiagnostics();
    if (timing) timing.syncFieldsMs = roundTimingMs(performance.now() - stepStartedAt);

    stepStartedAt = performance.now();
    const links = scope.links
      ? syncEntityLayers(
        layers.links,
        layers.entityLayerIndex.links,
        getScopedLinks(previousEntities, scope).filter((link) => isLinkVisibleWith(previousLayerSettings, link)),
        getScopedLinks(entities, scope).filter(isLinkVisible),
        areLinkLayersEqual,
        createLinkLayer,
        layers.coreLayerGroups.links,
      )
      : createEmptyRenderMutationLayerDiagnostics();
    if (timing) timing.syncLinksMs = roundTimingMs(performance.now() - stepStartedAt);

    stepStartedAt = performance.now();
    const portals = scope.portals
      ? syncEntityLayers(
        layers.portals,
        layers.entityLayerIndex.portals,
        getScopedPortals(previousEntities, scope).filter((portal) => isPortalVisibleWith(previousLayerSettings, portal)),
        getScopedPortals(entities, scope).filter(isPortalVisible),
        arePortalLayersEqual,
        (portal) => createPortalLayer(portal, renderPolicy),
        layers.coreLayerGroups.portals,
      )
      : createEmptyRenderMutationLayerDiagnostics();
    if (timing) timing.syncPortalsMs = roundTimingMs(performance.now() - stepStartedAt);

    return {
      mode: 'incremental',
      fields,
      links,
      portals,
    };
  }

  function renderEntities(
    entities: IitcIrisRenderEntities,
    options: RenderEntitiesOptions = {},
  ): IitcIrisLayerUpdateTimingDiagnostics | undefined {
    const layerSettings = getLayerSettings();
    const latestEntities = getEntities();
    if (!getMap()) return undefined;
    const renderStartedAt = performance.now();
    const timing = options.timing;
    const layers = ensureLayers();
    let stepStartedAt = performance.now();
    const renderPolicy = getRenderPolicy();
    if (timing) timing.renderPolicyMs = roundTimingMs(performance.now() - stepStartedAt);

    stepStartedAt = performance.now();
    const ornamentVisibility = loadOrnamentVisibilitySettings();
    if (timing) timing.ornamentSettingsMs = roundTimingMs(performance.now() - stepStartedAt);

    const secondaryUpdate = options.secondaryUpdate ?? ALL_SECONDARY_ENTITY_RENDER_UPDATE;
    const ornamentDiagnostics = secondaryUpdate.portalOverlays ? createEmptyOrnamentDiagnostics() : latestOrnamentDiagnostics;
    let visiblePortals: IitcIrisRenderPortal[] | undefined;
    const getVisiblePortalsForRender = (): IitcIrisRenderPortal[] => {
      if (!visiblePortals) {
        const visiblePortalsStartedAt = performance.now();
        visiblePortals = entities.portals.filter(isPortalVisible);
        if (timing) timing.visiblePortalsMs = roundTimingMs(performance.now() - visiblePortalsStartedAt);
      }
      return visiblePortals;
    };

    stepStartedAt = performance.now();
    const visibleLevelLabelGuids = secondaryUpdate.portalOverlays && renderPolicy.labels
      ? getVisibleLevelLabelGuids(getLevelLabelCandidates(getVisiblePortalsForRender()))
      : new Set<string>();
    if (timing) timing.visibleLabelsMs = roundTimingMs(performance.now() - stepStartedAt);

    const previousEntities = latestEntities;
    const renderContextKey = getEntityRenderContextKey(renderPolicy);
    const useIncrementalCoreRender = canUseIncrementalCoreEntityRender(previousEntities, entities, renderContextKey, options.previousLayerSettings);
    const coreRenderScope = getCoreEntityRenderScope(options.changedLayerKeys);

    onEntitiesChanged(entities);

    if (useIncrementalCoreRender) {
      stepStartedAt = performance.now();
      clearSecondaryEntityLayers(layers, secondaryUpdate);
      if (timing) timing.clearSecondaryMs = roundTimingMs(performance.now() - stepStartedAt);
      if (previousEntities !== entities) {
        clearDisabledCoreEntityLayerGroups(layers);
        clearNonVisibleCoreEntityLayers(layers, previousEntities);
      }
      const previousLayerSettings = options.previousLayerSettings;
      const groupToggleKey = previousEntities === entities && previousLayerSettings
        ? getWholeCoreOverlayToggleKey(options.changedLayerKeys)
        : null;
      const groupToggleMutation = groupToggleKey && previousLayerSettings
        ? renderCoreEntityGroupToggle(layers, groupToggleKey, previousLayerSettings, timing)
        : null;
      const factionToggleMutation = !groupToggleMutation && previousEntities === entities && previousLayerSettings
        ? renderCoreEntityFactionToggle(layers, entities, renderPolicy, previousLayerSettings, coreRenderScope, timing)
        : null;
      latestRenderMutationDiagnostics = groupToggleMutation ?? factionToggleMutation ?? (previousEntities === entities && previousLayerSettings
        ? renderCoreEntityLayersVisibilityChange(
          layers,
          entities,
          renderPolicy,
          previousLayerSettings,
          coreRenderScope,
          timing,
        )
        : renderCoreEntityLayersIncremental(
          layers,
          previousEntities,
          entities,
          renderPolicy,
          options.previousLayerSettings,
          timing,
          coreRenderScope,
        ));
    } else {
      stepStartedAt = performance.now();
      clearEntityLayers();
      if (timing) timing.fullClearMs = roundTimingMs(performance.now() - stepStartedAt);

      let renderedFieldCount = 0;
      let renderedLinkCount = 0;
      stepStartedAt = performance.now();
      for (const field of entities.fields) {
        if (!isFieldVisible(field) || field.points.length !== 3) continue;
        addEntityRenderedLayer(layers.fields, layers.entityLayerIndex.fields, field.guid, createFieldLayer(field), layers.coreLayerGroups.fields);
        renderedFieldCount += 1;
      }
      if (timing) timing.fullFieldsMs = roundTimingMs(performance.now() - stepStartedAt);

      stepStartedAt = performance.now();
      for (const link of entities.links) {
        if (!isLinkVisible(link)) continue;
        addEntityRenderedLayer(layers.links, layers.entityLayerIndex.links, link.guid, createLinkLayer(link), layers.coreLayerGroups.links);
        renderedLinkCount += 1;
      }
      if (timing) timing.fullLinksMs = roundTimingMs(performance.now() - stepStartedAt);

      stepStartedAt = performance.now();
      const fullRenderVisiblePortals = getVisiblePortalsForRender();
      for (const portal of fullRenderVisiblePortals) {
        addEntityRenderedLayer(layers.portals, layers.entityLayerIndex.portals, portal.guid, createPortalLayer(portal, renderPolicy), layers.coreLayerGroups.portals);
      }
      if (timing) timing.fullPortalsMs = roundTimingMs(performance.now() - stepStartedAt);
      latestRenderMutationDiagnostics = {
        mode: 'full',
        fields: createFullRenderMutationLayerDiagnostics(renderedFieldCount),
        links: createFullRenderMutationLayerDiagnostics(renderedLinkCount),
        portals: createFullRenderMutationLayerDiagnostics(fullRenderVisiblePortals.length),
      };
    }
    latestEntityRenderContextKey = renderContextKey;

    stepStartedAt = performance.now();
    if (secondaryUpdate.portalOverlays) {
      const levelLabelPortals: IitcIrisRenderPortal[] = [];
      for (const portal of getVisiblePortalsForRender()) {
        const latLng = toLatLng(portal.latE6, portal.lngE6);
        const radius = getPortalRadius(portal.level, portal.isPlaceholder);
        if (renderPolicy.labels && visibleLevelLabelGuids.has(portal.guid) && portal.level !== undefined) {
          levelLabelPortals.push(portal);
        }
        const keyCount = getPortalKeyCount(portal.guid);
        if (layerSettings.keyCount && keyCount !== undefined && keyCount > 0) {
          addRenderedLayer(layers.labels, createKeyCountMarker(latLng, keyCount, radius));
        }
      }

      syncLevelLabels(layers, levelLabelPortals);

      if (renderPolicy.artifacts) {
        for (const portal of entities.portals) {
          if (portal.isPlaceholder || !portal.artifacts || portal.artifacts.length === 0) continue;
          const latLng = toLatLng(portal.latE6, portal.lngE6);
          for (const artifact of portal.artifacts) {
            addRenderedLayer(layers.artifacts, createArtifactMarker(latLng, artifact));
          }
        }
      }

      if (renderPolicy.ornaments) {
        for (const portal of entities.portals) {
          if (!portal.ornaments || portal.ornaments.length === 0) continue;
          const latLng = toLatLng(portal.latE6, portal.lngE6);
          const radius = getPortalRadius(portal.level, portal.isPlaceholder);
          for (const ornament of portal.ornaments) {
            ornamentDiagnostics.types[ornament] = (ornamentDiagnostics.types[ornament] ?? 0) + 1;
            if (isIitcExcludedOrnament(ornament, ornamentVisibility)) {
              ornamentDiagnostics.hiddenMarkers += 1;
              continue;
            }
            ornamentDiagnostics.drawnMarkers += 1;
            addRenderedLayer(layers.ornaments, createOrnamentMarker(latLng, ornament, radius));
          }
        }
      }
    }
    if (secondaryUpdate.selectedPortal) renderSelectedPortal();
    if (secondaryUpdate.selectedMapObject) renderSelectedMapObject();
    if (secondaryUpdate.drawTools) renderIitcDrawTools();
    latestOrnamentDiagnostics = ornamentDiagnostics;
    if (timing) {
      timing.secondaryMs = roundTimingMs(performance.now() - stepStartedAt);
      timing.renderEntitiesMs = roundTimingMs(performance.now() - renderStartedAt);
    }
    return timing;
  }

  return {
    renderEntities, getPortalRadius, getRenderPolicy, isPortalVisible, isLinkVisible, isFieldVisible,
    getSecondaryEntityRenderUpdate, refreshPortalMarkerStylesForHighlighter, clearCoreEntityLayerGroup, clearEntityLayerIndexes,
    invalidateRenderContext: (): void => { latestEntityRenderContextKey = ''; resetLevelLabels(); },
    resetRenderDiagnostics: (): void => { latestEntityRenderContextKey = ''; latestRenderMutationDiagnostics = null; resetLevelLabels(); },
    getRenderDiagnostics: () => ({mutation: latestRenderMutationDiagnostics, ornaments: latestOrnamentDiagnostics}),
  };
}
