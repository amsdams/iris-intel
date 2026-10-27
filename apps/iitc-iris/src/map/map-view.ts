import type {IitcIrisBaseLayerId} from '../messages';
import {BASE_LAYER_STORAGE_KEY, DEFAULT_BASE_LAYER_ID, normalizeBaseLayerId} from './layers/base-layer-settings';
import {MAP_VIEW_STORAGE_KEY, defaultMapView, parseStoredMapView, parseUrlMapView, type StoredMapView} from './map-view-settings';

export function loadStoredMapView(): StoredMapView {
  try {
    return parseStoredMapView(window.localStorage.getItem(MAP_VIEW_STORAGE_KEY));
  } catch {
    return defaultMapView();
  }
}

export function loadUrlMapView(): StoredMapView | null {
  try {
    return parseUrlMapView(window.location.search);
  } catch {
    return null;
  }
}

export function storeMapView(view: StoredMapView): void {
  try {
    window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Local storage is optional; map sync should keep working when unavailable.
  }
}

export function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = window.localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    return normalizeBaseLayerId(value);
  } catch {
    return DEFAULT_BASE_LAYER_ID;
  }
}

export function storeBaseLayerId(value: IitcIrisBaseLayerId): void {
  try {
    window.localStorage.setItem(BASE_LAYER_STORAGE_KEY, value);
  } catch {
    // Base layer preference is optional.
  }
}

function setIntelMapCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function syncIntelMapCookies(view: StoredMapView): void {
  setIntelMapCookie('ingress.intelmap.shflt', 'hdn');
  setIntelMapCookie('ingress.intelmap.lat', String(view.lat));
  setIntelMapCookie('ingress.intelmap.lng', String(view.lng));
  setIntelMapCookie('ingress.intelmap.zoom', String(Math.round(view.zoom)));
}

export function syncUrlMapView(view: StoredMapView): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('ll', `${view.lat.toFixed(6)},${view.lng.toFixed(6)}`);
    url.searchParams.set('z', String(Math.round(view.zoom * 100) / 100));
    window.history.replaceState(window.history.state, '', url);
  } catch {
    // URL sync is diagnostic-only; ignore restricted history cases.
  }
}
