import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { MapOverlay } from './MapOverlay';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAM_COLOUR: Record<string, string> = {
    E: '#00ff00',
    R: '#0000ff',
    M: '#ff0000',
    N: '#ffffff',
};

const TEAM_NAME: Record<string, string> = {
    E: 'Enlightened',
    R: 'Resistance',
    M: 'Machina',
    N: 'Neutral',
};

const RARITY_COLOUR: Record<string, string> = {
    COMMON: '#aaaaaa',
    RARE: '#6699ff',
    VERY_RARE: '#ff6600',
    EXTREMELY_RARE: '#ff0000',
};

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
        <div style={{ marginTop: '10px', position: 'relative' }}>
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

// ---------------------------------------------------------------------------
// PortalPopup
// ---------------------------------------------------------------------------

function PortalPopup() {
    const selectedPortalId = useStore((state) => state.selectedPortalId);
    const portal = useStore((state) =>
        selectedPortalId ? state.portals[selectedPortalId] : null
    );
    const selectPortal = useStore((state) => state.selectPortal);

    if (!portal) return null;

    const colour = TEAM_COLOUR[portal.team] || '#ffffff';
    const teamName = TEAM_NAME[portal.team] || 'Unknown';

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.92)',
            color: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            border: `2px solid ${colour}`,
            boxShadow: `0 0 20px ${colour}55`,
            fontFamily: 'monospace',
            minWidth: '300px',
            maxWidth: '420px',
            maxHeight: '80vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
        }}>

            {/* Close */}
            <button
                onClick={() => selectPortal(null)}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '18px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '0 4px',
                }}
            >✕</button>

            {/* Image */}
            {portal.image && (
                <img
                    src={portal.image}
                    alt={portal.name || 'Portal'}
                    style={{
                        width: '100%',
                        height: '140px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        border: `1px solid ${colour}`,
                    }}
                />
            )}

            {/* Name */}
            <div style={{
                fontSize: '1em',
                fontWeight: 'bold',
                color: colour,
                marginBottom: '8px',
                paddingRight: '20px',
                lineHeight: 1.3,
            }}>
                {portal.name || 'Loading...'}
            </div>

            {/* Basic stats */}
            <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '0.85em',
                color: '#aaaaaa',
                marginBottom: '4px',
            }}>
                <span>Team: <span style={{ color: colour }}>{teamName}</span></span>
                {portal.level !== undefined && (
                    <span>Level: <span style={{ color: '#ffff00' }}>{portal.level}</span></span>
                )}
                {portal.health !== undefined && (
                    <span>Health: <span style={{ color: '#00ff00' }}>{portal.health}%</span></span>
                )}
            </div>

            {portal.owner && (
                <div style={{ fontSize: '0.85em', color: '#aaaaaa', marginBottom: '8px' }}>
                    Owner: <span style={{ color: '#ffffff' }}>{portal.owner}</span>
                </div>
            )}

            {/* Resonators */}
            {portal.resonators && portal.resonators.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                        RESONATORS ({portal.resonators.length}/8)
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '4px',
                    }}>
                        {portal.resonators.map((r, i) => (
                            <div key={i} style={{
                                background: '#111',
                                borderRadius: '3px',
                                padding: '3px 4px',
                                fontSize: '0.75em',
                                border: '1px solid #333',
                            }}>
                                <div style={{ color: '#ffff00' }}>L{r.level}</div>
                                <div style={{ color: '#aaaaaa' }}>{r.owner}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mods */}
            {portal.mods && portal.mods.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                        MODS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {portal.mods.map((m, i) => (
                            <div key={i} style={{
                                background: '#111',
                                borderRadius: '3px',
                                padding: '3px 6px',
                                fontSize: '0.75em',
                                border: `1px solid ${RARITY_COLOUR[m.rarity] || '#333'}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ color: RARITY_COLOUR[m.rarity] || '#fff' }}>{m.name}</span>
                                <span style={{ color: '#666' }}>{m.owner}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Coordinates */}
            <div style={{ marginTop: '4px', fontSize: '0.75em', color: '#666' }}>
                {portal.lat.toFixed(6)}, {portal.lng.toFixed(6)}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

export function IRISOverlay() {
    const portals = useStore((state) => state.portals);
    const links = useStore((state) => state.links);
    const fields = useStore((state) => state.fields);
    const statsItems = useStore((state) => state.statsItems);

    const [showMap, setShowMap] = useState(true);
    const [locStatus, setLocStatus] = useState<'NAVIGATE TO ME' | 'LOCATING...'>('NAVIGATE TO ME');

    const portalCount = Object.keys(portals).length;
    const linkCount = Object.keys(links).length;
    const fieldCount = Object.keys(fields).length;
    const playerStats = useStore((state) => state.playerStats);

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
        <Fragment>
            <div style={{ display: showMap ? 'block' : 'none' }}>
                <MapOverlay />
            </div>

            {/* Debug panel */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '50px',
                zIndex: 10000,
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#00ffff',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #00ffff',
                boxShadow: '0 0 10px #00ffff',
                fontFamily: 'monospace',
                pointerEvents: 'auto',
            }}>
                <div style={{ marginBottom: '10px' }}>
                    {playerStats ? (
                        <div>
                            <div style={{
                                fontSize: '1em',
                                fontWeight: 'bold',
                                color: TEAM_COLOUR[playerStats.team] || '#00ffff',
                            }}>
                                {playerStats.nickname}
                            </div>
                            <div style={{ fontSize: '0.8em', color: '#aaaaaa' }}>
                                Level {playerStats.level}
                                {playerStats.ap !== null && (
                                    <span> · {playerStats.ap.toLocaleString()} AP</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <h1 style={{ margin: 0, fontSize: '1.2em' }}>IRIS</h1>
                    )}
                </div>
                <p style={{ margin: 0 }}>Portals: {portalCount}</p>
                <p style={{ margin: 0 }}>Links: {linkCount}</p>
                <p style={{ margin: 0 }}>Fields: {fieldCount}</p>
                {Object.values(statsItems).map((item) => (
                    <p key={item.id} style={{ margin: 0 }}>
                        {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
                    </p>
                ))}
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <button onClick={() => setShowMap(!showMap)} style={btnStyle(true)}>
                        {showMap ? 'SHOW INTEL MAP' : 'SHOW IRIS MAP'}
                    </button>
                    <button
                        onClick={goToMyLocation}
                        disabled={locStatus === 'LOCATING...'}
                        style={btnStyle(locStatus !== 'LOCATING...')}
                    >
                        {locStatus}
                    </button>
                </div>
                <LocationSearch />
            </div>

            <PortalPopup />
        </Fragment>
    );
}