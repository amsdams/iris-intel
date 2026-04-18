import { ZOOM_TO_LEVEL } from '@iris/core';

const DEFAULT_ZOOM_TO_TILES_PER_EDGE = [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000];
const MAX_MAP_ZOOM = 21;

interface BoundsE6 {
  minLatE6: number;
  minLngE6: number;
  maxLatE6: number;
  maxLngE6: number;
}

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
}

function getMapZoomTileParameters(zoom: number): TileParams {
  const maxTilesPerEdge = DEFAULT_ZOOM_TO_TILES_PER_EDGE[DEFAULT_ZOOM_TO_TILES_PER_EDGE.length - 1];

  // Portals start appearing as "All Portals" (Level 0+) at zoom 15+.
  // Below zoom 15, Intel returns portals selectively (e.g., L2+ at zoom 13-14).
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
    
    // Aligned with IITC's getDataZoomForMapZoom logic
    const changesDetailLevel =
      nextParams.tilesPerEdge !== originalParams.tilesPerEdge ||
      nextParams.hasPortals !== originalParams.hasPortals ||
      nextParams.level !== originalParams.level;

    if (changesDetailLevel) {
      break;
    }

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

export function buildEntityRequestPayload(bounds: BoundsE6, mapZoom: number): EntityRequestPayload {
  // MapLibre zoom level matches Leaflet/Intel when using 256px tiles.
  // The +1 offset was a remnant of 512px tile assumptions and caused "data overflow" at zoom 14.
  const MAPLIBRE_ZOOM_OFFSET = 0;
  const adjustedZoom = mapZoom + MAPLIBRE_ZOOM_OFFSET;

  const dataZoom = getDataZoomForMapZoom(adjustedZoom);
  const params = getMapZoomTileParameters(dataZoom);
  const south = bounds.minLatE6 / 1e6;
  const west = bounds.minLngE6 / 1e6;
  const north = bounds.maxLatE6 / 1e6;
  const east = bounds.maxLngE6 / 1e6;
  const minX = lngToTile(west, params);
  const maxX = lngToTile(east, params);
  const minY = latToTile(north, params);
  const maxY = latToTile(south, params);
  const tileKeys: string[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tileKeys.push(pointToTileId(params, x, y));
    }
  }

  return {
    tileKeys,
    coverageKey: `${dataZoom}:${minX}:${maxX}:${minY}:${maxY}:${tileKeys.length}`,
    dataZoom,
  };
}
