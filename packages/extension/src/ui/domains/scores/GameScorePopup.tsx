import { JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';

interface GameScorePopupProps {
    onClose: () => void;
}

export function GameScorePopup({ onClose }: GameScorePopupProps): JSX.Element {
    const gameScore = useStore((state) => state.gameScore);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    const total = (gameScore?.enlightened || 0) + (gameScore?.resistance || 0);
    const enlPercent = total > 0 ? (gameScore?.enlightened || 0) / total * 100 : 50;
    const resPercent = total > 0 ? (gameScore?.resistance || 0) / total * 100 : 50;

    return (
        <Popup
            onClose={onClose}
            title="Global Score"
            style={{
                bottom: '80px',
                right: '20px',
                minWidth: '300px',
            }}
        >
            <div className="iris-game-score" style={{ padding: '5px 0' }}>
                {!gameScore ? (
                    <div style={{ color: UI_COLORS.TEXT_MUTED, textAlign: 'center', padding: '10px' }}>
                        Game scores not yet captured.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Score Bar */}
                        <div style={{ 
                            width: '100%', 
                            height: '10px', 
                            display: 'flex', 
                            borderRadius: '5px', 
                            overflow: 'hidden',
                            backgroundColor: '#333'
                        }}>
                            <div style={{ 
                                width: `${enlPercent}%`, 
                                height: '100%', 
                                backgroundColor: theme.E,
                                boxShadow: `0 0 10px ${theme.E}`
                            }} />
                            <div style={{ 
                                width: `${resPercent}%`, 
                                height: '100%', 
                                backgroundColor: theme.R,
                                boxShadow: `0 0 10px ${theme.R}`
                            }} />
                        </div>

                        {/* Faction Scores */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ color: theme.E, fontWeight: 'bold', fontSize: '0.8em' }}>ENLIGHTENED</span>
                                <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                                    {gameScore.enlightened.toLocaleString()}
                                </span>
                                <span style={{ fontSize: '0.75em', color: UI_COLORS.TEXT_MUTED }}>
                                    {enlPercent.toFixed(1)}%
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ color: theme.R, fontWeight: 'bold', fontSize: '0.8em' }}>RESISTANCE</span>
                                <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                                    {gameScore.resistance.toLocaleString()}
                                </span>
                                <span style={{ fontSize: '0.75em', color: UI_COLORS.TEXT_MUTED }}>
                                    {resPercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        <div style={{ 
                            fontSize: '0.7em', 
                            color: UI_COLORS.TEXT_MUTED, 
                            textAlign: 'center',
                            borderTop: '1px solid #333',
                            paddingTop: '10px'
                        }}>
                            Mind Units (MU) Global Control
                        </div>
                    </div>
                )}
            </div>
        </Popup>
    );
}
