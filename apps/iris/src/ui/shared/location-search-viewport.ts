import { boundsToE6, type BoundsE6, type LatLngDegrees } from '@iris/core';

const MAX_MERCATOR_LAT = 85.05112878;
const MAPLIBRE_TILE_SIZE = 512;
const MIN_SEARCH_ZOOM = 3;
const POINT_SEARCH_ZOOM = 15;
const BOUNDED_SEARCH_MAX_ZOOM = 14;

export interface ViewportDimensions {
    width: number;
    height: number;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function latToMercatorY(lat: number): number {
    const clampedLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
    const sin = Math.sin((clampedLat * Math.PI) / 180);
    return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function lngToMercatorX(lng: number, worldSize: number): number {
    return ((lng + 180) / 360) * worldSize;
}

function mercatorXToLng(x: number, worldSize: number): number {
    return (x / worldSize) * 360 - 180;
}

function mercatorYToLat(y: number, worldSize: number): number {
    const y2 = 0.5 - y / worldSize;
    return 90 - (360 * Math.atan(Math.exp(-y2 * 2 * Math.PI))) / Math.PI;
}

export function estimateLocationSearchZoom(bounds: BoundsE6 | null, dimensions: ViewportDimensions): number {
    if (!bounds) return POINT_SEARCH_ZOOM;

    const west = bounds.minLngE6 / 1e6;
    const east = bounds.maxLngE6 / 1e6;
    const south = bounds.minLatE6 / 1e6;
    const north = bounds.maxLatE6 / 1e6;
    const lngDegrees = west <= east ? east - west : 360 - west + east;
    const lngSpan = Math.max(0.00001, lngDegrees / 360);
    const latSpan = Math.max(0.00001, Math.abs(latToMercatorY(north) - latToMercatorY(south)));
    const padding = Math.max(48, Math.min(dimensions.width, dimensions.height) * 0.18);
    const availableWidth = Math.max(160, dimensions.width - padding * 2);
    const availableHeight = Math.max(160, dimensions.height - padding * 2);
    const zoomX = Math.log2(availableWidth / (MAPLIBRE_TILE_SIZE * lngSpan));
    const zoomY = Math.log2(availableHeight / (MAPLIBRE_TILE_SIZE * latSpan));
    const fitZoom = Math.min(zoomX, zoomY);
    if (!Number.isFinite(fitZoom)) return 12;

    return clamp(fitZoom, MIN_SEARCH_ZOOM, BOUNDED_SEARCH_MAX_ZOOM);
}

export function estimateViewportBounds(center: LatLngDegrees, zoom: number, dimensions: ViewportDimensions): BoundsE6 {
    const worldSize = MAPLIBRE_TILE_SIZE * Math.pow(2, zoom);
    const centerX = lngToMercatorX(center.lng, worldSize);
    const centerY = latToMercatorY(center.lat) * worldSize;
    const west = mercatorXToLng(centerX - dimensions.width / 2, worldSize);
    const east = mercatorXToLng(centerX + dimensions.width / 2, worldSize);
    const north = mercatorYToLat(centerY - dimensions.height / 2, worldSize);
    const south = mercatorYToLat(centerY + dimensions.height / 2, worldSize);

    return boundsToE6({
        south: Math.min(south, north),
        west,
        north: Math.max(south, north),
        east,
    });
}
