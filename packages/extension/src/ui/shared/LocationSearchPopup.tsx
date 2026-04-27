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
            } as Record<string, string>}
        >
            <div className="iris-search-input-group" style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    autoFocus
                    value={query}
                    className="iris-input"
                    onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder="Place or lat,lng"
                    style={{ borderColor: theme.AQUA }}
                />
                <button
                    className="iris-btn"
                    onClick={search}
                    disabled={searching}
                    style={{ background: theme.AQUA, color: '#000' }}
                >
                    {searching ? '...' : 'GO'}
                </button>
            </div>

            {error && (
                <div className="iris-mt-2" style={{ color: '#ff4444', fontSize: '0.85em' }}>
                    {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="iris-mt-3" style={{ borderTop: `1px solid ${theme.AQUA}33` }}>
                    {results.map((result) => (
                        <div
                            key={result.place_id}
                            className="iris-choice-item iris-mt-2"
                            onClick={() => navigateToCoordinates(parseFloat(result.lat), parseFloat(result.lon))}
                            style={{ cursor: 'pointer' }}
                        >
                            <div style={{ color: theme.AQUA, fontWeight: 'bold' }}>
                                {result.display_name.split(',')[0]}
                            </div>
                            <div className="iris-text-tiny" style={{ opacity: 0.6 }}>
                                {result.display_name.split(',').slice(1, 3).join(',')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Popup>
    );
}
