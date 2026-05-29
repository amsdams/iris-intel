export interface IitcTileParams {
  level: number;
  tilesPerEdge: number;
  minLinkLength: number;
  hasPortals: boolean;
  zoom: number;
}

export const IITC_DEFAULT_ZOOM_TO_TILES_PER_EDGE = [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000] as const;
export const IITC_DEFAULT_ZOOM_TO_LEVEL = [8, 8, 8, 8, 7, 7, 7, 6, 6, 5, 4, 4, 3, 2, 2] as const;
export const IITC_DEFAULT_ZOOM_TO_LINK_LENGTH = [200000, 200000, 200000, 200000, 200000, 60000, 60000, 10000, 5000, 2500, 2500, 800, 300, 0, 0] as const;

export function getIitcMapZoomTileParameters(zoom: number): IitcTileParams {
  const z = Math.max(0, Math.floor(zoom));
  const maxTilesPerEdge = IITC_DEFAULT_ZOOM_TO_TILES_PER_EDGE[IITC_DEFAULT_ZOOM_TO_TILES_PER_EDGE.length - 1];

  return {
    level: IITC_DEFAULT_ZOOM_TO_LEVEL[z] ?? 0,
    tilesPerEdge: IITC_DEFAULT_ZOOM_TO_TILES_PER_EDGE[z] ?? maxTilesPerEdge,
    minLinkLength: IITC_DEFAULT_ZOOM_TO_LINK_LENGTH[z] ?? 0,
    hasPortals: z >= IITC_DEFAULT_ZOOM_TO_LINK_LENGTH.length,
    zoom: z,
  };
}

export function getIitcDataZoomForMapZoom(mapZoom: number, minZoom = 0): number {
  let zoom = Math.max(minZoom, Math.min(21, Math.floor(mapZoom)));
  const originalParams = getIitcMapZoomTileParameters(zoom);

  while (zoom > minZoom) {
    const nextParams = getIitcMapZoomTileParameters(zoom - 1);
    const changesDetail =
      nextParams.tilesPerEdge !== originalParams.tilesPerEdge ||
      nextParams.hasPortals !== originalParams.hasPortals ||
      nextParams.level * Number(nextParams.hasPortals) !== originalParams.level * Number(originalParams.hasPortals);

    if (changesDetail) break;
    zoom -= 1;
  }

  return zoom;
}
