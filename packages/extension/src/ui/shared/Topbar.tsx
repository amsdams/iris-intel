import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { SHARED_STYLES, THEMES } from '../theme';

// ---------------------------------------------------------------------------
// LocationSearch
// Uses Nominatim (OpenStreetMap) geocoding — moves both maps on result
// ---------------------------------------------------------------------------

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
}

function LocationSearch(): JSX.Element {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [error, setError] = useState('');

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const clearLocalResults = (): void => {
        setResults([]);
    };

    const navigateToCoordinates = (lat: number, lng: number, label?: string): void => {
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: { lat, lng },
            zoom: 15,
        }, '*');
        if (label) setQuery(label);
        clearLocalResults();
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
            setError('');
            navigateToCoordinates(coords.lat, coords.lng, trimmedQuery);
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
                navigateTo(data[0]);
                return;
            }
            setResults(data);
        } catch {
            setError('Map search failed');
        } finally {
            setSearching(false);
        }
    };

    const navigateTo = (result: NominatimResult): void => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        navigateToCoordinates(lat, lng, result.display_name.split(',')[0]);
    };

    const onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Enter') search();
        if (e.key === 'Escape') clearLocalResults();
    };

    return (
        <div className="iris-location-search">
            <div className="iris-search-input-group">
                <input
                    type="text"
                    value={query}
                    className="iris-search-input"
                    onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                    onKeyDown={onKeyDown}
                    placeholder="Place or lat,lng"
                    style={{
                        color: theme.AQUA,
                        borderColor: theme.AQUA,
                    }}
                />
                <button
                    className="iris-search-btn"
                    onClick={search}
                    disabled={searching}
                    style={SHARED_STYLES.btnStyle(!searching, theme.AQUA)}
                >
                    {searching ? '...' : 'GO'}
                </button>
            </div>

            {error && (
                <div className="iris-search-error" style={{ color: '#ff4444', fontSize: '0.75em', marginTop: '4px' }}>
                    {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="iris-search-results" style={{ borderColor: theme.AQUA }}>
                    {results.map((result) => (
                        <div
                            key={result.place_id}
                            className="iris-search-result-item"
                            onClick={() => navigateTo(result)}
                        >
                            <div className="iris-search-result-name" style={{ color: theme.AQUA }}>
                                {result.display_name.split(',')[0]}
                            </div>
                            <div className="iris-search-result-details">
                                {result.display_name.split(',').slice(1, 3).join(',')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface TopbarProps {
    onTogglePlayerStats: () => void;
    onToggleInventory: () => void;
    onToggleDiagnostics: () => void;
    onToggleFiltersPopup: () => void;
    onToggleMapVisibility: () => void;
    onToggleComm: () => void;
    onToggleMissions: () => void;
    onTogglePlugins: () => void;
    onToggleMapTheme: () => void;
    onToggleGameScore: () => void;
    onToggleRegionScore: () => void;
    onTogglePasscodes: () => void;
    showMap: boolean;
}

export function Topbar({
    onTogglePlayerStats,
    onToggleInventory,
    onToggleDiagnostics,
    onToggleFiltersPopup,
    onToggleMapVisibility,
    onToggleComm,
    onToggleMissions,
    onTogglePlugins,
    onToggleMapTheme,
    onToggleGameScore,
    onToggleRegionScore,
    onTogglePasscodes,
    showMap
}: TopbarProps): JSX.Element {
    const [locStatus, setLocStatus] = useState<'NAVIGATE TO ME' | 'LOCATING...'>('NAVIGATE TO ME');
    const [showMenu, setShowMenu] = useState(false);
    const menuItems = useStore((state) => state.menuItems);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const goToMyLocation = (): void => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setLocStatus('LOCATING...');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                window.postMessage({
                    type: 'IRIS_MOVE_MAP',
                    center: { lat: coords.latitude, lng: coords.longitude },
                    zoom: 15,
                }, '*');
                setLocStatus('NAVIGATE TO ME');
            },
            (error) => {
                setLocStatus('NAVIGATE TO ME');
                const messages: Record<number, string> = {
                    [error.PERMISSION_DENIED]: 'Permission denied.',
                    [error.POSITION_UNAVAILABLE]: 'Position unavailable.',
                    [error.TIMEOUT]: 'Request timed out.',
                };
                alert(`Location error: ${messages[error.code] || 'Unknown error.'}`);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="iris-topbar">
            {/* Left side: Menu button */}
            <div className="iris-menu-container">
                <button className="iris-menu-btn" style={SHARED_STYLES.btnStyle(true, theme.AQUA)} onClick={() => setShowMenu(!showMenu)}>☰</button>
                {showMenu && (
                    <div className="iris-menu-dropdown" style={{ borderColor: theme.AQUA }}>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onTogglePlayerStats(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Player Stats
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleInventory(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Inventory
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleGameScore(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Global Scoreboard
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleRegionScore(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Region Scores
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleFiltersPopup(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Filters
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleComm(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            COMM
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleMissions(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Missions
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onTogglePasscodes(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Passcodes
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onTogglePlugins(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Plugins
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleMapTheme(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Map Style
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleDiagnostics(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            Diagnostics
                        </button>
                        <button
                            className="iris-menu-item"
                            onClick={() => { onToggleMapVisibility(); setShowMenu(false); }}
                            style={{ color: theme.AQUA }}
                        >
                            {showMap ? 'Use Intel Map' : 'Use IRIS Map'}
                        </button>

                        {menuItems.length > 0 && (
                            <div className="iris-menu-divider" />
                        )}

                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={`iris-menu-item iris-menu-item-plugin-${item.id}`}
                                onClick={() => { item.onClick(); setShowMenu(false); }}
                                style={{ color: theme.AQUA }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Middle: Search input */}
            <div className="iris-topbar-center">
                <LocationSearch />
            </div>

            {/* Right side: Navigate icon */}
            <div className="iris-topbar-right">
                <button
                    className="iris-geolocate-btn"
                    onClick={goToMyLocation}
                    disabled={locStatus === 'LOCATING...'}
                    style={SHARED_STYLES.btnStyle(locStatus !== 'LOCATING...', theme.AQUA)}
                >
                    {locStatus === 'LOCATING...' ? '...' : '◎'}
                </button>
            </div>
        </div>
    );
}
