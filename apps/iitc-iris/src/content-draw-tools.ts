import {
  type IitcDrawToolsItem,
} from '@iris/iitc-core';
import type {IitcIrisDrawToolsItem, IitcIrisDrawToolsLatLng} from './messages';

export interface DrawToolsTarget {
  lat: number;
  lng: number;
  label: string;
}

export const DRAW_TOOLS_MARKER_PRESETS = [
  {id: 'white', color: '#ffffff', title: 'Add white marker'},
  {id: 'red', color: '#c34a4a', title: 'Add red marker'},
  {id: 'blue', color: '#4aa8c3', title: 'Add blue marker'},
  {id: 'green', color: '#51c34a', title: 'Add green marker'},
] as const;

export const DRAW_TOOLS_DEFAULT_COLOR = '#a24ac3';

export function isSupportedDrawToolsItem(item: IitcDrawToolsItem): item is Extract<IitcDrawToolsItem, {type: 'polyline' | 'marker'}> {
  return item.type === 'polyline' || item.type === 'marker';
}

export function getDrawToolsItemCenter(item: IitcIrisDrawToolsItem): IitcIrisDrawToolsLatLng {
  if (item.type === 'marker') return item.latLng;
  const total = item.latLngs.reduce((sum, latLng) => ({
    lat: sum.lat + latLng.lat,
    lng: sum.lng + latLng.lng,
  }), {lat: 0, lng: 0});
  return {
    lat: total.lat / item.latLngs.length,
    lng: total.lng / item.latLngs.length,
  };
}

export function getDrawToolsItemLabel(item: IitcIrisDrawToolsItem, displayIndex: number): string {
  if (item.type === 'marker') return item.label ?? `Marker ${displayIndex + 1}`;
  return `Link ${displayIndex + 1}`;
}

export function getDrawToolsItemDetail(item: IitcIrisDrawToolsItem): string {
  if (item.type === 'marker') return `${item.latLng.lat.toFixed(6)}, ${item.latLng.lng.toFixed(6)}`;
  const start = item.latLngs[0];
  const end = item.latLngs[item.latLngs.length - 1];
  return `${start.lat.toFixed(6)}, ${start.lng.toFixed(6)} -> ${end.lat.toFixed(6)}, ${end.lng.toFixed(6)}`;
}

export function stripDrawToolsStorageIndex(item: IitcIrisDrawToolsItem): IitcDrawToolsItem {
  if (item.type === 'marker') {
    return {
      type: 'marker',
      latLng: item.latLng,
      color: item.color,
      label: item.label,
    };
  }
  return {
    type: 'polyline',
    latLngs: item.latLngs,
    color: item.color,
  };
}
