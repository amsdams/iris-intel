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

export function buildPanByMessage(
  direction: 'east' | 'west' | 'south' | 'north',
  offsetPx = 500
): IitcIrisMessage {
  const offsetX = direction === 'east' ? offsetPx : direction === 'west' ? -offsetPx : 0;
  const offsetY = direction === 'south' ? offsetPx : direction === 'north' ? -offsetPx : 0;
  return {
    type: IITC_IRIS_MESSAGES.panBy,
    panX: offsetX,
    panY: offsetY,
  };
}

export function buildZoomToAndShowPortalMessage(
  portalGuid?: string,
  latE6?: number,
  lngE6?: number,
  zoom = 15
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
    portalGuid,
    portalLat: latE6 === undefined ? undefined : latE6 / 1_000_000,
    portalLng: lngE6 === undefined ? undefined : lngE6 / 1_000_000,
    zoom,
  };
}

export function buildClearPortalSelectionMessage(): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.clearPortalSelection,
  };
}
