import L, {type Layer as LeafletLayer} from 'leaflet';
import {getLayerPane} from './map-layers';

export function createUserLocationOverlay(
  clearLayers: () => void,
  addLayer: (layer: LeafletLayer) => void,
): (lat: number | undefined, lng: number | undefined, accuracy: number | undefined) => void {
  function renderUserLocation(lat: number | undefined, lng: number | undefined, accuracy: number | undefined): void {
    clearLayers();
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const latLng: [number, number] = [lat, lng];
    if (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0) {
      addLayer(L.circle(latLng, {
        radius: accuracy,
        color: '#65d9ff',
        fillColor: '#65d9ff',
        fillOpacity: 0.08,
        opacity: 0.24,
        pane: getLayerPane('userLocation'),
        interactive: false,
        weight: 1,
      }));
    }
    addLayer(L.marker(latLng, {
      icon: L.divIcon({
        className: 'iitc-iris-user-location-pin',
        html: '<span></span>',
        iconSize: [22, 30],
        iconAnchor: [11, 30],
      }),
      pane: getLayerPane('userLocation'),
      interactive: false,
    }));
  }
  return renderUserLocation;
}
