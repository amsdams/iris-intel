import type {BoundsE6, LatLngBoundsDegrees} from './geo-bounds';
import type {MapCamera} from './map-camera';

export type RuntimeMapCamera = MapCamera;
export type RuntimeMapBoundsDegrees = LatLngBoundsDegrees;
export type RuntimeMapBoundsE6 = BoundsE6;
export type RuntimeMapEntitySelectionKind = 'portal' | 'link' | 'field';
export type RuntimeMapSelectionIntent = 'select' | 'details';

export interface RuntimeMapView extends RuntimeMapCamera {
  bounds: RuntimeMapBoundsDegrees;
}

export function runtimeMapSelectionIntentFromOpenInfo(openInfo: boolean | null | undefined): RuntimeMapSelectionIntent {
  return openInfo === true ? 'details' : 'select';
}

export function runtimeMapSelectionOpenInfoFromIntent(intent: RuntimeMapSelectionIntent): boolean {
  return intent === 'details';
}
