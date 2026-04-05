import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';
import './player.css';

// ---------------------------------------------------------------------------
// PlayerStatsPopup
// ---------------------------------------------------------------------------

interface PlayerStatsPopupProps {
    onClose: () => void;
}

export function PlayerStatsPopup({ onClose }: PlayerStatsPopupProps): JSX.Element {
    const playerStats = useStore((state) => state.playerStats);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const team = (playerStats?.team as 'E' | 'R' | 'M' | 'N') || 'N';
    const teamColour = theme[team] || UI_COLORS.TEXT_BASE;

    return (
        <Popup
            onClose={onClose}
            title="Player Stats"
            className="iris-popup-center iris-popup-medium"
            style={{
                ['--iris-popup-border' as any]: teamColour,
                ['--iris-popup-shadow' as any]: `${teamColour}55`,
                ['--iris-popup-title-color' as any]: teamColour,
                ['--iris-faction-color' as any]: teamColour,
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
                        <div className="iris-player-nickname">
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
                                        <div 
                                            className="iris-stats-bar-fill"
                                            style={{ 
                                                ['--iris-progress' as any]: `${Math.min(100, (playerStats.energy / playerStats.xm_capacity) * 100)}%`,
                                                ['--iris-progress-color' as any]: '#00faff',
                                            }} 
                                        />
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
                                            <div 
                                                className="iris-stats-bar-fill"
                                                style={{ 
                                                    ['--iris-progress' as any]: `${Math.min(100, ((playerStats.ap - playerStats.min_ap_for_current_level) / (playerStats.min_ap_for_next_level - playerStats.min_ap_for_current_level)) * 100)}%`, 
                                                    ['--iris-progress-color' as any]: teamColour,
                                                }} 
                                            />
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
