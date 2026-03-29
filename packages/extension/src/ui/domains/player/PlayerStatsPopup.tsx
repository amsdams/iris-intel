import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';

// ---------------------------------------------------------------------------
// PlayerStatsPopup
// ---------------------------------------------------------------------------

interface PlayerStatsPopupProps {
    onClose: () => void;
}

export function PlayerStatsPopup({ onClose }: PlayerStatsPopupProps): JSX.Element {
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
                    <div className="iris-player-empty">
                        Player data not yet captured.<br/>
                        Intel may still be loading.
                    </div>
                ) : (
                    <>
                        <div 
                            className="iris-player-nickname"
                            style={{ color: teamColour }}
                        >
                            {playerStats.nickname}
                        </div>
                        <div className="iris-player-meta">
                            <div className="iris-player-meta-row">
                                <span>Level {playerStats.level}</span>
                                {playerStats.ap !== null && (
                                    <span className="iris-player-ap">{playerStats.ap.toLocaleString()} AP</span>
                                )}
                            </div>

                            {playerStats.energy !== undefined && playerStats.xm_capacity !== undefined && (
                                <div className="iris-stats-xm">
                                    <div className="iris-stats-label-row">
                                        <span>XM</span>
                                        <span>{playerStats.energy.toLocaleString()} / {playerStats.xm_capacity.toLocaleString()}</span>
                                    </div>
                                    <div className="iris-stats-bar-bg">
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
                                    <div className="iris-stats-label-row">
                                        <span>Next Level</span>
                                        <span>{playerStats.min_ap_for_next_level.toLocaleString()} AP</span>
                                    </div>
                                    {playerStats.ap !== null && playerStats.min_ap_for_current_level !== undefined && (
                                        <div className="iris-stats-bar-bg">
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
                                <div className="iris-player-invites">
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
