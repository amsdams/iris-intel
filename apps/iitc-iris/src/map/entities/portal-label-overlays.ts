import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import type {IitcIrisLayerSettings, IitcIrisRenderPortal, IitcIrisRenderEntities} from '../../messages';
import {IITC_TEAM_COLORS} from '../../iitc-colors';
import {getLayerPane, type IitcIrisEntityLayerIndex, type IitcIrisMapLayers} from '../map-layers';
import {getPortalLevel} from './portal-marker-style';
import {getVisibleLevelLabelGuids as selectVisibleLevelLabels} from './portal-level-numbers';
import {createPortalKeyCountCanvas, createPortalKeyCountLabel, createPortalLevelCanvas, createPortalLevelLabel} from './portal-label-canvas';
import {clearUnindexedLayers, type EntityLayerSync} from './entity-layer-sync';

interface LabelOverlayOptions {
  getMap: () => LeafletMap | undefined;
  getLayerSettings: () => IitcIrisLayerSettings;
  getPortalKeyCount: (guid: string) => number | undefined;
  getPortalRadius: (level: number | undefined, isPlaceholder: boolean) => number;
  syncEntityLayers: EntityLayerSync['syncEntityLayers'];
  clearRenderedLayers: (layers: LeafletLayer[]) => void;
}
interface PortalLabelOverlays {
  getVisibleLevelLabelGuids: (portals: IitcIrisRenderPortal[]) => Set<string>;
  sync: (layers: IitcIrisMapLayers, portals: IitcIrisRenderPortal[], visibleLevelLabelGuids: Set<string>, labelsEnabled: boolean) => void;
  syncKeys: (layers: IitcIrisMapLayers, portals: IitcIrisRenderPortal[]) => void;
  clearUnindexed: (layers: IitcIrisMapLayers) => void;
  resetReferences: () => void;
}

/** Page-owned label indexes; Canvas resources remain map-owned. Reset forgets references, not layers. */
export function createPortalLabelOverlays({getMap, getLayerSettings, getPortalKeyCount, getPortalRadius,
  syncEntityLayers, clearRenderedLayers}: LabelOverlayOptions): PortalLabelOverlays {
  const toLatLng = (latE6: number, lngE6: number): [number, number] => [latE6 / 1e6, lngE6 / 1e6];
  interface KeyBadge {guid: string; latE6: number; lngE6: number; count: number; radius: number}

  const keyLabelIndex: IitcIrisEntityLayerIndex = new Map();
  let previousKeyBadges: KeyBadge[] = [];
  const levelLabelIndex: IitcIrisEntityLayerIndex = new Map();
  let previousLevelLabelPortals: IitcIrisRenderPortal[] = [];

  function createKeyCountMarker(latLng: [number, number], count: number, portalRadius: number): LeafletLayer {
    const map = getMap() as (LeafletMap & {__iitcIrisKeyCountRenderer?: L.Canvas}) | undefined;
    if (!map) throw new Error('Cannot create key-count labels without a map');
    map.__iitcIrisKeyCountRenderer ??= createPortalKeyCountCanvas(getLayerPane('labels'));
    return createPortalKeyCountLabel(latLng, count, portalRadius, map.__iitcIrisKeyCountRenderer);
  }

  function createLevelLabelMarker(latLng: [number, number], level: number, team: keyof typeof IITC_TEAM_COLORS): LeafletLayer {
    const map = getMap() as (LeafletMap & {__iitcIrisLevelLabelRenderer?: L.Canvas}) | undefined;
    if (!map) throw new Error('Cannot create portal level labels without a map');
    map.__iitcIrisLevelLabelRenderer ??= createPortalLevelCanvas(getLayerPane('labels'));
    return createPortalLevelLabel(latLng, level, team, map.__iitcIrisLevelLabelRenderer);
  }

  function getLevelLabelCandidates(portals: IitcIrisRenderEntities['portals']): Parameters<typeof selectVisibleLevelLabels>[0] {
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

  function syncKeyLabels(layers: IitcIrisMapLayers, badges: KeyBadge[]): void {
    syncEntityLayers(
      layers.labels, keyLabelIndex, previousKeyBadges, badges,
      (previous, next) => previous.count === next.count && previous.radius === next.radius &&
        previous.latE6 === next.latE6 && previous.lngE6 === next.lngE6,
      (badge) => createKeyCountMarker(toLatLng(badge.latE6, badge.lngE6), badge.count, badge.radius),
    );
    previousKeyBadges = badges;
  }

  function getKeyBadges(portals: IitcIrisRenderPortal[]): KeyBadge[] {
    if (!getLayerSettings().keyCount) return [];
    const badges: KeyBadge[] = [];
    for (const portal of portals) {
      const count = getPortalKeyCount(portal.guid);
      if (count !== undefined && count > 0) {
        badges.push({guid: portal.guid, latE6: portal.latE6, lngE6: portal.lngE6, count,
          radius: getPortalRadius(portal.level, portal.isPlaceholder)});
      }
    }
    return badges;
  }

  return {
    getVisibleLevelLabelGuids: portals => selectVisibleLevelLabels(getLevelLabelCandidates(portals)),
    sync: (layers, portals, visibleLevelLabelGuids, labelsEnabled): void => {
      const levelLabelPortals: IitcIrisRenderPortal[] = [];
      for (const portal of portals) {
        if (labelsEnabled && visibleLevelLabelGuids.has(portal.guid) && portal.level !== undefined) levelLabelPortals.push(portal);
      }
      syncLevelLabels(layers, levelLabelPortals);
      syncKeyLabels(layers, getKeyBadges(portals));
    },
    syncKeys: (layers, portals): void => syncKeyLabels(layers, getKeyBadges(portals)),
    clearUnindexed: layers => clearUnindexedLayers(layers.labels, [levelLabelIndex, keyLabelIndex], clearRenderedLayers),
    resetReferences: (): void => {
      keyLabelIndex.clear();
      previousKeyBadges = [];
      levelLabelIndex.clear();
      previousLevelLabelPortals = [];
    },
  };
}
