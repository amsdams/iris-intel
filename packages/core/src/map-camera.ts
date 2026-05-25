export interface MapCamera {
  lat: number;
  lng: number;
  zoom: number;
}

export interface MapCameraValidationOptions {
  minZoom?: number;
  maxZoom?: number;
  rejectNullIsland?: boolean;
  nullIslandThresholdDegrees?: number;
}

const DEFAULT_MAX_ZOOM = 21;
const DEFAULT_NULL_ISLAND_THRESHOLD_DEGREES = 1;

export function isFiniteMapCamera(camera: MapCamera, options: MapCameraValidationOptions = {}): boolean {
  const minZoom = options.minZoom ?? 0;
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;

  return Number.isFinite(camera.lat)
    && Number.isFinite(camera.lng)
    && Number.isFinite(camera.zoom)
    && Math.abs(camera.lat) <= 90
    && Math.abs(camera.lng) <= 180
    && camera.zoom >= minZoom
    && camera.zoom <= maxZoom;
}

export function isNullIslandMapCamera(
  camera: Pick<MapCamera, 'lat' | 'lng'>,
  thresholdDegrees = DEFAULT_NULL_ISLAND_THRESHOLD_DEGREES,
): boolean {
  return Math.abs(camera.lat) < thresholdDegrees && Math.abs(camera.lng) < thresholdDegrees;
}

export function isUsableMapCamera(camera: MapCamera, options: MapCameraValidationOptions = {}): boolean {
  if (!isFiniteMapCamera(camera, options)) return false;
  if (options.rejectNullIsland !== false && isNullIslandMapCamera(camera, options.nullIslandThresholdDegrees)) return false;
  return true;
}

export function clampMapCamera(camera: MapCamera, options: Pick<MapCameraValidationOptions, 'minZoom' | 'maxZoom'> = {}): MapCamera {
  const minZoom = options.minZoom ?? 0;
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;

  return {
    lat: Math.max(-90, Math.min(90, camera.lat)),
    lng: Math.max(-180, Math.min(180, camera.lng)),
    zoom: Math.max(minZoom, Math.min(maxZoom, camera.zoom)),
  };
}

export function parseMapCamera(value: unknown, options: MapCameraValidationOptions = {}): MapCamera | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<MapCamera>;
  if (
    typeof candidate.lat !== 'number' ||
    typeof candidate.lng !== 'number' ||
    typeof candidate.zoom !== 'number'
  ) {
    return null;
  }

  const camera = {
    lat: candidate.lat,
    lng: candidate.lng,
    zoom: candidate.zoom,
  };

  return isUsableMapCamera(camera, options) ? camera : null;
}
