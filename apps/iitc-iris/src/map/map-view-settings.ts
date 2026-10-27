// Shared persisted format for UI and page contexts. Browser access stays in their adapters.
export const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
export const DEFAULT_CENTER: [number, number] = [52.3730796, 4.8924534];
// Initial overview; search navigation keeps its separate IITC zoom policy.
export const DEFAULT_ZOOM = 11;

export interface ParsedViewInput {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface StoredMapView {
  lat: number;
  lng: number;
  zoom: number;
}

export function defaultMapView(): StoredMapView {
  return {lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], zoom: DEFAULT_ZOOM};
}

export function clampView(view: StoredMapView): StoredMapView;
export function clampView(view: ParsedViewInput): ParsedViewInput;
export function clampView(view: ParsedViewInput): ParsedViewInput {
  return {
    lat: Math.max(-85.051128, Math.min(85.051128, view.lat)),
    lng: Math.max(-180, Math.min(179.999999, view.lng)),
    zoom: view.zoom === undefined ? undefined : Math.max(0, Math.min(21, view.zoom)),
  };
}

export function isStoredMapView(value: unknown): value is StoredMapView {
  if (!value || typeof value !== 'object') return false;
  const view = value as Partial<StoredMapView>;
  return (
    typeof view.lat === 'number' &&
    Number.isFinite(view.lat) &&
    typeof view.lng === 'number' &&
    Number.isFinite(view.lng) &&
    typeof view.zoom === 'number' &&
    Number.isFinite(view.zoom)
  );
}

export function parseStoredMapView(value: string | null): StoredMapView {
  try {
    if (!value) return defaultMapView();
    const parsed = JSON.parse(value) as unknown;
    return isStoredMapView(parsed) ? clampView(parsed) : defaultMapView();
  } catch {
    return defaultMapView();
  }
}

export function parseUrlMapView(search: string): StoredMapView | null {
  try {
    const params = new URLSearchParams(search);
    const ll = params.get('ll');
    const z = params.get('z');
    if (!ll || !z) return null;

    const [latText, lngText] = ll.split(',');
    const view = {
      lat: Number(latText),
      lng: Number(lngText),
      zoom: Number(z),
    };
    if (!isStoredMapView(view)) return null;
    return clampView(view);
  } catch {
    return null;
  }
}
