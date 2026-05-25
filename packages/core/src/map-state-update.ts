import type {MapCamera} from './map-camera';

export interface MapCameraState extends MapCamera {
  bounds?: unknown;
}

export type BoundsEqual<TBounds> = (a: TBounds | undefined, b: TBounds | undefined) => boolean;

const DEFAULT_CAMERA_EPSILON = 0.000001;
const DEFAULT_ZOOM_EPSILON = 0.001;

export function isSameMapCamera(
  previous: MapCamera,
  next: MapCamera,
  options: {coordinateEpsilon?: number; zoomEpsilon?: number} = {},
): boolean {
  const coordinateEpsilon = options.coordinateEpsilon ?? DEFAULT_CAMERA_EPSILON;
  const zoomEpsilon = options.zoomEpsilon ?? DEFAULT_ZOOM_EPSILON;

  return Math.abs(previous.lat - next.lat) < coordinateEpsilon &&
    Math.abs(previous.lng - next.lng) < coordinateEpsilon &&
    Math.abs(previous.zoom - next.zoom) < zoomEpsilon;
}

export function applyMapCameraUpdate<TState extends MapCamera>(
  previous: TState,
  next: MapCamera,
): TState {
  if (isSameMapCamera(previous, next)) return previous;
  return {
    ...previous,
    lat: next.lat,
    lng: next.lng,
    zoom: next.zoom,
  };
}

export function applyMapViewportUpdate<TBounds, TState extends MapCameraState & {bounds?: TBounds}>(
  previous: TState,
  next: MapCamera & {bounds: TBounds},
  boundsEqual: BoundsEqual<TBounds> = Object.is,
): TState {
  if (isSameMapCamera(previous, next) && boundsEqual(previous.bounds, next.bounds)) {
    return previous;
  }

  return {
    ...previous,
    lat: next.lat,
    lng: next.lng,
    zoom: next.zoom,
    bounds: next.bounds,
  };
}
