import {ZOOM_TO_LEVEL} from '../ZoomPolicy';
import {e6ToDegrees, isFiniteBoundsE6, normalizeLongitudeDegrees, type BoundsE6} from '../geo-bounds';

const DEFAULT_ZOOM_TO_TILES_PER_EDGE = [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000];
const MAX_MAP_ZOOM = 21;
const MAX_MERCATOR_LAT = 85.05112878;
const MAX_ENTITY_TILE_KEYS = 1024;
export const ENTITY_REQUEST_BATCH_SIZE = 25;

interface TileParams {
  level: number;
  tilesPerEdge: number;
  hasPortals: boolean;
  zoom: number;
}

export interface EntityRequestPayload {
  tileKeys: string[];
  coverageKey: string;
  dataZoom: number;
  diagnostic: string | null;
}

function getMapZoomTileParameters(zoom: number): TileParams {
  const maxTilesPerEdge = DEFAULT_ZOOM_TO_TILES_PER_EDGE[DEFAULT_ZOOM_TO_TILES_PER_EDGE.length - 1];
  const portalZoomLimit = 15;

  return {
    level: ZOOM_TO_LEVEL[zoom] ?? 0,
    tilesPerEdge: DEFAULT_ZOOM_TO_TILES_PER_EDGE[zoom] || maxTilesPerEdge,
    hasPortals: zoom >= portalZoomLimit,
    zoom,
  };
}

function getDataZoomForMapZoom(mapZoom: number): number {
  let zoom = Math.max(0, Math.min(MAX_MAP_ZOOM, Math.floor(mapZoom)));
  const originalParams = getMapZoomTileParameters(zoom);

  while (zoom > 0) {
    const nextParams = getMapZoomTileParameters(zoom - 1);
    const changesDetailLevel =
      nextParams.tilesPerEdge !== originalParams.tilesPerEdge
      || nextParams.hasPortals !== originalParams.hasPortals
      || nextParams.level !== originalParams.level;

    if (changesDetailLevel) break;
    zoom -= 1;
  }

  return zoom;
}

function lngToTile(lng: number, params: TileParams): number {
  return Math.floor(((lng + 180) / 360) * params.tilesPerEdge);
}

function latToTile(lat: number, params: TileParams): number {
  return Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * params.tilesPerEdge);
}

function pointToTileId(params: TileParams, x: number, y: number): string {
  return `${params.zoom}_${x}_${y}_${params.level}_8_100`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildTileXRanges(rawWest: number, rawEast: number, params: TileParams): [number, number][] {
  const minTile = 0;
  const maxTile = params.tilesPerEdge - 1;
  if (Math.abs(rawEast - rawWest) >= 360) {
    return [[minTile, maxTile]];
  }

  const west = normalizeLongitudeDegrees(rawWest);
  const east = normalizeLongitudeDegrees(rawEast);
  const westTile = clamp(lngToTile(west, params), minTile, maxTile);
  const eastTile = clamp(lngToTile(east, params), minTile, maxTile);

  if (west <= east) {
    return [[westTile, eastTile]];
  }

  return [
    [westTile, maxTile],
    [minTile, eastTile],
  ];
}

export function buildEntityRequestPayload(bounds: BoundsE6, mapZoom: number): EntityRequestPayload {
  if (!Number.isFinite(mapZoom) || !isFiniteBoundsE6(bounds)) {
    return {
      tileKeys: [],
      coverageKey: 'invalid:non-finite',
      dataZoom: 0,
      diagnostic: 'invalid non-finite bounds or zoom',
    };
  }

  const dataZoom = getDataZoomForMapZoom(mapZoom);
  const params = getMapZoomTileParameters(dataZoom);
  const south = clamp(e6ToDegrees(Math.min(bounds.minLatE6, bounds.maxLatE6)), -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  const north = clamp(e6ToDegrees(Math.max(bounds.minLatE6, bounds.maxLatE6)), -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  const west = e6ToDegrees(bounds.minLngE6);
  const east = e6ToDegrees(bounds.maxLngE6);
  const minTile = 0;
  const maxTile = params.tilesPerEdge - 1;
  const xRanges = buildTileXRanges(west, east, params);
  const minY = clamp(latToTile(north, params), minTile, maxTile);
  const maxY = clamp(latToTile(south, params), minTile, maxTile);
  const tileKeys: string[] = [];
  let capped = false;

  for (const [minX, maxX] of xRanges) {
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        if (tileKeys.length >= MAX_ENTITY_TILE_KEYS) {
          capped = true;
          break;
        }
        tileKeys.push(pointToTileId(params, x, y));
      }
      if (capped) break;
    }
    if (capped) break;
  }

  const coverageRanges = xRanges.map(([minX, maxX]) => `${minX}-${maxX}`).join(',');
  return {
    tileKeys,
    coverageKey: `${dataZoom}:${coverageRanges}:${minY}:${maxY}:${tileKeys.length}${capped ? ':capped' : ''}`,
    dataZoom,
    diagnostic: capped ? `tile coverage capped at ${MAX_ENTITY_TILE_KEYS}` : null,
  };
}

export function batchEntityTileKeys(tileKeys: string[], batchSize = ENTITY_REQUEST_BATCH_SIZE): string[][] {
  const size = Math.max(1, Math.floor(batchSize));
  const batches: string[][] = [];

  for (let i = 0; i < tileKeys.length; i += size) {
    batches.push(tileKeys.slice(i, i + size));
  }

  return batches;
}
