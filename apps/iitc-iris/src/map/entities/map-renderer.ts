import {createPortalDecorationOverlays, createEmptyOrnamentDiagnostics, type OrnamentDiagnostics} from './portal-decoration-overlays';
import {createEntityLayerSync, compactRenderedLayers, mapEntitiesByGuid, createEmptyRenderMutationLayerDiagnostics} from './entity-layer-sync';
import {createPortalLabelOverlays} from './portal-label-overlays';
import {
  isPortalVisibleWith, isLinkVisibleWith, isFieldVisibleWith, getPortalLevelBucket,
  getSecondaryEntityRenderUpdate as getSecondaryUpdate, getFactionLayerSetting,
  arePortalLevelFiltersEnabled, getDirectFactionToggleTeam, getCoreEntityRenderScope,
  getWholeCoreOverlayToggleKey, ALL_CORE_ENTITY_RENDER_SCOPE, ALL_SECONDARY_ENTITY_RENDER_UPDATE,
  type IitcIrisSecondaryEntityRenderUpdate, type IitcIrisCoreEntityRenderScope,
  type IitcIrisPortalLevelBucket,
} from './entity-visibility';
import L, {type Layer as LeafletLayer, type LeafletMouseEvent, type Map as LeafletMap} from 'leaflet';
import type {
  IitcIrisHighlighterSettings, IitcIrisLayerSettings, IitcIrisLayerUpdateTimingDiagnostics,
  IitcIrisRenderEntities, IitcIrisRenderField, IitcIrisRenderLink,
  IitcIrisRenderMutationDiagnostics, IitcIrisRenderMutationLayerDiagnostics, IitcIrisRenderPolicy, IitcIrisRenderPortal,
} from '../../messages';
import {IITC_TEAM_COLORS} from '../../iitc-colors';
import {getPortalRadius as getPortalRadiusForZoom,
  getPortalMarkerStyle as getPortalBaseMarkerStyle} from './portal-marker-style';
import {IitcIrisCanvas} from '../map-canvas';
import {getPortalHighlighter} from '../layers/highlighter-registry';
import {createIitcGeodesicPolygon, createIitcGeodesicPolyline} from '../leaflet-geodesic';
import {getLayerPane, type IitcIrisCoreLayerKey, type IitcIrisEntityLayerIndex, type IitcIrisMapLayers} from '../map-layers';

const TEAM_COLORS = IITC_TEAM_COLORS;

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
  refreshKeyCountLabels: () => void;
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
  const {addEntityRenderedLayer, removeEntityRenderedLayers, syncEntityLayers} = createEntityLayerSync(addRenderedLayer);
  const labelOverlays = createPortalLabelOverlays({getMap, getLayerSettings, getPortalKeyCount, getPortalRadius,
    syncEntityLayers, clearRenderedLayers});
  const decorationOverlays = createPortalDecorationOverlays({getMap, defaultZoom, getPortalRadius,
    syncEntityLayers, clearRenderedLayers});

  function resetPortalOverlays(): void {
    decorationOverlays.resetReferences();
    labelOverlays.resetReferences();
  }

  function getPortalRadius(level: number | undefined, isPlaceholder: boolean): number {
    return getPortalRadiusForZoom(level, isPlaceholder, getMap()?.getZoom() ?? defaultZoom);
  }

  function getPortalDataOverlayStyle(portal: IitcIrisRenderPortal, renderPolicy: IitcIrisRenderPolicy): Partial<L.CircleMarkerOptions> {
    const history = portal.history ?? getPortalHistory(portal.guid);
    return getPortalHighlighter(renderPolicy.activeHighlighter).getStyle?.({portal, history}) ?? {};
  }

  function clearRenderedLayersFromGroup(layers: LeafletLayer[], group: L.LayerGroup): void {
    group.clearLayers();
    layers.length = 0;
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

  function getLayerRenderer(layerKey: 'fields' | 'links' | 'portals'): L.Renderer | undefined {
    const map = getMap();
    if (!map) return undefined;
    const rendererKey = `__iitcIris${layerKey[0].toUpperCase()}${layerKey.slice(1)}Renderer`;
    const runtimeMap = map as LeafletMap & Record<string, L.Renderer | undefined>;
    runtimeMap[rendererKey] ??= new IitcIrisCanvas({pane: getLayerPane(layerKey)});
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
    resetPortalOverlays();
    clearEntityLayerIndexes(layers);
  }

  function clearSecondaryEntityLayers(
    layers: IitcIrisMapLayers,
    update: IitcIrisSecondaryEntityRenderUpdate = ALL_SECONDARY_ENTITY_RENDER_UPDATE,
  ): void {
    if (update.selectedPortal) clearRenderedLayers(layers.selectedPortal);
    if (update.selectedMapObject) clearRenderedLayers(layers.selectedMapObject);
    if (update.portalOverlays) {
      decorationOverlays.clearUnindexed(layers);
      labelOverlays.clearUnindexed(layers);
    }
  }

  function refreshKeyCountLabels(): void {
    const entities = getEntities();
    if (!getMap() || !entities || !getLayerSettings().keyCount) return;
    labelOverlays.syncKeys(ensureLayers(), entities.portals.filter(isPortalVisible));
  }

  function getRenderPolicy(): IitcIrisRenderPolicy {
    const layerSettings = getLayerSettings();
    const highlighterSettings = getHighlighterSettings();
    const detailedPortals = hasDetailedPortals();
    // Like IITC's plugins, use each portal's known data rather than the request's
    // detail mode. Link anchors have no level/health; history may be known separately.
    const activeHighlighter = highlighterSettings.active;
    const highlighter = getPortalHighlighter(activeHighlighter);
    return {
      optionalOverlayMinZoom: 0,
      detailedPortals,
      activeHighlighter,
      levelFill: highlighter.levelFill === true,
      healthFill: highlighter.healthFill === true,
      ornaments: layerSettings.ornaments,
      artifacts: layerSettings.artifacts,
      labels: layerSettings.labels,
    };
  }

  function getSecondaryEntityRenderUpdate(changedLayerKeys?: (keyof IitcIrisLayerSettings)[]): IitcIrisSecondaryEntityRenderUpdate {
    return getSecondaryUpdate(getLayerSettings(), changedLayerKeys);
  }

  function isPortalVisible(portal: IitcIrisRenderPortal): boolean {
    const layerSettings = getLayerSettings();
    return isPortalVisibleWith(layerSettings, portal);
  }

  function isLinkVisible(link: IitcIrisRenderLink): boolean {
    const layerSettings = getLayerSettings();
    return isLinkVisibleWith(layerSettings, link);
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
    const dataOverlayStyle = getPortalDataOverlayStyle(portal, renderPolicy);
    return {
      ...getPortalBaseMarkerStyle(portal, renderPolicy, getMap()?.getZoom() ?? defaultZoom),
      ...dataOverlayStyle,
    };
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

  function createFullRenderMutationLayerDiagnostics(renderedCount: number): IitcIrisRenderMutationLayerDiagnostics {
    return {
      added: renderedCount,
      removed: 0,
      replaced: 0,
      unchanged: 0,
    };
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

  interface IitcIrisRenderEntityBuckets {
    fieldsByTeam: Map<IitcIrisRenderField['team'], IitcIrisRenderField[]>;
    linksByTeam: Map<IitcIrisRenderLink['team'], IitcIrisRenderLink[]>;
    portalsByTeam: Map<IitcIrisRenderPortal['team'], IitcIrisRenderPortal[]>;
    portalsByLevel: Map<IitcIrisPortalLevelBucket, IitcIrisRenderPortal[]>;
  }
  const renderEntityBuckets = new WeakMap<IitcIrisRenderEntities, IitcIrisRenderEntityBuckets>();

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
    if (getFactionLayerSetting(team, previousLayerSettings) === getFactionLayerSetting(team, layerSettings)) return null;

    const buckets = getRenderEntityBuckets(entities);
    const visible = getFactionLayerSetting(team, layerSettings);

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
    const latestEntities = getEntities();
    if (!getMap()) return undefined;
    const renderStartedAt = performance.now();
    const timing = options.timing;
    const layers = ensureLayers();
    let stepStartedAt = performance.now();
    const renderPolicy = getRenderPolicy();
    if (timing) timing.renderPolicyMs = roundTimingMs(performance.now() - stepStartedAt);

    stepStartedAt = performance.now();
    const ornamentVisibility = decorationOverlays.loadVisibility();
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
      ? labelOverlays.getVisibleLevelLabelGuids(getVisiblePortalsForRender())
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
      labelOverlays.sync(layers, getVisiblePortalsForRender(), visibleLevelLabelGuids, renderPolicy.labels);

      decorationOverlays.sync(layers, entities.portals, renderPolicy, ornamentVisibility, ornamentDiagnostics);
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
    getSecondaryEntityRenderUpdate, refreshPortalMarkerStylesForHighlighter, refreshKeyCountLabels, clearCoreEntityLayerGroup, clearEntityLayerIndexes,
    invalidateRenderContext: (): void => { latestEntityRenderContextKey = ''; resetPortalOverlays(); },
    resetRenderDiagnostics: (): void => { latestEntityRenderContextKey = ''; latestRenderMutationDiagnostics = null; resetPortalOverlays(); },
    getRenderDiagnostics: () => ({mutation: latestRenderMutationDiagnostics, ornaments: latestOrnamentDiagnostics}),
  };
}
