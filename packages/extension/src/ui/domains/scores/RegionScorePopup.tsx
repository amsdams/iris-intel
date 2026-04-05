import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';
import './scores.css';

interface RegionScorePopupProps {
    onClose: () => void;
}

export function RegionScorePopup({ onClose }: RegionScorePopupProps): JSX.Element {
    const regionScore = useStore((state) => state.regionScore);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const enlScore = regionScore?.gameScore[0] || 0;
    const resScore = regionScore?.gameScore[1] || 0;
    const total = enlScore + resScore;
    const enlPercent = total > 0 ? (enlScore / total) * 100 : 50;
    const resPercent = total > 0 ? (resScore / total) * 100 : 50;

    return (
        <Popup
            onClose={onClose}
            title={regionScore?.regionName || "Regional Score"}
            className="iris-popup-top-center iris-popup-medium"
            style={{
                ['--iris-popup-border' as any]: theme.AQUA,
                ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
                ['--iris-popup-title-color' as any]: theme.AQUA,
                ['--iris-enl-color' as any]: theme.E,
                ['--iris-res-color' as any]: theme.R,
                ['--iris-enl-percent' as any]: `${enlPercent}%`,
                ['--iris-res-percent' as any]: `${resPercent}%`,
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
                                <span className="iris-score-team-enl">{enlScore.toLocaleString()}</span>
                                <span className="iris-score-team-res">{resScore.toLocaleString()}</span>
                            </div>
                            <div className="iris-score-bar iris-region-score-bar">
                                <div className="iris-score-bar-enl" style={{ boxShadow: 'none' }} />
                                <div className="iris-score-bar-res" style={{ boxShadow: 'none' }} />
                            </div>
                        </div>

                        <div className="iris-region-agents">
                            <div className="iris-region-section-title">
                                TOP AGENTS
                            </div>
                            <div className="iris-region-agent-list">
                                {regionScore.topAgents.map((agent, i) => (
                                    <div key={i} className="iris-region-agent-row">
                                        <span className={agent.team === 'RESISTANCE' ? 'iris-score-team-res' : 'iris-score-team-enl'}>
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
                                            <th className="iris-region-history-cell-right iris-score-team-enl">ENL</th>
                                            <th className="iris-region-history-cell-right iris-score-team-res">RES</th>
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
