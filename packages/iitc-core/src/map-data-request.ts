import {getIitcDataZoomForMapZoom, getIitcMapZoomTileParameters, type IitcTileParams} from './tile-params';
import type {IitcGetEntitiesResponse, IitcMapTilePayload} from './entity-decode';

export const IITC_MAX_LATITUDE = 85.051128;
export const IITC_MAX_LONGITUDE = 179.999999;
export const IITC_MAX_REQUESTS = 5;
export const IITC_NUM_TILES_PER_REQUEST = 25;
export const IITC_LIVE_COMPAT_TILES_PER_REQUEST = 5;
export const IITC_EMPTY_TILE_RETRY_PASSES = 2;
export const IITC_EMPTY_TILE_RETRY_BATCH_SIZE = 1;
export const IITC_EMPTY_TILE_RETRY_LIMIT = 40;

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

export interface IitcRequestBatchOptions {
  maxRequests?: number;
  tilesPerRequest?: number;
  activeRequestCount?: number;
  tileErrorCount?: Record<string, number>;
  maxTileRetries?: number;
}

export interface IitcEmptyTileRetryOptions {
  retryLimit?: number;
  retryBatchSize?: number;
}

export interface IitcReturnedTileSummary {
  returnedTiles: number;
  nonEmptyTiles: number;
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
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

export function createIitcRequestBatches(tileKeys: string[], options: IitcRequestBatchOptions = {}): string[][] {
  const maxRequests = options.maxRequests ?? IITC_MAX_REQUESTS;
  const tilesPerRequest = options.tilesPerRequest ?? IITC_NUM_TILES_PER_REQUEST;
  const requestBuckets = Math.max(0, maxRequests - (options.activeRequestCount ?? 0));
  const pendingTiles = [...tileKeys];
  const batches: string[][] = [];

  if (pendingTiles.length === 0 || requestBuckets === 0) return batches;

  const requestBucketSize = Math.min(tilesPerRequest, Math.max(5, Math.ceil(pendingTiles.length / requestBuckets)));

  for (let bucket = 0; bucket < requestBuckets; bucket += 1) {
    let numTilesThisRequest = Math.min(requestBucketSize, pendingTiles.length);
    let retryTotal = 0;

    for (let i = 0; i < numTilesThisRequest; i += 1) {
      retryTotal += options.tileErrorCount?.[pendingTiles[i]] ?? 0;
      if (retryTotal > (options.maxTileRetries ?? 5)) {
        numTilesThisRequest = i;
        break;
      }
    }

    const batch = pendingTiles.splice(0, numTilesThisRequest);
    if (batch.length > 0) batches.push(batch);
  }

  return batches;
}

export function createIitcSequentialTileBatches(tileKeys: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  for (let index = 0; index < tileKeys.length; index += safeBatchSize) {
    batches.push(tileKeys.slice(index, index + safeBatchSize));
  }
  return batches;
}

export function createIitcLiveCompatRequestBatches(tileKeys: string[]): string[][] {
  return createIitcSequentialTileBatches(tileKeys, IITC_LIVE_COMPAT_TILES_PER_REQUEST);
}

export function createIitcEmptyTileRetryBatches(tileKeys: string[], options: IitcEmptyTileRetryOptions = {}): string[][] {
  const retryLimit = Math.max(0, Math.floor(options.retryLimit ?? IITC_EMPTY_TILE_RETRY_LIMIT));
  const retryBatchSize = Math.max(1, Math.floor(options.retryBatchSize ?? IITC_EMPTY_TILE_RETRY_BATCH_SIZE));
  return createIitcSequentialTileBatches(tileKeys.slice(0, retryLimit), retryBatchSize);
}

export function countIitcTileEntities(tile: IitcMapTilePayload | undefined): number {
  return tile?.gameEntities?.length ?? 0;
}

export function mergeIitcGetEntitiesResponses(responses: IitcGetEntitiesResponse[]): IitcGetEntitiesResponse {
  const map: NonNullable<NonNullable<IitcGetEntitiesResponse['result']>['map']> = {};

  for (const response of responses) {
    for (const [tileKey, tile] of Object.entries(response.result?.map ?? {})) {
      const existing = map[tileKey];
      if (!existing || countIitcTileEntities(tile) > countIitcTileEntities(existing)) {
        map[tileKey] = tile;
      }
    }
  }

  return {result: {map}};
}

export function summarizeIitcReturnedTiles(response: IitcGetEntitiesResponse): IitcReturnedTileSummary {
  const entries = Object.entries(response.result?.map ?? {});
  const emptyTileKeys: string[] = [];
  const nonEmptyTileKeys: string[] = [];

  for (const [tileKey, tile] of entries) {
    if (countIitcTileEntities(tile) > 0) nonEmptyTileKeys.push(tileKey);
    else emptyTileKeys.push(tileKey);
  }

  return {
    returnedTiles: entries.length,
    nonEmptyTiles: nonEmptyTileKeys.length,
    emptyTileKeys,
    nonEmptyTileKeys,
  };
}

export function getIitcReturnedEmptyTileKeys(response: IitcGetEntitiesResponse, requestedTileKeys: string[]): string[] {
  const tilePayloads = response.result?.map ?? {};
  return requestedTileKeys.filter((tileKey) => tilePayloads[tileKey] && countIitcTileEntities(tilePayloads[tileKey]) === 0);
}

export function getIitcRecoveredTileKeys(initialEmptyTileKeys: string[], nonEmptyTileKeys: string[]): string[] {
  return initialEmptyTileKeys.filter((tileKey) => nonEmptyTileKeys.includes(tileKey));
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
