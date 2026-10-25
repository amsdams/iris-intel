import type {Layer, Map as LeafletMap, MaplibreGL} from 'leaflet';
import type {Map as VectorMap} from 'maplibre-gl';
import type {IitcIrisBaseLayerId, IitcIrisBaseLayerError} from '../messages';
import {createBaseLayer} from './base-layers';

export interface BaseLayerStatus {
  baseLayerId: IitcIrisBaseLayerId;
  baseLayerRequestedId: IitcIrisBaseLayerId;
  baseLayerError?: IitcIrisBaseLayerError;
}

/** Give transient errors/context restoration time, but never leave a blank vector map indefinitely. */
function watchVectorMap(renderer: VectorMap, fail: (error: IitcIrisBaseLayerError) => void): () => void {
  let timer: number | undefined;
  let lost = false;
  let error = false;
  const clear = (): void => { window.clearTimeout(timer); timer = undefined; };
  const arm = (reason: IitcIrisBaseLayerError, delay: number): void => {
    clear();
    if (!document.hidden) timer = window.setTimeout(() => fail(reason), delay);
  };
  const onError = (): void => { if (!error && !lost) { error = true; arm('load', 2000); } };
  const onIdle = (): void => { if (!lost) { error = false; clear(); } };
  const onLost = (): void => { lost = true; arm('webgl', 5000); };
  const onRestored = (): void => { lost = false; error = false; arm('webgl', 20_000); };
  const onVisibility = (): void => {
    if (document.hidden) { clear(); return; }
    try {
      renderer.resize();
      renderer.triggerRepaint();
      if (lost) arm('webgl', 5000);
      else if (error) arm('load', 2000);
      else if (!renderer.loaded()) arm('load', 20_000);
    } catch { fail('webgl'); }
  };
  renderer.on('error', onError);
  renderer.on('idle', onIdle);
  renderer.on('webglcontextlost', onLost);
  renderer.on('webglcontextrestored', onRestored);
  document.addEventListener('visibilitychange', onVisibility);
  arm('load', 20_000);
  return (): void => {
    clear();
    renderer.off('error', onError);
    renderer.off('idle', onIdle);
    renderer.off('webglcontextlost', onLost);
    renderer.off('webglcontextrestored', onRestored);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Own exactly one base layer and its recovery resources for this Leaflet map. */
export function createBaseLayerController(
  map: LeafletMap,
  assetBaseUrl: string,
  onStatus: (status: BaseLayerStatus) => void,
): {select: (id: IitcIrisBaseLayerId) => void; dispose: () => void} {
  let layer: Layer | undefined;
  let selected: IitcIrisBaseLayerId | undefined;
  let generation = 0;
  let disposed = false;
  let stopWatching: (() => void) | undefined;
  let failureTimer: number | undefined;

  const clear = (): void => {
    window.clearTimeout(failureTimer);
    failureTimer = undefined;
    stopWatching?.();
    stopWatching = undefined;
    if (layer) map.removeLayer(layer);
    layer = undefined;
  };
  const select = (id: IitcIrisBaseLayerId, recoveredFrom?: IitcIrisBaseLayerId, error?: IitcIrisBaseLayerError): void => {
    if (disposed || (layer && selected === id)) return;
    const owner = ++generation;
    clear();
    selected = id;
    const fail = (reason: IitcIrisBaseLayerError): void => {
      if (disposed || owner !== generation || id === 'osm' || failureTimer !== undefined) return;
      // Defer removal until Leaflet/MapLibre has finished its current add/event call.
      failureTimer = window.setTimeout(() => {
        failureTimer = undefined;
        if (!disposed && owner === generation) select('osm', id, reason);
      }, 0);
    };
    try {
      layer = createBaseLayer(id, assetBaseUrl);
      const current = layer;
      const onInitializationError = (): void => fail('webgl');
      current.on('baseerror', onInitializationError);
      stopWatching = (): void => { current.off('baseerror', onInitializationError); };
      current.addTo(map);
      if (id !== 'osm') {
        const renderer = (current as MaplibreGL).getMaplibreMap();
        if (renderer) {
          const unwatch = watchVectorMap(renderer, fail);
          stopWatching = (): void => { current.off('baseerror', onInitializationError); unwatch(); };
        } else fail('webgl');
      }
      map.setMaxZoom(id === 'osm' ? 19 : 20);
      onStatus({baseLayerId: id, baseLayerRequestedId: recoveredFrom ?? id, baseLayerError: error});
    } catch {
      if (id !== 'osm') fail('load');
    }
  };
  return {
    select,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      generation += 1;
      clear();
    },
  };
}
