const DEFAULT_ZOOM_TO_TILES_PER_EDGE = [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000];
const DEFAULT_ZOOM_TO_LEVEL = [8, 8, 8, 8, 7, 7, 7, 6, 6, 5, 4, 4, 3, 2, 2, 1, 1];
const DEFAULT_ZOOM_TO_LINK_LENGTH = [200000, 200000, 200000, 200000, 200000, 60000, 60000, 10000, 5000, 2500, 2500, 800, 300, 0, 0];
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

  // Portals start appearing at zoom 13 in Ingress Intel
  const portalZoomLimit = 13;

  return {
    level: DEFAULT_ZOOM_TO_LEVEL[zoom] || 0,
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
      nextParams.tilesPerEdge !== originalParams.tilesPerEdge ||
      nextParams.hasPortals !== originalParams.hasPortals ||
      (nextParams.level * Number(nextParams.hasPortals)) !== (originalParams.level * Number(originalParams.hasPortals));

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
  // MapLibre zoom level is often offset by 1 compared to Google Maps/Leaflet for the same visual area
  const MAPLIBRE_ZOOM_OFFSET = 1;
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
