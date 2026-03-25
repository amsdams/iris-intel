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
            title="Profile"
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
                        <div className="iris-player-meta" style={{ fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED }}>
                            <span className="iris-player-level">Level {playerStats.level}</span>
                            {playerStats.ap !== null && (
                                <span className="iris-player-ap"> · {playerStats.ap.toLocaleString()} AP</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Popup>
    );
}
