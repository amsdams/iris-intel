import {clampView} from './content-scenarios';
import type {IitcIrisMessage} from './messages';
import {IITC_IRIS_MESSAGES} from './messages';

export function buildSetViewMessage(
  lat: number,
  lng: number,
  zoom: number
): IitcIrisMessage {
  const clamped = clampView({lat, lng, zoom});
  return {
    type: IITC_IRIS_MESSAGES.setView,
    lat: clamped.lat,
    lng: clamped.lng,
    zoom: clamped.zoom ?? zoom,
  };
}

export function calculateZoomView(
  currentCamera: {lat: number; lng: number; zoom: number},
  delta: number
): {lat: number; lng: number; zoom: number} {
  const clamped = clampView({
    lat: currentCamera.lat,
    lng: currentCamera.lng,
    zoom: currentCamera.zoom + delta,
  });
  return {
    lat: clamped.lat,
    lng: clamped.lng,
    zoom: clamped.zoom ?? currentCamera.zoom + delta,
  };
}
