import {getIitcDataZoomForMapZoom, getIitcMapZoomTileParameters, type IitcTileParams} from './tile-params';

export const IITC_MAX_LATITUDE = 85.051128;
export const IITC_MAX_LONGITUDE = 179.999999;
export const IITC_MAX_REQUESTS = 5;
export const IITC_NUM_TILES_PER_REQUEST = 25;

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

export interface IitcRequestBatchOptions {
  maxRequests?: number;
  tilesPerRequest?: number;
  activeRequestCount?: number;
  tileErrorCount?: Record<string, number>;
  maxTileRetries?: number;
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

export function createIitcMapDataPlan(bounds: IitcBounds, center: IitcLatLng, mapZoom: number, minZoom = 0): IitcMapDataPlan {
  const viewportBounds = clampIitcBounds(bounds);
  const dataZoom = getIitcDataZoomForMapZoom(mapZoom, minZoom);
  const tileParams = getIitcMapZoomTileParameters(dataZoom);
  const centerPoint = projectLatLng(center, mapZoom);

  const x1 = lngToIitcTile(viewportBounds.west, tileParams);
  const x2 = lngToIitcTile(viewportBounds.east, tileParams);
  const y1 = latToIitcTile(viewportBounds.north, tileParams);
  const y2 = latToIitcTile(viewportBounds.south, tileParams);

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
    requestBatches: createIitcRequestBatches(tileKeys),
  };
}
