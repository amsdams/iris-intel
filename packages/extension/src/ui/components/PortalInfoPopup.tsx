import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { TEAM_COLOUR, TEAM_NAME, UI_COLORS } from '../theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RARITY_COLOUR: Record<string, string> = {
    COMMON: '#aaaaaa',
    RARE: '#6699ff',
    VERY_RARE: '#ff6600',
    EXTREMELY_RARE: '#ff0000',
};

// ---------------------------------------------------------------------------
// PortalInfoPopup
// ---------------------------------------------------------------------------

export function PortalInfoPopup() {
    const selectedPortalId = useStore((state) => state.selectedPortalId);
    const portal = useStore((state) =>
        selectedPortalId ? state.portals[selectedPortalId] : null
    );
    const selectPortal = useStore((state) => state.selectPortal);

    if (!portal) return null;

    const colour = TEAM_COLOUR[portal.team] || UI_COLORS.TEXT_BASE;
    const teamName = TEAM_NAME[portal.team] || 'Unknown';

    return (
        <Popup
            onClose={() => selectPortal(null)}
            style={{
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                minWidth: '300px',
                maxWidth: '420px',
                border: `2px solid ${colour}`,
                boxShadow: `0 0 20px ${colour}55`,
            }}
        >
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
                color: UI_COLORS.TEXT_MUTED,
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
                <div style={{ fontSize: '0.85em', color: UI_COLORS.TEXT_MUTED, marginBottom: '8px' }}>
                    Owner: <span style={{ color: colour }}>{portal.owner}</span>
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
                                border: `1px solid ${UI_COLORS.BORDER_DIM}`,
                            }}>
                                <div style={{ color: '#ffff00' }}>L{r.level}</div>
                                <div style={{ color: colour }}>{r.owner}</div>
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
                                border: `1px solid ${RARITY_COLOUR[m.rarity] || UI_COLORS.BORDER_DIM}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ color: RARITY_COLOUR[m.rarity] || UI_COLORS.TEXT_BASE }}>{m.name}</span>
                                <span style={{ color: colour }}>{m.owner}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Coordinates */}
            <div style={{ marginTop: '4px', fontSize: '0.75em', color: '#666' }}>
                {portal.lat.toFixed(6)}, {portal.lng.toFixed(6)}
            </div>
        </Popup>
    );
}
