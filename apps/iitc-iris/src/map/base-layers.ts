import L, {type Layer} from 'leaflet';
import {maplibreGL} from '@maplibre/maplibre-gl-leaflet';
import {setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {IitcIrisBaseLayerId} from '../messages';

export function createBaseLayer(id: IitcIrisBaseLayerId, assetBaseUrl: string): Layer {
  if (id === 'osm') {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
  }

  // A standalone classic worker also works when the page runtime comes from an extension origin.
  setWorkerUrl(new URL(workerUrl, assetBaseUrl || window.location.href).href);
  return maplibreGL({
    style: `https://tiles.openfreemap.org/styles/${id === 'openfreemap-dark' ? 'dark' : 'positron'}`,
    interactive: false,
    attributionControl: {
      customAttribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  });
}
