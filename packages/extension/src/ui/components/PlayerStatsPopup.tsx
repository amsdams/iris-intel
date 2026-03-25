import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { THEMES, UI_COLORS } from '../theme';

// ---------------------------------------------------------------------------
// PlayerStatsPopup
// ---------------------------------------------------------------------------

interface PlayerStatsPopupProps {
    onClose: () => void;
}

export function PlayerStatsPopup({ onClose }: PlayerStatsPopupProps) {
    const playerStats = useStore((state) => state.playerStats);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    const team = (playerStats?.team as 'E' | 'R' | 'M' | 'N') || 'N';
    const teamColour = theme[team] || UI_COLORS.TEXT_BASE;

    return (
        <Popup
            onClose={onClose}
            title="Player Stats"
            style={{
                bottom: '20px',
                right: '20px',
                minWidth: '250px',
                border: `2px solid ${teamColour}`,
                boxShadow: `0 0 20px ${teamColour}55`,
            }}
        >
            <div className="iris-player-stats">
                {!playerStats ? (
                    <div style={{ color: UI_COLORS.TEXT_MUTED, fontSize: '0.9em', textAlign: 'center', padding: '10px' }}>
                        Player data not yet captured.<br/>
                        Intel may still be loading.
                    </div>
                ) : (
                    <>
                        <div 
                            className="iris-player-nickname"
                            style={{
                                fontSize: '1em',
                                fontWeight: 'bold',
                                color: teamColour,
                                marginBottom: '8px',
                                paddingRight: '20px', // Make space for close button
                            }}
                        >
                            {playerStats.nickname}
                        </div>
                        <div className="iris-player-meta" style={{ fontSize: '0.85em', color: UI_COLORS.TEXT_MUTED, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Level {playerStats.level}</span>
                                {playerStats.ap !== null && (
                                    <span style={{ color: UI_COLORS.TEXT_BASE }}>{playerStats.ap.toLocaleString()} AP</span>
                                )}
                            </div>

                            {playerStats.energy !== undefined && playerStats.xm_capacity !== undefined && (
                                <div className="iris-stats-xm">
                                    <div style={{ fontSize: '0.8em', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>XM</span>
                                        <span>{playerStats.energy.toLocaleString()} / {playerStats.xm_capacity.toLocaleString()}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${Math.min(100, (playerStats.energy / playerStats.xm_capacity) * 100)}%`, 
                                            height: '100%', 
                                            backgroundColor: '#00faff', // XM color
                                            boxShadow: '0 0 5px #00faff'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {playerStats.min_ap_for_next_level !== undefined && playerStats.min_ap_for_next_level > 0 && (
                                <div className="iris-stats-progress">
                                    <div style={{ fontSize: '0.8em', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Next Level</span>
                                        <span>{playerStats.min_ap_for_next_level.toLocaleString()} AP</span>
                                    </div>
                                    {playerStats.ap !== null && playerStats.min_ap_for_current_level !== undefined && (
                                        <div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${Math.min(100, ((playerStats.ap - playerStats.min_ap_for_current_level) / (playerStats.min_ap_for_next_level - playerStats.min_ap_for_current_level)) * 100)}%`, 
                                                height: '100%', 
                                                backgroundColor: teamColour,
                                                boxShadow: `0 0 5px ${teamColour}`
                                            }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {playerStats.available_invites !== undefined && playerStats.available_invites > 0 && (
                                <div style={{ fontSize: '0.8em', marginTop: '4px', opacity: 0.8 }}>
                                    {playerStats.available_invites} invites available
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Popup>
    );
}
