import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { MapOverlay } from './MapOverlay';
import { Topbar } from './Topbar';
import { PlayerStatsPopup } from './PlayerStatsPopup';
import { StateDebugPopup } from './StateDebugPopup';

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
.
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
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
    const [showStateDebugPopup, setShowStateDebugPopup] = useState(false);
    const [showMap, setShowMap] = useState(true); // Moved here from Topbar

    const togglePlayerStatsPopup = () => setShowPlayerStatsPopup(!showPlayerStatsPopup);
    const toggleStateDebugPopup = () => setShowStateDebugPopup(!showStateDebugPopup);
    const toggleMapVisibility = () => setShowMap(!showMap);

    return (
        <Fragment>
            <Topbar
                onTogglePlayerStats={togglePlayerStatsPopup}
                onToggleStateDebug={toggleStateDebugPopup}
                onToggleMapVisibility={toggleMapVisibility}
                showMap={showMap}
            />
            <div style={{ display: showMap ? 'block' : 'none' }}>
                <MapOverlay />
            </div>

            <PortalPopup />

            {showPlayerStatsPopup && (
                <PlayerStatsPopup onClose={togglePlayerStatsPopup} />
            )}

            {showStateDebugPopup && (
                <StateDebugPopup onClose={toggleStateDebugPopup} />
            )}
        </Fragment>
    );
}