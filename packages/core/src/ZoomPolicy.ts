/**
 * Mimics Ingress Intel zoom-to-portal-level mapping.
 */
export function getMinLevelForZoom(zoom: number): number {
    if (zoom >= 17) return 0; // All
    if (zoom >= 16) return 1;
    if (zoom >= 15) return 2;
    if (zoom >= 14) return 3;
    if (zoom >= 13) return 4;
    if (zoom >= 12) return 5;
    if (zoom >= 11) return 6;
    if (zoom >= 9) return 7;
    if (zoom >= 3) return 8; // L8 only
    return 9; // Z0-Z2: No portals
}

/**
 * Provides a dynamic grid size (degrees) to ensure we don't 
 * iterate over too many cells when zoomed out.
 */
export function getGridSizeForZoom(zoom: number): number {
    if (zoom >= 13) return 0.05;
    if (zoom >= 9) return 0.5;
    if (zoom >= 6) return 2.0;
    return 5.0; // Very large cells for world view
}
