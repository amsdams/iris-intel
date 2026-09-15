import {buildUserLocationMessage, parseAndBuildViewInputJump} from './content-map-navigation';
import type {IitcIrisMessage} from './messages';

export const GEOLOCATION_MAX_ZOOM = 13;

export interface ViewPreset {
  lat: number;
  lng: number;
  zoom: number;
}

export function jumpToPresetAction(
  preset: ViewPreset,
  setMapView: (lat: number, lng: number, zoom?: number) => void
): void {
  setMapView(preset.lat, preset.lng, preset.zoom);
}

export function jumpToViewInputAction(
  viewInput: string,
  currentZoom: number,
  setMapView: (lat: number, lng: number, zoom?: number) => void,
  setViewInputStatus: (status: string) => void,
  setTimeoutFn: (fn: () => void, ms: number) => unknown = window.setTimeout
): void {
  const res = parseAndBuildViewInputJump(viewInput, currentZoom);
  if ('error' in res) {
    setViewInputStatus('bad view');
    setTimeoutFn(() => setViewInputStatus(''), 1600);
    return;
  }

  setMapView(res.lat, res.lng, res.zoom);
  setViewInputStatus('jumped');
  setTimeoutFn(() => setViewInputStatus(''), 1200);
}

export interface GeolocationPositionCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationPositionError {
  code: number;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
}

export function locateBrowserPositionAction(
  hasGeolocation: boolean,
  getCurrentPosition: (
    success: (position: {coords: GeolocationPositionCoords}) => void,
    error: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ) => void,
  setMapView: (lat: number, lng: number, zoom?: number) => void,
  setGeolocationStatus: (status: string) => void,
  postMessageFn: (message: IitcIrisMessage) => void,
  setTimeoutFn: (fn: () => void, ms: number) => unknown = window.setTimeout
): void {
  if (!hasGeolocation) {
    setGeolocationStatus('unavailable');
    setTimeoutFn(() => setGeolocationStatus(''), 1800);
    return;
  }

  setGeolocationStatus('locating...');
  getCurrentPosition(
    (position) => {
      postMessageFn(
        buildUserLocationMessage(position.coords.latitude, position.coords.longitude, position.coords.accuracy)
      );
      setMapView(position.coords.latitude, position.coords.longitude, GEOLOCATION_MAX_ZOOM);
      setGeolocationStatus(
        position.coords.accuracy ? `located +/- ${Math.round(position.coords.accuracy)}m` : 'located'
      );
      setTimeoutFn(() => setGeolocationStatus(''), 2200);
    },
    (error) => {
      const message =
        error.code === error.PERMISSION_DENIED
          ? 'permission denied'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'unavailable'
            : 'timeout';
      setGeolocationStatus(message);
      setTimeoutFn(() => setGeolocationStatus(''), 2200);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 10_000,
    }
  );
}
