import {ZOOM_TO_LEVEL} from '../ZoomPolicy';
import {boundsToE6, e6ToDegrees, isFiniteBoundsE6, normalizeLongitudeDegrees, type BoundsE6} from '../geo-bounds';

const DEFAULT_ZOOM_TO_TILES_PER_EDGE = [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000];
const MAX_MAP_ZOOM = 21;
const MAX_MERCATOR_LAT = 85.05112878;
const MAX_ENTITY_TILE_KEYS = 1024;
export const ENTITY_REQUEST_BATCH_SIZE = 25;
const MAPLIBRE_TO_INTEL_ZOOM_OFFSET = 1;

interface TileParams {
  level: number;
  tilesPerEdge: number;
  hasPortals: boolean;
  zoom: number;
}

export interface EntityRequestPayload {
  tileKeys: string[];
  coverageKey: string;
  dataBounds: BoundsE6 | null;
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
  let zoom = Math.max(0, Math.min(MAX_MAP_ZOOM, Math.floor(mapZoom + MAPLIBRE_TO_INTEL_ZOOM_OFFSET)));
  const originalParams = getMapZoomTileParameters(zoom);

  while (zoom > 0) {
    const nextParams = getMapZoomTileParameters(zoom - 1);
    const changesDetailLevel =
      nextParams.tilesPerEdge !== originalParams.tilesPerEdge
      || nextParams.hasPortals !== originalParams.hasPortals
      || nextParams.level * Number(nextParams.hasPortals) !== originalParams.level * Number(originalParams.hasPortals);

    if (changesDetailLevel) break;
    zoom -= 1;
  }

  return zoom;
}

function lngToTile(lng: number, params: TileParams): number {
  return Math.floor(lngToTileFloat(lng, params));
}

function latToTile(lat: number, params: TileParams): number {
  return Math.floor(latToTileFloat(lat, params));
}

function lngToTileFloat(lng: number, params: TileParams): number {
  return ((lng + 180) / 360) * params.tilesPerEdge;
}

function latToTileFloat(lat: number, params: TileParams): number {
  return ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * params.tilesPerEdge;
}

function pointToTileId(params: TileParams, x: number, y: number): string {
  return `${params.zoom}_${x}_${y}_${params.level}_8_100`;
}

function tileToLng(x: number, params: TileParams): number {
  return (x / params.tilesPerEdge) * 360 - 180;
}

function tileToLat(y: number, params: TileParams): number {
  const n = Math.PI - (2 * Math.PI * y) / params.tilesPerEdge;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
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

function getBoundsCenterLng(rawWest: number, rawEast: number): number {
  if (Math.abs(rawEast - rawWest) >= 360) return 0;

  const west = normalizeLongitudeDegrees(rawWest);
  const east = normalizeLongitudeDegrees(rawEast);
  if (west <= east) {
    return (west + east) / 2;
  }

  return normalizeLongitudeDegrees(west + ((east + 360 - west) / 2));
}

function getWrappedTileDelta(a: number, b: number, tilesPerEdge: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, tilesPerEdge - direct);
}

function buildDataBoundsE6(xRanges: [number, number][], minY: number, maxY: number, params: TileParams): BoundsE6 | null {
  if (xRanges.length === 0) return null;

  const firstRange = xRanges[0];
  const lastRange = xRanges[xRanges.length - 1];
  return boundsToE6({
    south: tileToLat(maxY + 1, params),
    west: tileToLng(firstRange[0], params),
    north: tileToLat(minY, params),
    east: tileToLng(lastRange[1] + 1, params),
  });
}

export function buildEntityRequestPayload(bounds: BoundsE6, mapZoom: number): EntityRequestPayload {
  if (!Number.isFinite(mapZoom) || !isFiniteBoundsE6(bounds)) {
    return {
      tileKeys: [],
      coverageKey: 'invalid:non-finite',
      dataBounds: null,
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
  const centerLng = getBoundsCenterLng(west, east);
  const centerLat = (north + south) / 2;
  const centerX = lngToTileFloat(centerLng, params);
  const centerY = latToTileFloat(centerLat, params);
  const tileEntries: {key: string; distanceSquared: number}[] = [];
  let capped = false;

  for (const [minX, maxX] of xRanges) {
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        if (tileEntries.length >= MAX_ENTITY_TILE_KEYS) {
          capped = true;
          break;
        }
        const dx = getWrappedTileDelta(x + 0.5, centerX, params.tilesPerEdge);
        const dy = (y + 0.5) - centerY;
        tileEntries.push({
          key: pointToTileId(params, x, y),
          distanceSquared: dx * dx + dy * dy,
        });
      }
      if (capped) break;
    }
    if (capped) break;
  }

  tileEntries.sort((a, b) => a.distanceSquared - b.distanceSquared || a.key.localeCompare(b.key));
  const tileKeys = tileEntries.map((entry) => entry.key);
  const coverageRanges = xRanges.map(([minX, maxX]) => `${minX}-${maxX}`).join(',');
  return {
    tileKeys,
    coverageKey: `${dataZoom}:${coverageRanges}:${minY}:${maxY}:${tileKeys.length}${capped ? ':capped' : ''}`,
    dataBounds: buildDataBoundsE6(xRanges, minY, maxY, params),
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
