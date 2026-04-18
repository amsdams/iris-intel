
export const ZOOM_TO_LEVEL = [8, 8, 8, 8, 7, 7, 6, 5, 5, 4, 3, 3, 2, 1, 1, 0, 0];

/**
 * Returns the minimum portal level that should be visible at a given zoom level.
 * Aligned with Ingress Intel's data-level gating.
 */
export function getMinLevelForZoom(zoom: number): number {
    const z = Math.max(0, Math.min(ZOOM_TO_LEVEL.length - 1, Math.floor(zoom)));
    return ZOOM_TO_LEVEL[z];
}

/**
 * Returns a grid size (in degrees) suitable for the given zoom level.
 * Used for spatial partitioning and clustering.
 */
export function getGridSizeForZoom(zoom: number): number {
    if (zoom >= 13) return 0.05;
    if (zoom >= 9) return 0.5;
    if (zoom >= 6) return 2.0;
    return 5.0;
}
