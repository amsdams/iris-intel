import type {IitcIrisBaseLayerId} from '../../messages';

export const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';

export const DEFAULT_BASE_LAYER_ID: IitcIrisBaseLayerId = 'openfreemap-dark';

export function isBaseLayerId(value: unknown): value is IitcIrisBaseLayerId {
  return value === 'osm' || value === 'openfreemap-dark' || value === 'openfreemap-positron';
}

export function normalizeBaseLayerId(value: unknown): IitcIrisBaseLayerId {
  if (isBaseLayerId(value)) return value;
  if (value === 'cartodb-positron') return 'openfreemap-positron';
  // Includes the retired CARTO dark selection and missing/invalid preferences.
  return DEFAULT_BASE_LAYER_ID;
}
