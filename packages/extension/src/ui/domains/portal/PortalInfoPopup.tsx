import { h, JSX } from 'preact';
import { PortalMod, PortalResonator, useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, TEAM_NAME, UI_COLORS } from '../../theme';

// ---------------------------------------------------------------------------
// PortalInfoPopup
// ---------------------------------------------------------------------------

const MAX_RESO_ENERGY = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000];

export function PortalInfoPopup(): JSX.Element | null {
    const portals = useStore((state) => state.portals);
    const artifacts = useStore((state) => state.artifacts);
    const selectedPortalId = useStore((state) => state.selectedPortalId);
    const portal = selectedPortalId ? portals[selectedPortalId] : null;
    const artifact = selectedPortalId ? artifacts[selectedPortalId] : null;

    const selectPortal = useStore((state) => state.selectPortal);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    if (!portal) return null;

    const factionKey = portal.team as 'E' | 'R' | 'M' | 'N';
    const colour = theme[factionKey] || theme.N || UI_COLORS.TEXT_BASE;
    const teamName = TEAM_NAME[portal.team] || 'Unknown';

    // Resonators — Ensure we have 8 slots
    const allResonators: (PortalResonator | null)[] = Array.from({ length: 8 }, () => null);
    if (portal.resonators) {
        portal.resonators.forEach((r: PortalResonator, i: number) => {
            if (i < 8) allResonators[i] = r;
        });
    }

    // Mods — Ensure we have 4 slots
    const allMods: (PortalMod | null)[] = Array.from({ length: 4 }, () => null);
    if (portal.mods) {
        portal.mods.forEach((m: PortalMod, i: number) => {
            if (i < 4) allMods[i] = m;
        });
    }

    const openPortalMissions = (): void => {
        document.dispatchEvent(
            new CustomEvent('iris:missions:open', { detail: { portalId: portal.id } })
        );
    };

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

                {artifact && (
                    <div className="iris-portal-artifact-section" style={{
                        marginTop: '8px',
                        marginBottom: '8px',
                        padding: '8px',
                        border: '1px solid #f0f',
                        background: 'rgba(255, 0, 255, 0.1)',
                        borderRadius: '4px'
                    }}>
                        <div className="iris-portal-section-title" style={{ fontSize: '0.8em', color: '#f0f', marginBottom: '4px', fontWeight: 'bold' }}>
                            ARTIFACT: {artifact.type.toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {artifact.ids.map(id => (
                                <span key={id} style={{
                                    fontSize: '0.8em',
                                    color: '#f0f',
                                    background: 'rgba(255, 0, 255, 0.2)',
                                    padding: '2px 6px',
                                    borderRadius: '2px',
                                    border: '1px solid rgba(255, 0, 255, 0.5)'
                                }}>
                                    #{id}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {portal.owner && (
                    <div className="iris-portal-owner" style={{ fontSize: '0.85em', color: UI_COLORS.TEXT_MUTED, marginBottom: '8px' }}>
                        Owner: <span className="iris-portal-owner-name" style={{ color: colour }}>{portal.owner}</span>
                    </div>
                )}

                {portal.hasMissionsStartingHere && (
                    <div style={{ marginBottom: '8px' }}>
                        <button
                            onClick={openPortalMissions}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${colour}`,
                                color: colour,
                                padding: '4px 8px',
                                fontSize: '0.8em',
                                cursor: 'pointer',
                            }}
                        >
                            Missions Starting Here
                        </button>
                    </div>
                )}

                <div className="iris-portal-history-section">
                    <div className="iris-portal-section-title" style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                        HISTORY
                    </div>
                    <div className="iris-portal-history-badges">
                        <span
                            className={`iris-portal-history-badge ${portal.visited ? 'iris-portal-history-badge-active' : 'iris-portal-history-badge-inactive'}`}
                            style={{ borderColor: '#9B59B6', color: portal.visited ? '#9B59B6' : '#666' }}
                        >
                            Visited
                        </span>
                        <span
                            className={`iris-portal-history-badge ${portal.captured ? 'iris-portal-history-badge-active' : 'iris-portal-history-badge-inactive'}`}
                            style={{ borderColor: '#E74C3C', color: portal.captured ? '#E74C3C' : '#666' }}
                        >
                            Captured
                        </span>
                        <span
                            className={`iris-portal-history-badge ${portal.scanned ? 'iris-portal-history-badge-active' : 'iris-portal-history-badge-inactive'}`}
                            style={{ borderColor: '#F1C40F', color: portal.scanned ? '#F1C40F' : '#666' }}
                        >
                            Scanned
                        </span>
                    </div>
                </div>

                {/* Resonators */}
                <div className="iris-portal-resonators-section" style={{ marginBottom: '8px' }}>
                    <div className="iris-portal-section-title" style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                        RESONATORS ({portal.resonators?.length || 0}/8)
                    </div>
                    <div className="iris-portal-resonators-grid">
                        {allResonators.map((r, i) => {
                            if (!r) {
                                return (
                                    <div key={i} className="iris-portal-resonator-item iris-portal-resonator-empty" style={{
                                        border: `1px dashed ${UI_COLORS.BORDER_DIM}`,
                                        opacity: 0.5,
                                    }}>
                                        <div style={{ color: '#444' }}>EMPTY</div>
                                        <div style={{ color: 'transparent' }}>-</div>
                                    </div>
                                );
                            }
                            const maxEnergy = MAX_RESO_ENERGY[r.level] || 1000;
                            const healthPct = Math.round((r.energy / maxEnergy) * 100);
                            return (
                                <div key={i} className="iris-portal-resonator-item" style={{
                                    border: `1px solid ${theme.LEVELS[r.level] || UI_COLORS.BORDER_DIM}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="iris-portal-resonator-level" style={{ color: theme.LEVELS[r.level] || '#ffff00', fontWeight: 'bold' }}>L{r.level}</span>
                                        <span style={{ fontSize: '0.8em', color: '#00ff00', opacity: 0.8 }}>{healthPct}%</span>
                                    </div>
                                    <div className="iris-portal-resonator-owner" style={{ color: colour }}>{r.owner}</div>
                                    <div 
                                        className="iris-portal-resonator-health-bar" 
                                        style={{ 
                                            width: `${healthPct}%`,
                                            background: healthPct > 50 ? '#00ff00' : (healthPct > 20 ? '#ffff00' : '#ff0000')
                                        }} 
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mods */}
                <div className="iris-portal-mods-section" style={{ marginBottom: '8px' }}>
                    <div className="iris-portal-section-title" style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                        MODS
                    </div>
                    <div className="iris-portal-mods-list" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {allMods.map((m, i) => {
                            if (!m) {
                                return (
                                    <div key={i} className="iris-portal-mod-item iris-portal-mod-empty" style={{
                                        border: `1px dashed ${UI_COLORS.BORDER_DIM}`,
                                        opacity: 0.5,
                                        justifyContent: 'center',
                                        color: '#444',
                                    }}>
                                        EMPTY SLOT
                                    </div>
                                );
                            }
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

                {/* Coordinates */}
                <div className="iris-portal-coords" style={{ marginTop: '4px', fontSize: '0.75em', color: '#666' }}>
                    {portal.lat.toFixed(6)}, {portal.lng.toFixed(6)}
                </div>
            </div>
        </Popup>
    );
}
