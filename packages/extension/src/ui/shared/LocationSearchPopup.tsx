import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../shared/Popup';
import { THEMES } from '../theme';

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
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

    const navigateToCoordinates = (lat: number, lng: number, _label?: string): void => {
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: { lat, lng },
            zoom: 15,
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
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&format=json&limit=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json() as NominatimResult[];
            if (!data.length) {
                setError('Place not found');
                return;
            }
            if (data.length === 1) {
                const r = data[0];
                navigateToCoordinates(parseFloat(r.lat), parseFloat(r.lon));
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
                            onClick={() => navigateToCoordinates(parseFloat(result.lat), parseFloat(result.lon))}
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
