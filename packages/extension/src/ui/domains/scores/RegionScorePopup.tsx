import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';

interface RegionScorePopupProps {
    onClose: () => void;
}

export function RegionScorePopup({ onClose }: RegionScorePopupProps): JSX.Element {
    const regionScore = useStore((state) => state.regionScore);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    const enlScore = regionScore?.gameScore[0] || 0;
    const resScore = regionScore?.gameScore[1] || 0;
    const total = enlScore + resScore;
    const enlPercent = total > 0 ? (enlScore / total) * 100 : 50;
    const resPercent = total > 0 ? (resScore / total) * 100 : 50;

    return (
        <Popup
            onClose={onClose}
            title={regionScore?.regionName || "Regional Score"}
            style={{
                bottom: '140px',
                right: '20px',
                minWidth: '320px',
                maxWidth: '400px',
            }}
        >
            <div className="iris-region-score">
                {!regionScore ? (
                    <div className="iris-score-empty">
                        Region scores not yet captured.
                    </div>
                ) : (
                    <>
                        <div className="iris-region-score-current">
                            <div className="iris-region-score-header">
                                <span style={{ color: theme.E }}>{enlScore.toLocaleString()}</span>
                                <span style={{ color: theme.R }}>{resScore.toLocaleString()}</span>
                            </div>
                            <div className="iris-score-bar iris-region-score-bar">
                                <div style={{ width: `${enlPercent}%`, height: '100%', backgroundColor: theme.E }} />
                                <div style={{ width: `${resPercent}%`, height: '100%', backgroundColor: theme.R }} />
                            </div>
                        </div>

                        <div className="iris-region-agents">
                            <div className="iris-region-section-title">
                                TOP AGENTS
                            </div>
                            <div className="iris-region-agent-list">
                                {regionScore.topAgents.map((agent, i) => (
                                    <div key={i} className="iris-region-agent-row">
                                        <span style={{ color: agent.team === 'RESISTANCE' ? theme.R : theme.E }}>
                                            {agent.nick}
                                        </span>
                                        <span className="iris-region-agent-rank">#{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="iris-region-history">
                            <div className="iris-region-section-title">
                                CHECKPOINT HISTORY
                            </div>
                            <div className="iris-region-history-scroll">
                                <table className="iris-region-history-table">
                                    <thead className="iris-region-history-head">
                                        <tr>
                                            <th className="iris-region-history-cell-left">CP</th>
                                            <th className="iris-region-history-cell-right" style={{ color: theme.E }}>ENL</th>
                                            <th className="iris-region-history-cell-right" style={{ color: theme.R }}>RES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regionScore.scoreHistory.map((row, i) => (
                                            <tr key={i} className="iris-region-history-row">
                                                <td className="iris-region-history-cell-left">{row[0]}</td>
                                                <td className="iris-region-history-cell-right">{parseInt(row[1], 10).toLocaleString()}</td>
                                                <td className="iris-region-history-cell-right">{parseInt(row[2], 10).toLocaleString()}</td>
                                            </tr>
                                        )).reverse()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Popup>
    );
}
