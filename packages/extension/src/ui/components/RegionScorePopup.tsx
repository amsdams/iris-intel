import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { THEMES, UI_COLORS } from '../theme';

interface RegionScorePopupProps {
    onClose: () => void;
}

export function RegionScorePopup({ onClose }: RegionScorePopupProps) {
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
            <div className="iris-region-score" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {!regionScore ? (
                    <div style={{ color: UI_COLORS.TEXT_MUTED, textAlign: 'center', padding: '10px' }}>
                        Region scores not yet captured.
                    </div>
                ) : (
                    <>
                        {/* Current Score Bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', fontWeight: 'bold' }}>
                                <span style={{ color: theme.E }}>{enlScore.toLocaleString()}</span>
                                <span style={{ color: theme.R }}>{resScore.toLocaleString()}</span>
                            </div>
                            <div style={{ 
                                width: '100%', 
                                height: '8px', 
                                display: 'flex', 
                                borderRadius: '4px', 
                                overflow: 'hidden',
                                backgroundColor: '#333'
                            }}>
                                <div style={{ width: `${enlPercent}%`, height: '100%', backgroundColor: theme.E }} />
                                <div style={{ width: `${resPercent}%`, height: '100%', backgroundColor: theme.R }} />
                            </div>
                        </div>

                        {/* Top Agents */}
                        <div className="iris-region-agents">
                            <div style={{ fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED, marginBottom: '5px', borderBottom: '1px solid #333' }}>
                                TOP AGENTS
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {regionScore.topAgents.map((agent, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em' }}>
                                        <span style={{ color: agent.team === 'RESISTANCE' ? theme.R : theme.E }}>
                                            {agent.nick}
                                        </span>
                                        <span style={{ color: UI_COLORS.TEXT_MUTED }}>#{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* History */}
                        <div className="iris-region-history">
                            <div style={{ fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED, marginBottom: '5px', borderBottom: '1px solid #333' }}>
                                CHECKPOINT HISTORY
                            </div>
                            <div style={{ 
                                maxHeight: '150px', 
                                overflowY: 'auto', 
                                display: 'flex', 
                                flexDirection: 'column',
                                fontSize: '0.8em'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: UI_COLORS.BG_POPUP, color: UI_COLORS.TEXT_MUTED }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '2px' }}>CP</th>
                                            <th style={{ textAlign: 'right', padding: '2px', color: theme.E }}>ENL</th>
                                            <th style={{ textAlign: 'right', padding: '2px', color: theme.R }}>RES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regionScore.scoreHistory.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                                                <td style={{ padding: '2px' }}>{row[0]}</td>
                                                <td style={{ textAlign: 'right', padding: '2px' }}>{parseInt(row[1], 10).toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '2px' }}>{parseInt(row[2], 10).toLocaleString()}</td>
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
