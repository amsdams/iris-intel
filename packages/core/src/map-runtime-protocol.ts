import type {BoundsE6, LatLngBoundsDegrees} from './geo-bounds';
import type {MapCamera} from './map-camera';

export type RuntimeMapCamera = MapCamera;
export type RuntimeMapBoundsDegrees = LatLngBoundsDegrees;
export type RuntimeMapBoundsE6 = BoundsE6;

export interface RuntimeMapView extends RuntimeMapCamera {
  bounds: RuntimeMapBoundsDegrees;
}
