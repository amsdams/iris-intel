import { h } from 'preact';
import { useState } from 'preact/hooks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const btnStyle = (active: boolean) => ({
    background: active ? '#00ffff' : '#555',
    color: '#000',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '3px',
    cursor: active ? 'pointer' : 'default',
    fontWeight: 'bold',
} as const);


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

function LocationSearch() {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [error, setError] = useState('');

    const search = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setError('');
        setResults([]);

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data: NominatimResult[] = await res.json();

            if (!data.length) {
                setError('Location not found');
                return;
            }

            // If only one result navigate directly
            if (data.length === 1) {
                navigateTo(data[0]);
                return;
            }

            setResults(data);
        } catch (e) {
            setError('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const navigateTo = (result: NominatimResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        console.log('IRIS: navigating to', lat, lng);
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: { lat, lng },
            zoom: 15,
        }, '*');
        setResults([]);
        setQuery(result.display_name.split(',')[0]);
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') search();
        if (e.key === 'Escape') setResults([]);
    };

    return (
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '600px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
                <input
                    type="text"
                    value={query}
                    onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search location..."
                    style={{
                        flex: 1,
                        background: '#111',
                        color: '#00ffff',
                        border: '1px solid #00ffff',
                        borderRadius: '3px',
                        padding: '4px 6px',
                        fontFamily: 'monospace',
                        fontSize: '0.85em',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={search}
                    disabled={searching}
                    style={btnStyle(!searching)}
                >
                    {searching ? '...' : 'GO'}
                </button>
            </div>

            {error && (
                <div style={{ color: '#ff4444', fontSize: '0.75em', marginTop: '4px' }}>
                    {error}
                </div>
            )}

            {/* Results dropdown */}
            {results.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'rgba(0, 0, 0, 0.95)',
                    border: '1px solid #00ffff',
                    borderRadius: '3px',
                    marginTop: '2px',
                    zIndex: 10002,
                    maxHeight: '200px',
                    overflowY: 'auto',
                }}>
                    {results.map((result) => (
                        <div
                            key={result.place_id}
                            onClick={() => navigateTo(result)}
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #222',
                                fontSize: '0.8em',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.background = '#1a1a1a';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                            }}
                        >
                            <div style={{ color: '#00ffff' }}>
                                {result.display_name.split(',')[0]}
                            </div>
                            <div style={{ color: '#666', fontSize: '0.9em', marginTop: '1px' }}>
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
    onToggleStateDebug: () => void;
    onToggleLayersPopup: () => void;
    onToggleMapVisibility: () => void;
    showMap: boolean;
}

export function Topbar({ onTogglePlayerStats, onToggleStateDebug, onToggleLayersPopup, onToggleMapVisibility, showMap }: TopbarProps) {
    const [locStatus, setLocStatus] = useState<'NAVIGATE TO ME' | 'LOCATING...'>('NAVIGATE TO ME');
    const [showMenu, setShowMenu] = useState(false);

    const goToMyLocation = () => {
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
        <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            height: '40px',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            pointerEvents: 'none',
        }}>
            {/* Left side: Menu button */}
            <div style={{ position: 'relative', pointerEvents: 'auto' }}>
                <button style={btnStyle(true)} onClick={() => setShowMenu(!showMenu)}>☰</button>
                {showMenu && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        background: 'rgba(0, 0, 0, 0.95)',
                        border: '1px solid #00ffff',
                        borderRadius: '3px',
                        marginTop: '2px',
                        zIndex: 10002,
                        minWidth: '150px',
                        overflowY: 'auto',
                    }}>
                        <div
                            onClick={() => { onToggleLayersPopup(); setShowMenu(false); }}
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #222',
                                fontSize: '0.8em',
                                color: '#00ffff',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#1a1a1a'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                            Layers
                        </div>
                        <div
                            onClick={() => { onToggleStateDebug(); setShowMenu(false); }}
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #222',
                                fontSize: '0.8em',
                                color: '#00ffff',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#1a1a1a'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                            State Debug
                        </div>
                        <div
                            onClick={() => { onToggleMapVisibility(); setShowMenu(false); }}
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #222',
                                fontSize: '0.8em',
                                color: '#00ffff',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#1a1a1a'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                            {showMap ? 'SHOW INTEL MAP' : 'SHOW IRIS MAP'}
                        </div>
                    </div>
                )}
            </div>

            {/* Middle: Search input */}
            <div style={{ display: 'flex', justifyContent: 'center', flexGrow: 1, pointerEvents: 'auto' }}>
                <LocationSearch />
            </div>

            {/* Right side: Navigate and Profile icon */}
            <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto' }}>
                <button
                    onClick={goToMyLocation}
                    disabled={locStatus === 'LOCATING...'}
                    style={btnStyle(locStatus !== 'LOCATING...')}
                >
                    {locStatus === 'LOCATING...' ? '...' : '◎'}
                </button>
                <button style={btnStyle(true)} onClick={onTogglePlayerStats}>👤</button>
            </div>
        </div>
    );
}
