import { h } from 'preact';
import { useStore } from '@iris/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAM_COLOUR: Record<string, string> = {
    E: '#00ff00',
    R: '#0000ff',
    M: '#ff0000',
    N: '#ffffff',
};

// ---------------------------------------------------------------------------
// PlayerStatsPopup
// ---------------------------------------------------------------------------

interface PlayerStatsPopupProps {
    onClose: () => void;
}

export function PlayerStatsPopup({ onClose }: PlayerStatsPopupProps) {
    const playerStats = useStore((state) => state.playerStats);

    if (!playerStats) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 10002,
            background: 'rgba(0, 0, 0, 0.92)',
            color: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            border: `2px solid ${TEAM_COLOUR[playerStats.team] || '#ffffff'}`,
            boxShadow: `0 0 20px ${TEAM_COLOUR[playerStats.team] || '#ffffff'}55`,
            fontFamily: 'monospace',
            minWidth: '250px',
            maxHeight: '80vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
        }}>
            {/* Close button */}
            <button
                onClick={onClose}
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

            <div style={{
                fontSize: '1em',
                fontWeight: 'bold',
                color: TEAM_COLOUR[playerStats.team] || '#00ffff',
                marginBottom: '8px',
                paddingRight: '20px', // Make space for close button
            }}>
                {playerStats.nickname}
            </div>
            <div style={{ fontSize: '0.8em', color: '#aaaaaa' }}>
                Level {playerStats.level}
                {playerStats.ap !== null && (
                    <span> · {playerStats.ap.toLocaleString()} AP</span>
                )}
            </div>
        </div>
    );
}
