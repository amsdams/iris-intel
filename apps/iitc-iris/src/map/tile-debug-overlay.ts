import type {IitcGetEntitiesResponse, IitcMapDataPlan} from '@iris/iitc-core';
import L, {type Layer as LeafletLayer} from 'leaflet';
import {getLayerPane} from './map-layers';

export function createTileDebugOverlay(
  hasMap: () => boolean,
  isVisible: () => boolean,
  clearLayers: () => void,
  addLayer: (layer: LeafletLayer) => void,
): (plan: IitcMapDataPlan, response: IitcGetEntitiesResponse) => void {
  function renderTileDebug(plan: IitcMapDataPlan, response: IitcGetEntitiesResponse): void {
    if (!hasMap()) return;
    clearLayers();
    if (!isVisible()) return;

    const tilePayloads = response.result?.map ?? {};
    for (const tile of plan.tiles) {
      const payload = tilePayloads[tile.id];
      const entityCount = payload?.gameEntities?.length ?? 0;
      const color = payload ? (entityCount > 0 ? '#00ff73' : '#ffce00') : '#ff1010';

      addLayer(L.rectangle([
        [tile.bounds.south, tile.bounds.west],
        [tile.bounds.north, tile.bounds.east],
      ], {
        color,
        fillColor: color,
        fillOpacity: entityCount > 0 ? 0.08 : 0.14,
        opacity: 0.75,
        pane: getLayerPane('tiles'),
        weight: 1,
        interactive: false,
      }));
    }
  }
  return renderTileDebug;
}
