import {
  parseIitcDrawToolsLayer,
  serializeIitcDrawToolsLayer,
  type IitcPortalsListEntry,
  type IitcDrawToolsItem,
} from '@iris/iitc-core';
import type {IitcIrisDrawToolsItem, IitcIrisDrawToolsLatLng} from './messages';

export interface DrawToolsTarget {
  lat: number;
  lng: number;
  label: string;
}

export interface DrawToolsMarkerPortalInfo {
  title: string;
  team: IitcPortalsListEntry['team'];
  level: number;
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

export function getDrawToolsItemDistanceMeters(
  item: IitcIrisDrawToolsItem,
  origin: IitcIrisDrawToolsLatLng,
): number {
  const center = getDrawToolsItemCenter(item);
  const toRadians = (value: number): number => value * Math.PI / 180;
  const radiusMeters = 6_371_000;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(center.lat);
  const deltaLat = toRadians(center.lat - origin.lat);
  const deltaLng = toRadians(center.lng - origin.lng);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function sortDrawToolsItemsByDistance<T extends IitcIrisDrawToolsItem>(
  items: readonly T[],
  origin: IitcIrisDrawToolsLatLng,
): T[] {
  return [...items].sort((left, right) => (
    getDrawToolsItemDistanceMeters(left, origin) - getDrawToolsItemDistanceMeters(right, origin)
  ));
}

function toLatLngE6(latLng: IitcIrisDrawToolsLatLng): {latE6: number; lngE6: number} {
  return {
    latE6: Math.round(latLng.lat * 1_000_000),
    lngE6: Math.round(latLng.lng * 1_000_000),
  };
}

export function getDrawToolsMarkerPortalInfo(
  marker: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>,
  portals: readonly IitcPortalsListEntry[],
): DrawToolsMarkerPortalInfo | null {
  const markerLatLng = toLatLngE6(marker.latLng);
  const portal = portals.find((candidate) => (
    candidate.latE6 === markerLatLng.latE6 &&
    candidate.lngE6 === markerLatLng.lngE6
  ));
  if (!portal) return null;
  return {
    title: portal.title,
    team: portal.team,
    level: portal.level,
  };
}

export function getDrawToolsMarkerPortalInfoByStorageIndex(
  markers: readonly Extract<IitcIrisDrawToolsItem, {type: 'marker'}>[],
  portals: readonly IitcPortalsListEntry[],
): Record<number, DrawToolsMarkerPortalInfo> {
  const infoByStorageIndex: Record<number, DrawToolsMarkerPortalInfo> = {};
  for (const marker of markers) {
    const info = getDrawToolsMarkerPortalInfo(marker, portals);
    if (info) infoByStorageIndex[marker.storageIndex] = info;
  }
  return infoByStorageIndex;
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

export interface DrawToolsImportPreparation {
  supportedItems: Extract<IitcDrawToolsItem, {type: 'polyline' | 'marker'}>[];
  supportedJson: string;
  supportedCount: number;
  skippedCount: number;
}

export function prepareDrawToolsImport(jsonText: string): DrawToolsImportPreparation {
  const parsedItems = parseIitcDrawToolsLayer(jsonText);
  const supportedItems = parsedItems.filter(isSupportedDrawToolsItem);
  const skippedCount = parsedItems.length - supportedItems.length;
  if (supportedItems.length === 0) {
    throw new Error('no supported links or markers');
  }
  return {
    supportedItems,
    supportedJson: serializeIitcDrawToolsLayer(supportedItems),
    supportedCount: supportedItems.length,
    skippedCount,
  };
}

export function filterAndSerializeDrawToolsItems(
  items: readonly IitcIrisDrawToolsItem[],
  itemType?: 'polyline' | 'marker',
): string {
  const filtered = items
    .filter((item) => !itemType || item.type === itemType)
    .map(stripDrawToolsStorageIndex);
  return serializeIitcDrawToolsLayer(filtered);
}
