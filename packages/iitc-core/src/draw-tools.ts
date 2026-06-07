export const IITC_DRAW_TOOLS_KEY_STORAGE = 'plugin-draw-tools-layer';
export const IITC_DRAW_TOOLS_DEFAULT_COLOR = '#a24ac3';

export interface IitcDrawToolsLatLng {
  lat: number;
  lng: number;
}

export interface IitcDrawToolsPolyline {
  type: 'polyline';
  latLngs: IitcDrawToolsLatLng[];
  color?: string;
}

export interface IitcDrawToolsPolygon {
  type: 'polygon';
  latLngs: IitcDrawToolsLatLng[];
  color?: string;
}

export interface IitcDrawToolsCircle {
  type: 'circle';
  latLng: IitcDrawToolsLatLng;
  radius: number;
  color?: string;
}

export interface IitcDrawToolsMarker {
  type: 'marker';
  latLng: IitcDrawToolsLatLng;
  color?: string;
}

export type IitcDrawToolsItem =
  IitcDrawToolsPolyline |
  IitcDrawToolsPolygon |
  IitcDrawToolsCircle |
  IitcDrawToolsMarker;

export interface IitcDrawToolsImportOptions {
  merge?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFiniteNumber(value: unknown, field: string): number {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numberValue)) throw new Error(`Invalid Draw Tools ${field}`);
  return numberValue;
}

function parseLatLng(value: unknown, field: string): IitcDrawToolsLatLng {
  if (Array.isArray(value)) {
    if (value.length < 2) throw new Error(`Invalid Draw Tools ${field}`);
    return {
      lat: parseFiniteNumber(value[0], `${field}.lat`),
      lng: parseFiniteNumber(value[1], `${field}.lng`),
    };
  }

  if (!isObject(value)) throw new Error(`Invalid Draw Tools ${field}`);
  return {
    lat: parseFiniteNumber(value.lat, `${field}.lat`),
    lng: parseFiniteNumber(value.lng, `${field}.lng`),
  };
}

function parseLatLngs(value: unknown, field: string): IitcDrawToolsLatLng[] {
  if (!Array.isArray(value) || value.length < 2) throw new Error(`Invalid Draw Tools ${field}`);
  return value.map((latLng, index) => parseLatLng(latLng, `${field}[${index}]`));
}

function parseColor(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseItem(value: unknown, index: number): IitcDrawToolsItem {
  if (!isObject(value)) throw new Error(`Invalid Draw Tools item at ${index}`);

  switch (value.type) {
    case 'polyline':
      return {
        type: 'polyline',
        latLngs: parseLatLngs(value.latLngs, `item[${index}].latLngs`),
        color: parseColor(value.color),
      };
    case 'polygon':
      return {
        type: 'polygon',
        latLngs: parseLatLngs(value.latLngs, `item[${index}].latLngs`),
        color: parseColor(value.color),
      };
    case 'circle':
      return {
        type: 'circle',
        latLng: parseLatLng(value.latLng, `item[${index}].latLng`),
        radius: parseFiniteNumber(value.radius, `item[${index}].radius`),
        color: parseColor(value.color),
      };
    case 'marker':
      return {
        type: 'marker',
        latLng: parseLatLng(value.latLng, `item[${index}].latLng`),
        color: parseColor(value.color),
      };
    default:
      throw new Error(`Unknown Draw Tools item type at ${index}`);
  }
}

export function parseIitcDrawToolsLayer(input: string | unknown): IitcDrawToolsItem[] {
  const value = typeof input === 'string' ? JSON.parse(input) as unknown : input;
  if (!Array.isArray(value)) throw new Error('Invalid Draw Tools layer');
  return value.map((item, index) => parseItem(item, index));
}

export function serializeIitcDrawToolsLayer(items: readonly IitcDrawToolsItem[]): string {
  return JSON.stringify(items);
}

export function importIitcDrawToolsItems(
  currentItems: readonly IitcDrawToolsItem[],
  importedItems: readonly IitcDrawToolsItem[],
  options: IitcDrawToolsImportOptions = {},
): IitcDrawToolsItem[] {
  return options.merge === false ? [...importedItems] : [...currentItems, ...importedItems];
}
