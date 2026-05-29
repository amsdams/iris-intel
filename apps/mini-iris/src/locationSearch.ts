import {boundsToE6, type BoundsE6, type LatLngDegrees} from '@iris/core';

const MAX_MERCATOR_LAT = 85.05112878;
const MAPLIBRE_TILE_SIZE = 512;
const MIN_SEARCH_ZOOM = 3;
const POINT_SEARCH_ZOOM = 15;
const BOUNDED_SEARCH_MAX_ZOOM = 14;

export interface ViewportDimensions {
    width: number;
    height: number;
}

export interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    class?: string;
    type: string;
    name?: string;
    boundingbox?: string[];
    geojson?: GeoJSON.Geometry;
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

export function parseNominatimBounds(result: NominatimResult): BoundsE6 | null {
    const box = result.boundingbox;
    if (!box || box.length !== 4) return null;
    const south = Number(box[0]);
    const north = Number(box[1]);
    const west = Number(box[2]);
    const east = Number(box[3]);
    if (![south, north, west, east].every(Number.isFinite)) return null;
    if (Math.abs(south) > 90 || Math.abs(north) > 90 || Math.abs(west) > 180 || Math.abs(east) > 180) return null;
    return boundsToE6({south, west, north, east});
}

export function combineBounds(bounds: BoundsE6[]): BoundsE6 | null {
    if (bounds.length === 0) return null;
    return bounds.reduce((combined, next) => ({
        minLatE6: Math.min(combined.minLatE6, next.minLatE6),
        minLngE6: Math.min(combined.minLngE6, next.minLngE6),
        maxLatE6: Math.max(combined.maxLatE6, next.maxLatE6),
        maxLngE6: Math.max(combined.maxLngE6, next.maxLngE6),
    }));
}

export function centerFromBounds(bounds: BoundsE6): LatLngDegrees {
    return {
        lat: (bounds.minLatE6 + bounds.maxLatE6) / 2e6,
        lng: (bounds.minLngE6 + bounds.maxLngE6) / 2e6,
    };
}

export function geometryFromBounds(bounds: BoundsE6): GeoJSON.Polygon {
    const south = bounds.minLatE6 / 1e6;
    const west = bounds.minLngE6 / 1e6;
    const north = bounds.maxLatE6 / 1e6;
    const east = bounds.maxLngE6 / 1e6;
    return {
        type: 'Polygon',
        coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
        ]],
    };
}

export function isSupportedSearchGeometry(value: unknown): value is GeoJSON.Geometry {
    if (!value || typeof value !== 'object' || !('type' in value)) return false;
    return ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(String((value as {type?: unknown}).type));
}

export function geometryFromNominatimResult(result: NominatimResult, bounds: BoundsE6 | null): GeoJSON.Geometry {
    if (isSupportedSearchGeometry(result.geojson)) return result.geojson;
    if (bounds) return geometryFromBounds(bounds);
    return {
        type: 'Point',
        coordinates: [Number(result.lon), Number(result.lat)],
    };
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

export function buildSearchHighlight(results: NominatimResult[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: results.map((result, index): GeoJSON.Feature => {
            const bounds = parseNominatimBounds(result);
            return {
                type: 'Feature',
                properties: {
                    id: `mini-search:${result.place_id}`,
                    label: result.display_name,
                    name: result.name ?? result.display_name.split(',')[0],
                    class: result.class ?? '',
                    type: result.type,
                    order: index + 1,
                },
                geometry: geometryFromNominatimResult(result, bounds),
            };
        }),
    };
}
