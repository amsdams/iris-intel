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

    if (!playerStats) {
        return null;
    }

    const teamColour = theme[playerStats.team as keyof typeof theme] || UI_COLORS.TEXT_BASE;

    return (
        <Popup
            onClose={onClose}
            style={{
                bottom: '20px',
                right: '20px',
                minWidth: '250px',
                border: `2px solid ${teamColour}`,
                boxShadow: `0 0 20px ${teamColour}55`,
            }}
        >
            <div style={{
                fontSize: '1em',
                fontWeight: 'bold',
                color: teamColour,
                marginBottom: '8px',
                paddingRight: '20px', // Make space for close button
            }}>
                {playerStats.nickname}
            </div>
            <div style={{ fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED }}>
                Level {playerStats.level}
                {playerStats.ap !== null && (
                    <span> · {playerStats.ap.toLocaleString()} AP</span>
                )}
            </div>
        </Popup>
    );
}
