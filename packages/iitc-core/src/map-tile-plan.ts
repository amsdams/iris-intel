import {getIitcDataZoomForMapZoom, getIitcMapZoomTileParameters, type IitcTileParams} from './tile-params';
import type {IitcGetEntitiesResponse} from './entity-decode';
import {classifyIitcGetEntitiesResponse, type IitcTileResponseClassification} from './map-tile-response';
import {createIitcRequestBatches, createIitcSequentialTileBatches} from './map-tile-queue';

/** IITC map.Request: REFRESH_CLOSE/FAR and FETCH_TO_REFRESH_FACTOR. */
export function getIitcMapRefreshDelayMs(zoom: number, fetchDurationMs: number): number {
  return Math.max(zoom > 12 ? 300_000 : 900_000, fetchDurationMs * 2);
}

export const IITC_MAX_LATITUDE = 85.051128;
export const IITC_MAX_LONGITUDE = 179.999999;

export interface IitcLatLng {
  lat: number;
  lng: number;
}

export interface IitcBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface IitcTile {
  id: string;
  x: number;
  y: number;
  bounds: IitcBounds;
  distanceSquared: number;
}

export interface IitcMapDataPlan {
  mapZoom: number;
  dataZoom: number;
  tileParams: IitcTileParams;
  viewportBounds: IitcBounds;
  dataBounds: IitcBounds;
  xRange: [number, number];
  yRange: [number, number];
  tiles: IitcTile[];
  tileKeys: string[];
  requestBatches: string[][];
}

export interface IitcMapDataPlanOptions {
  minZoom?: number;
  boundsPaddingRatio?: number;
  tilesPerRequest?: number;
  sequentialRequestBatches?: boolean;
}

export interface IitcFetchedDataParams {
  mapZoom: number;
  dataBounds: IitcBounds;
}

export interface IitcNextDataParams {
  mapZoom: number;
  viewportBounds: IitcBounds;
}

export interface IitcNextDataCacheParams extends IitcNextDataParams {
  tileKeys: string[];
}

function clamp(value: number, max: number, min: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeBounds(bounds: IitcBounds): IitcBounds {
  return {
    south: Math.min(bounds.south, bounds.north),
    west: Math.min(bounds.west, bounds.east),
    north: Math.max(bounds.south, bounds.north),
    east: Math.max(bounds.west, bounds.east),
  };
}

function expandBounds(bounds: IitcBounds, ratio: number): IitcBounds {
  const paddingRatio = Math.max(0, ratio);
  const latPadding = (bounds.north - bounds.south) * paddingRatio;
  const lngPadding = (bounds.east - bounds.west) * paddingRatio;

  return {
    south: bounds.south - latPadding,
    west: bounds.west - lngPadding,
    north: bounds.north + latPadding,
    east: bounds.east + lngPadding,
  };
}

export function clampIitcLatLng(latLng: IitcLatLng): IitcLatLng {
  return {
    lat: clamp(latLng.lat, IITC_MAX_LATITUDE, -IITC_MAX_LATITUDE),
    lng: clamp(latLng.lng, IITC_MAX_LONGITUDE, -180),
  };
}

export function clampIitcBounds(bounds: IitcBounds): IitcBounds {
  const normalized = normalizeBounds(bounds);
  const southWest = clampIitcLatLng({lat: normalized.south, lng: normalized.west});
  const northEast = clampIitcLatLng({lat: normalized.north, lng: normalized.east});

  return {
    south: southWest.lat,
    west: southWest.lng,
    north: northEast.lat,
    east: northEast.lng,
  };
}

export function iitcBoundsContainsBounds(outer: IitcBounds, inner: IitcBounds): boolean {
  const normalizedOuter = clampIitcBounds(outer);
  const normalizedInner = clampIitcBounds(inner);
  return normalizedOuter.south <= normalizedInner.south &&
    normalizedOuter.west <= normalizedInner.west &&
    normalizedOuter.north >= normalizedInner.north &&
    normalizedOuter.east >= normalizedInner.east;
}

export function shouldRefreshIitcMapData(previous: IitcFetchedDataParams | null | undefined, next: IitcNextDataParams): boolean {
  if (!previous) return true;
  if (previous.mapZoom !== next.mapZoom) return true;
  return !iitcBoundsContainsBounds(previous.dataBounds, next.viewportBounds);
}

export function getIitcReusableCacheClassification(
  previous: IitcFetchedDataParams | null | undefined,
  next: IitcNextDataCacheParams,
  response: IitcGetEntitiesResponse | null | undefined,
): IitcTileResponseClassification | null {
  if (!response || shouldRefreshIitcMapData(previous, next)) return null;

  const classification = classifyIitcGetEntitiesResponse(response, next.tileKeys);
  return classification.unaccountedTileKeys.length === 0 ? classification : null;
}

export function lngToIitcTile(lng: number, params: IitcTileParams): number {
  return Math.floor(((lng + 180) / 360) * params.tilesPerEdge);
}

export function latToIitcTile(lat: number, params: IitcTileParams): number {
  const latRadians = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * params.tilesPerEdge);
}

export function iitcTileToLng(x: number, params: IitcTileParams): number {
  return (x / params.tilesPerEdge) * 360 - 180;
}

export function iitcTileToLat(y: number, params: IitcTileParams): number {
  const n = Math.PI - (2 * Math.PI * y) / params.tilesPerEdge;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function pointToIitcTileId(params: IitcTileParams, x: number, y: number): string {
  return `${params.zoom}_${x}_${y}_${params.level}_8_100`;
}

function projectLatLng(latLng: IitcLatLng, zoom: number): {x: number; y: number} {
  const lat = clamp(latLng.lat, IITC_MAX_LATITUDE, -IITC_MAX_LATITUDE);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;

  return {
    x: ((latLng.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

export function createIitcMapDataPlan(
  bounds: IitcBounds,
  center: IitcLatLng,
  mapZoom: number,
  options: IitcMapDataPlanOptions | number = {},
): IitcMapDataPlan {
  const minZoom = typeof options === 'number' ? options : options.minZoom ?? 0;
  const boundsPaddingRatio = typeof options === 'number' ? 0 : options.boundsPaddingRatio ?? 0;
  const tilesPerRequest = typeof options === 'number' ? undefined : options.tilesPerRequest;
  const sequentialRequestBatches = typeof options === 'number' ? false : options.sequentialRequestBatches ?? false;
  const viewportBounds = clampIitcBounds(bounds);
  const requestBounds = clampIitcBounds(expandBounds(viewportBounds, boundsPaddingRatio));
  const dataZoom = getIitcDataZoomForMapZoom(mapZoom, minZoom);
  const tileParams = getIitcMapZoomTileParameters(dataZoom);
  const centerPoint = projectLatLng(center, mapZoom);

  const x1 = lngToIitcTile(requestBounds.west, tileParams);
  const x2 = lngToIitcTile(requestBounds.east, tileParams);
  const y1 = latToIitcTile(requestBounds.north, tileParams);
  const y2 = latToIitcTile(requestBounds.south, tileParams);

  const dataBounds = {
    south: iitcTileToLat(y2 + 1, tileParams),
    west: iitcTileToLng(x1, tileParams),
    north: iitcTileToLat(y1, tileParams),
    east: iitcTileToLng(x2 + 1, tileParams),
  };
  const tiles: IitcTile[] = [];

  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const north = iitcTileToLat(y, tileParams);
      const south = iitcTileToLat(y + 1, tileParams);
      const west = iitcTileToLng(x, tileParams);
      const east = iitcTileToLng(x + 1, tileParams);
      const tilePoint = projectLatLng({lat: (north + south) / 2, lng: (west + east) / 2}, mapZoom);
      const deltaX = centerPoint.x - tilePoint.x;
      const deltaY = centerPoint.y - tilePoint.y;

      tiles.push({
        id: pointToIitcTileId(tileParams, x, y),
        x,
        y,
        bounds: {south, west, north, east},
        distanceSquared: deltaX * deltaX + deltaY * deltaY,
      });
    }
  }

  tiles.sort((a, b) => a.distanceSquared - b.distanceSquared);

  const tileKeys = tiles.map((tile) => tile.id);

  return {
    mapZoom,
    dataZoom,
    tileParams,
    viewportBounds,
    dataBounds,
    xRange: [x1, x2],
    yRange: [y1, y2],
    tiles,
    tileKeys,
    requestBatches: sequentialRequestBatches && tilesPerRequest
      ? createIitcSequentialTileBatches(tileKeys, tilesPerRequest)
      : createIitcRequestBatches(tileKeys, {tilesPerRequest}),
  };
}
