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
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const total = (gameScore?.enlightened || 0) + (gameScore?.resistance || 0);
    const enlPercent = total > 0 ? (gameScore?.enlightened || 0) / total * 100 : 50;
    const resPercent = total > 0 ? (gameScore?.resistance || 0) / total * 100 : 50;

    return (
        <Popup
            onClose={onClose}
            title="Global Score"
            className="iris-popup-top-center iris-popup-medium"
            style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
                '--iris-enl-color': theme.E,
                '--iris-res-color': theme.R,
                '--iris-enl-percent': `${enlPercent}%`,
                '--iris-res-percent': `${resPercent}%`,
            } as Record<string, string>}
        >
            <div className="iris-game-score">
                {!gameScore ? (
                    <div className="iris-score-empty">
                        Game scores not yet captured.
                    </div>
                ) : (
                    <div className="iris-game-score-layout">
                        <div className="iris-score-bar iris-game-score-bar">
                            <div className="iris-score-bar-enl" />
                            <div className="iris-score-bar-res" />
                        </div>

                        <div className="iris-score-segments">
                            <div className="iris-score-segment iris-score-segment-left">
                                <span className="iris-score-team-label iris-score-team-enl">ENLIGHTENED</span>
                                <span className="iris-score-total">
                                    {gameScore.enlightened.toLocaleString()}
                                </span>
                                <span className="iris-score-percent">
                                    {enlPercent.toFixed(1)}%
                                </span>
                            </div>
                            <div className="iris-score-segment iris-score-segment-right">
                                <span className="iris-score-team-label iris-score-team-res">RESISTANCE</span>
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
