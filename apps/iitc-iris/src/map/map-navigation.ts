import {clampView, type ParsedViewInput} from './map-view-settings';
import type {IitcIrisMessage} from '../messages';
import {IITC_IRIS_MESSAGES} from '../messages';

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

export function parseViewInput(value: string): ParsedViewInput | null {
  const text = value.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const ll = url.searchParams.get('ll') ?? url.searchParams.get('pll');
    const z = url.searchParams.get('z');
    if (ll) {
      const [latText, lngText] = ll.split(',');
      const parsed = {
        lat: Number(latText),
        lng: Number(lngText),
        zoom: z ? Number(z) : undefined,
      };
      if (
        Number.isFinite(parsed.lat) &&
        Number.isFinite(parsed.lng) &&
        (parsed.zoom === undefined || Number.isFinite(parsed.zoom))
      ) {
        return clampView(parsed);
      }
    }
  } catch {
    // Fall through to coordinate parsing.
  }

  const [latText, lngText, zoomText] = text.split(/[,\s]+/).filter(Boolean);
  const parsed = {
    lat: Number(latText),
    lng: Number(lngText),
    zoom: zoomText ? Number(zoomText) : undefined,
  };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  if (parsed.zoom !== undefined && !Number.isFinite(parsed.zoom)) return null;
  return clampView(parsed);
}
