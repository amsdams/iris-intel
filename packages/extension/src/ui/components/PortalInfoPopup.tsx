import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { THEMES, TEAM_NAME, UI_COLORS } from '../theme';

// ---------------------------------------------------------------------------
// PortalInfoPopup
// ---------------------------------------------------------------------------

export function PortalInfoPopup() {
    const selectedPortalId = useStore((state) => state.selectedPortalId);
    const portal = useStore((state) =>
        selectedPortalId ? state.portals[selectedPortalId] : null
    );
    const selectPortal = useStore((state) => state.selectPortal);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    if (!portal) return null;

    const factionKey = portal.team as 'E' | 'R' | 'M' | 'N';
    const colour = theme[factionKey] || theme.N || UI_COLORS.TEXT_BASE;
    const teamName = TEAM_NAME[portal.team] || 'Unknown';

    return (
        <Popup
            onClose={() => selectPortal(null)}
            title="Portal Details"
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
            <div className="iris-portal-info">
                {/* Image */}
                {portal.image && (
                    <div className="iris-portal-image-container">
                        <img
                            src={portal.image}
                            alt={portal.name || 'Portal'}
                            className="iris-portal-image"
                            style={{ border: `1px solid ${colour}` }}
                        />
                    </div>
                )}

                {/* Name */}
                <div 
                    className="iris-portal-name"
                    style={{ color: colour }}
                >
                    {portal.name || 'Loading...'}
                </div>

                {/* Basic stats */}
                <div className="iris-portal-stats">
                    <span className="iris-portal-stat-team">Team: <span style={{ color: colour }}>{teamName}</span></span>
                    {portal.level !== undefined && (
                        <span className="iris-portal-stat-level">Level: <span style={{ color: theme.LEVELS[portal.level] || '#ffff00' }}>{portal.level}</span></span>
                    )}
                    {portal.health !== undefined && (
                        <span className="iris-portal-stat-health">Health: <span style={{ color: '#00ff00' }}>{portal.health}%</span></span>
                    )}
                </div>

                {portal.owner && (
                    <div className="iris-portal-owner" style={{ fontSize: '0.85em', color: UI_COLORS.TEXT_MUTED, marginBottom: '8px' }}>
                        Owner: <span className="iris-portal-owner-name" style={{ color: colour }}>{portal.owner}</span>
                    </div>
                )}

                {/* Resonators */}
                {portal.resonators && portal.resonators.length > 0 && (
                    <div className="iris-portal-resonators-section" style={{ marginBottom: '8px' }}>
                        <div className="iris-portal-section-title" style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                            RESONATORS ({portal.resonators.length}/8)
                        </div>
                        <div className="iris-portal-resonators-grid">
                            {portal.resonators.map((r, i) => (
                                <div key={i} className="iris-portal-resonator-item" style={{
                                    border: `1px solid ${theme.LEVELS[r.level] || UI_COLORS.BORDER_DIM}`,
                                }}>
                                    <div className="iris-portal-resonator-level" style={{ color: theme.LEVELS[r.level] || '#ffff00' }}>L{r.level}</div>
                                    <div className="iris-portal-resonator-owner" style={{ color: colour }}>{r.owner}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mods */}
                {portal.mods && portal.mods.length > 0 && (
                    <div className="iris-portal-mods-section" style={{ marginBottom: '8px' }}>
                        <div className="iris-portal-section-title" style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                            MODS
                        </div>
                        <div className="iris-portal-mods-list" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {portal.mods.map((m, i) => {
                                const modRarityColor = theme.RARITY[m.rarity] || UI_COLORS.BORDER_DIM;
                                return (
                                    <div key={i} className="iris-portal-mod-item" style={{
                                        border: `1px solid ${modRarityColor}`,
                                    }}>
                                        <span className="iris-portal-mod-info" style={{ color: modRarityColor }}>
                                            {m.rarity} {m.name}
                                        </span>
                                        <span className="iris-portal-mod-owner" style={{ color: colour }}>{m.owner}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Coordinates */}
                <div className="iris-portal-coords" style={{ marginTop: '4px', fontSize: '0.75em', color: '#666' }}>
                    {portal.lat.toFixed(6)}, {portal.lng.toFixed(6)}
                </div>
            </div>
        </Popup>
    );
}
