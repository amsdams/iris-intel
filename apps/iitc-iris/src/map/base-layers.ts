import L, {type Layer, type Map as LeafletMap} from 'leaflet';
import {MaplibreGL} from '@maplibre/maplibre-gl-leaflet';
import {setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {IitcIrisBaseLayerId} from '../messages';

// The binding assumes WebGL initialization succeeded in onRemove. Keep a failed
// initialization removable through Leaflet's normal lifecycle, without private fields.
class OpenFreeMapLayer extends MaplibreGL {
  override onAdd(map: LeafletMap): this {
    try { super.onAdd(map); }
    catch { this.fire('baseerror'); }
    return this;
  }

  override onRemove(map: LeafletMap): this {
    if (this.getMaplibreMap()) super.onRemove(map);
    else this.getContainer()?.remove();
    return this;
  }
}

export function createBaseLayer(id: IitcIrisBaseLayerId, assetBaseUrl: string): Layer {
  if (id === 'osm') {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
  }

  // A standalone classic worker also works when the page runtime comes from an extension origin.
  setWorkerUrl(new URL(workerUrl, assetBaseUrl || window.location.href).href);
  return new OpenFreeMapLayer({
    style: `https://tiles.openfreemap.org/styles/${id === 'openfreemap-dark' ? 'dark' : 'positron'}`,
    interactive: false,
    attributionControl: {
      customAttribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  });
}
