import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import {getIitcOrnamentDefinition, isIitcExcludedOrnament, parseIitcOrnamentVisibilitySettings, type IitcOrnamentVisibilitySettings} from '@iris/iitc-core';
import type {IitcIrisRenderPolicy, IitcIrisRenderPortal} from '../../messages';
import {getLayerPane, type IitcIrisEntityLayerIndex, type IitcIrisMapLayers} from '../map-layers';
import {getPortalMarkerScale} from './portal-marker-style';
import {createPortalImage, createPortalImageCanvas, type PortalImage} from './portal-image-canvas';
import {clearUnindexedLayers, type EntityLayerSync} from './entity-layer-sync';

export interface OrnamentDiagnostics {
  drawnMarkers: number;
  hiddenMarkers: number;
  types: Record<string, number>;
}

export function createEmptyOrnamentDiagnostics(): OrnamentDiagnostics {
  return {
    drawnMarkers: 0,
    hiddenMarkers: 0,
    types: {},
  };
}

interface DecorationOverlayOptions {
  getMap: () => LeafletMap | undefined;
  defaultZoom: number;
  getPortalRadius: (level: number | undefined, isPlaceholder: boolean) => number;
  syncEntityLayers: EntityLayerSync['syncEntityLayers'];
  clearRenderedLayers: (layers: LeafletLayer[]) => void;
}
interface PortalDecorationOverlays {
  loadVisibility: () => IitcOrnamentVisibilitySettings;
  sync: (layers: IitcIrisMapLayers, portals: IitcIrisRenderPortal[], policy: IitcIrisRenderPolicy,
    visibility: IitcOrnamentVisibilitySettings, diagnostics: OrnamentDiagnostics) => void;
  clearUnindexed: (layers: IitcIrisMapLayers) => void;
  resetReferences: () => void;
}

/** Own decoration references/specifications; the image Canvas owns map resources and asynchronous loads. */
export function createPortalDecorationOverlays({getMap, defaultZoom, getPortalRadius,
  syncEntityLayers, clearRenderedLayers}: DecorationOverlayOptions): PortalDecorationOverlays {
  const toLatLng = (latE6: number, lngE6: number): [number, number] => [latE6 / 1e6, lngE6 / 1e6];
  interface Decoration extends PortalImage {guid: string; latE6: number; lngE6: number}

  const decorationIndexes: Record<'ornaments' | 'artifacts', IitcIrisEntityLayerIndex> = {
    ornaments: new Map(), artifacts: new Map(),
  };

  const previousDecorations: Record<'ornaments' | 'artifacts', Decoration[]> = {ornaments: [], artifacts: []};

  function syncDecorations(layers: IitcIrisMapLayers, key: 'ornaments' | 'artifacts', decorations: Decoration[]): void {
    syncEntityLayers(
      layers[key], decorationIndexes[key], previousDecorations[key], decorations,
      (a, b) => a.latE6 === b.latE6 && a.lngE6 === b.lngE6 && a.url === b.url && a.size === b.size &&
        a.anchorX === b.anchorX && a.anchorY === b.anchorY && a.opacity === b.opacity && a.zIndexOffset === b.zIndexOffset,
      (decoration) => {
        const map = getMap() as (LeafletMap & {__iitcIrisImageRenderers?: Partial<Record<typeof key, L.Canvas>>}) | undefined;
        if (!map) throw new Error('Cannot create portal decorations without a map');
        const renderers = map.__iitcIrisImageRenderers ??= {};
        const renderer = renderers[key] ??= createPortalImageCanvas(getLayerPane(key), `iitc-iris-${key}-canvas`);
        return createPortalImage(toLatLng(decoration.latE6, decoration.lngE6), decoration, renderer);
      },
    );
    for (const decoration of decorations) {
      for (const layer of decorationIndexes[key].get(decoration.guid) ?? []) {
        const imageLayer = layer as L.CircleMarker & {options: L.CircleMarkerOptions & {portalImage: PortalImage}};
        if (imageLayer.options.portalImage.order === decoration.order) continue;
        imageLayer.options.portalImage.order = decoration.order;
        imageLayer.redraw();
      }
    }
    previousDecorations[key] = decorations;
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

  function sync(layers: IitcIrisMapLayers, portals: IitcIrisRenderPortal[], renderPolicy: IitcIrisRenderPolicy,
    ornamentVisibility: IitcOrnamentVisibilitySettings, ornamentDiagnostics: OrnamentDiagnostics): void {
    const artifacts: Decoration[] = [];
    if (renderPolicy.artifacts) {
      for (const portal of portals) {
        if (portal.isPlaceholder || !portal.artifacts?.length) continue;
        for (const [index, artifact] of portal.artifacts.entries()) {
          const isTarget = artifact.role === 'target';
          const size = isTarget ? 50 : 30;
          const suffix = isTarget ? 'shard_target' : 'shard';
          artifacts.push({guid: JSON.stringify([portal.guid, index]), latE6: portal.latE6, lngE6: portal.lngE6,
            url: `https://commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/${artifact.type}_${suffix}.png`,
            size, anchorX: size / 2, anchorY: size / 2, opacity: isTarget ? 1 : 0.6,
            zIndexOffset: isTarget ? 1200 : 1100, order: artifacts.length});
        }
      }
    }
    syncDecorations(layers, 'artifacts', artifacts);

    const ornaments: Decoration[] = [];
    if (renderPolicy.ornaments) {
      const size = Math.round(60 * getPortalMarkerScale(getMap()?.getZoom() ?? defaultZoom));
      for (const portal of portals) {
        if (!portal.ornaments?.length) continue;
        const radius = getPortalRadius(portal.level, portal.isPlaceholder);
        for (const [index, ornament] of portal.ornaments.entries()) {
          ornamentDiagnostics.types[ornament] = (ornamentDiagnostics.types[ornament] ?? 0) + 1;
          if (isIitcExcludedOrnament(ornament, ornamentVisibility)) {
            ornamentDiagnostics.hiddenMarkers += 1;
            continue;
          }
          ornamentDiagnostics.drawnMarkers += 1;
          const definition = getIitcOrnamentDefinition(ornament);
          const offset = definition?.url && definition.offset ? definition.offset : [0, 0];
          ornaments.push({guid: JSON.stringify([portal.guid, index]), latE6: portal.latE6, lngE6: portal.lngE6,
            url: definition?.url ?? `https://commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/${ornament}.png`,
            size, anchorX: size * offset[0] + size / 2, anchorY: size * offset[1] + size / 2,
            opacity: definition?.opacity ?? 0.6, zIndexOffset: Math.round(radius), order: ornaments.length});
        }
      }
    }
    syncDecorations(layers, 'ornaments', ornaments);
  }

  return {
    loadVisibility: loadOrnamentVisibilitySettings,
    sync,
    clearUnindexed: (layers): void => {
      for (const key of ['ornaments', 'artifacts'] as const) clearUnindexedLayers(layers[key], [decorationIndexes[key]], clearRenderedLayers);
    },
    // Reset only references, including during map replacement. Removal remains explicitly ordered by the caller.
    resetReferences: (): void => {
      decorationIndexes.ornaments.clear();
      decorationIndexes.artifacts.clear();
      previousDecorations.ornaments = [];
      previousDecorations.artifacts = [];
    },
  };
}
