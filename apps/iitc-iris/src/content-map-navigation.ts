import {parseViewInput} from './content-scenarios';
import type {IitcIrisMessage} from './messages';
import {IITC_IRIS_MESSAGES} from './messages';

export interface ViewInputParseResult {
  lat: number;
  lng: number;
  zoom: number;
  statusText: string;
}

export function parseAndBuildViewInputJump(
  viewInputText: string,
  currentZoom: number
): ViewInputParseResult | {error: string} {
  const parsed = parseViewInput(viewInputText);
  if (!parsed) {
    return {error: 'invalid coords or url'};
  }
  const zoom = parsed.zoom ?? currentZoom;
  const statusText = parsed.zoom !== undefined ? 'jumped to location and zoom' : 'jumped to location';
  return {
    lat: parsed.lat,
    lng: parsed.lng,
    zoom,
    statusText,
  };
}

export function buildUserLocationMessage(
  lat: number,
  lng: number,
  accuracy: number
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.setUserLocation,
    userLat: lat,
    userLng: lng,
    userAccuracy: accuracy,
  };
}
