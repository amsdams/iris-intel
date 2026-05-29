import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { boundsToE6, useStore, type BoundsE6 } from '@iris/core';
import { Popup } from '../shared/Popup';
import { THEMES } from '../theme';
import { PAGE_MAP_RUNTIME_MESSAGES } from '../../shared/page-map-runtime-protocol';
import { estimateLocationSearchZoom, estimateViewportBounds, type ViewportDimensions } from './location-search-viewport';

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    class?: string;
    type: string;
    addresstype?: string;
    boundingbox?: [string, string, string, string];
    geojson?: GeoJSON.Geometry;
}

interface LocationSearchPopupProps {
    onClose: () => void;
}

export function LocationSearchPopup({ onClose }: LocationSearchPopupProps): JSX.Element {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [error, setError] = useState('');

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const parseResultBounds = (result: NominatimResult): BoundsE6 | null => {
        const box = result.boundingbox;
        if (!box || box.length !== 4) return null;
        const south = Number(box[0]);
        const north = Number(box[1]);
        const west = Number(box[2]);
        const east = Number(box[3]);
        if (![south, north, west, east].every(Number.isFinite)) return null;
        if (Math.abs(south) > 90 || Math.abs(north) > 90 || Math.abs(west) > 180 || Math.abs(east) > 180) return null;
        return boundsToE6({south, west, north, east});
    };

    const centerFromBounds = (bounds: BoundsE6): {lat: number; lng: number} => ({
        lat: (bounds.minLatE6 + bounds.maxLatE6) / 2e6,
        lng: (bounds.minLngE6 + bounds.maxLngE6) / 2e6,
    });

    const geometryFromBounds = (bounds: BoundsE6): GeoJSON.Polygon => {
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
    };

    const isSupportedGeometry = (value: unknown): value is GeoJSON.Geometry => {
        if (!value || typeof value !== 'object' || !('type' in value)) return false;
        return ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(String((value as {type?: unknown}).type));
    };

    const publishSearchHighlight = (result: NominatimResult | null, lat: number, lng: number, bounds: BoundsE6 | null): void => {
        const geometry = result && isSupportedGeometry(result.geojson)
            ? result.geojson
            : bounds
                ? geometryFromBounds(bounds)
                : {type: 'Point', coordinates: [lng, lat]} as GeoJSON.Point;
        window.postMessage({
            type: PAGE_MAP_RUNTIME_MESSAGES.syncData,
            syncReason: 'search',
            data: {
                searchHighlight: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {id: 'search-highlight', label: result?.display_name ?? 'Search result'},
                        geometry,
                    }],
                },
            },
        }, '*');
    };

    const navigateToCoordinates = (lat: number, lng: number, result?: NominatimResult): void => {
        const resultBounds = result ? parseResultBounds(result) : null;
        const dimensions: ViewportDimensions = {width: window.innerWidth, height: window.innerHeight};
        const zoom = estimateLocationSearchZoom(resultBounds, dimensions);
        const center = resultBounds ? centerFromBounds(resultBounds) : {lat, lng};
        const viewportBounds = estimateViewportBounds(center, zoom, dimensions);
        publishSearchHighlight(result ?? null, lat, lng, resultBounds);
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center,
            zoom,
            bounds: viewportBounds,
        }, '*');
        onClose();
    };

    const parseCoordinateQuery = (value: string): { lat: number; lng: number } | null => {
        const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (!match) return null;
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat, lng };
    };

    const search = async (): Promise<void> => {
        if (!query.trim()) return;
        const trimmedQuery = query.trim();
        const coords = parseCoordinateQuery(trimmedQuery);
        if (coords) {
            navigateToCoordinates(coords.lat, coords.lng);
            return;
        }

        setSearching(true);
        setError('');
        setResults([]);

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&format=json&limit=5&polygon_geojson=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json() as NominatimResult[];
            if (!data.length) {
                setError('Place not found');
                return;
            }
            if (data.length === 1) {
                const r = data[0];
                navigateToCoordinates(parseFloat(r.lat), parseFloat(r.lon), r);
                return;
            }
            setResults(data);
        } catch {
            setError('Map search failed');
        } finally {
            setSearching(false);
        }
    };

    return (
        <Popup 
            onClose={onClose} 
            title="Search Location"
            className="iris-popup-top-center iris-popup-medium"
            style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
                '--iris-location-search-color': theme.AQUA,
                '--iris-location-search-border': `${theme.AQUA}33`,
            } as Record<string, string>}
        >
            <div className="iris-location-search-form">
                <input
                    type="text"
                    autoFocus
                    value={query}
                    className="iris-input iris-location-search-input"
                    onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder="Place or lat,lng"
                />
                <button
                    className="iris-location-search-submit"
                    onClick={search}
                    disabled={searching}
                >
                    {searching ? '...' : 'GO'}
                </button>
            </div>

            {error && (
                <div className="iris-location-search-error">
                    {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="iris-location-search-results">
                    {results.map((result) => (
                        <div
                            key={result.place_id}
                            className="iris-choice-item iris-location-search-result"
                            onClick={() => navigateToCoordinates(parseFloat(result.lat), parseFloat(result.lon), result)}
                        >
                            <div className="iris-location-search-result-title">
                                {result.display_name.split(',')[0]}
                            </div>
                            <div className="iris-text-tiny iris-location-search-result-context">
                                {result.display_name.split(',').slice(1, 3).join(',')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Popup>
    );
}
