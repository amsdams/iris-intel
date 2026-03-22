import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@ittca/core';
import { MapOverlay } from './MapOverlay';

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
            minWidth: '280px',
            maxWidth: '380px',
            pointerEvents: 'auto',
        }}>
            {/* Close button */}
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
            >
                ✕
            </button>

            {/* Portal image */}
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

            {/* Portal name */}
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

            {/* Stats row */}
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

            {portal.resCount !== undefined && (
                <div style={{ fontSize: '0.85em', color: '#aaaaaa' }}>
                    Resonators: <span style={{ color: '#ffffff' }}>{portal.resCount}/8</span>
                </div>
            )}

            {portal.owner && (
                <div style={{ fontSize: '0.85em', color: '#aaaaaa', marginTop: '4px' }}>
                    Owner: <span style={{ color: '#ffffff' }}>{portal.owner}</span>
                </div>
            )}

            {/* Coordinates */}
            <div style={{
                marginTop: '8px',
                fontSize: '0.75em',
                color: '#666666',
            }}>
                {portal.lat.toFixed(6)}, {portal.lng.toFixed(6)}
            </div>
        </div>
    );
}

export function ITTCAOverlay() {
    const portals = useStore((state) => state.portals);
    const links = useStore((state) => state.links);
    const fields = useStore((state) => state.fields);
    const statsItems = useStore((state) => state.statsItems);

    const [showMap, setShowMap] = useState(true);
    const [locStatus, setLocStatus] = useState('NAVIGATE TO ME');

    const portalCount = Object.keys(portals).length;
    const linkCount = Object.keys(links).length;
    const fieldCount = Object.keys(fields).length;

    const goToMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setLocStatus('LOCATING...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                window.postMessage({
                    type: 'ITTCA_MOVE_MAP',
                    center: { lat: latitude, lng: longitude },
                    zoom: 15,
                }, '*');
                setLocStatus('NAVIGATE TO ME');
            },
            (error) => {
                setLocStatus('NAVIGATE TO ME');
                let msg = 'Location error: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED: msg += 'Permission denied.'; break;
                    case error.POSITION_UNAVAILABLE: msg += 'Position unavailable.'; break;
                    case error.TIMEOUT: msg += 'Request timed out.'; break;
                    default: msg += 'Unknown error.'; break;
                }
                alert(msg);
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
                <h1 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>ITTCA POC</h1>
                <p style={{ margin: 0 }}>Portals: {portalCount}</p>
                <p style={{ margin: 0 }}>Links: {linkCount}</p>
                <p style={{ margin: 0 }}>Fields: {fieldCount}</p>
                {Object.values(statsItems).map((item) => (
                    <p key={item.id} style={{ margin: 0 }}>
                        {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
                    </p>
                ))}
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <button
                        onClick={() => setShowMap(!showMap)}
                        style={{
                            background: '#00ffff',
                            color: '#000',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        {showMap ? 'SHOW INTEL MAP' : 'SHOW ITTCA MAP'}
                    </button>
                    <button
                        onClick={goToMyLocation}
                        disabled={locStatus === 'LOCATING...'}
                        style={{
                            background: locStatus === 'LOCATING...' ? '#555' : '#00ffff',
                            color: '#000',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: locStatus === 'LOCATING...' ? 'default' : 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        {locStatus}
                    </button>
                </div>
            </div>

            {/* Portal details popup */}
            <PortalPopup />
        </Fragment>
    );
}