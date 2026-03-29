import { JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';

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
            <div className="iris-game-score">
                {!gameScore ? (
                    <div className="iris-score-empty">
                        Game scores not yet captured.
                    </div>
                ) : (
                    <div className="iris-game-score-layout">
                        <div className="iris-score-bar iris-game-score-bar">
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

                        <div className="iris-score-segments">
                            <div className="iris-score-segment iris-score-segment-left">
                                <span className="iris-score-team-label" style={{ color: theme.E }}>ENLIGHTENED</span>
                                <span className="iris-score-total">
                                    {gameScore.enlightened.toLocaleString()}
                                </span>
                                <span className="iris-score-percent">
                                    {enlPercent.toFixed(1)}%
                                </span>
                            </div>
                            <div className="iris-score-segment iris-score-segment-right">
                                <span className="iris-score-team-label" style={{ color: theme.R }}>RESISTANCE</span>
                                <span className="iris-score-total">
                                    {gameScore.resistance.toLocaleString()}
                                </span>
                                <span className="iris-score-percent">
                                    {resPercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        <div className="iris-game-score-footer">
                            Mind Units (MU) Global Control
                        </div>
                    </div>
                )}
            </div>
        </Popup>
    );
}
