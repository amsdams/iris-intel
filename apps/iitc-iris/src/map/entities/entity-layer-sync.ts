import type L from 'leaflet';
import type {Layer as LeafletLayer} from 'leaflet';
import type {IitcIrisRenderMutationLayerDiagnostics} from '../../messages';
import type {IitcIrisEntityLayerIndex} from '../map-layers';

export interface EntityLayerSync {
  addEntityRenderedLayer: (
    layers: LeafletLayer[], index: IitcIrisEntityLayerIndex, guid: string,
    layer: LeafletLayer, group?: L.LayerGroup,
  ) => void;
  removeEntityRenderedLayers: (
    layers: LeafletLayer[], index: IitcIrisEntityLayerIndex, guid: string,
    removedLayers?: Set<LeafletLayer>, group?: L.LayerGroup,
  ) => void;
  syncEntityLayers: <T extends {guid: string}>(
    layers: LeafletLayer[], index: IitcIrisEntityLayerIndex, previousEntities: T[], nextEntities: T[],
    areLayersEqual: (previous: T, next: T) => boolean, createLayer: (entity: T) => LeafletLayer,
    group?: L.LayerGroup,
  ) => IitcIrisRenderMutationLayerDiagnostics;
}

export function compactRenderedLayers(layers: LeafletLayer[], removedLayers: Set<LeafletLayer>): void {
  if (removedLayers.size === 0) return;
  let nextIndex = 0;
  for (const layer of layers) {
    if (removedLayers.has(layer)) continue;
    layers[nextIndex] = layer;
    nextIndex += 1;
  }
  layers.length = nextIndex;
}

export function mapEntitiesByGuid<T extends {guid: string}>(entities: T[]): Map<string, T> {
  const mapped = new Map<string, T>();
  for (const entity of entities) mapped.set(entity.guid, entity);
  return mapped;
}

export function createEmptyRenderMutationLayerDiagnostics(): IitcIrisRenderMutationLayerDiagnostics {
  return {
    added: 0,
    removed: 0,
    replaced: 0,
    unchanged: 0,
  };
}

/** Remove leftovers after reference reset while retaining all currently indexed overlay layers. */
export function clearUnindexedLayers(layers: LeafletLayer[], indexes: readonly IitcIrisEntityLayerIndex[], clearLayers: (layers: LeafletLayer[]) => void): void {
  const retained = new Set(indexes.flatMap(index => [...index.values()].flat()));
  const removed = new Set(layers.filter(layer => !retained.has(layer)));
  clearLayers([...removed]);
  compactRenderedLayers(layers, removed);
}

/** Shared reconciliation used by core entities and portal overlays; state stays with each owner. */
export function createEntityLayerSync(addRenderedLayer: (layers: LeafletLayer[], layer: LeafletLayer) => void): EntityLayerSync {
  function addRenderedLayerToGroup(layers: LeafletLayer[], group: L.LayerGroup, layer: LeafletLayer): void {
    group.addLayer(layer);
    layers.push(layer);
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
  return {addEntityRenderedLayer, removeEntityRenderedLayers, syncEntityLayers};
}
