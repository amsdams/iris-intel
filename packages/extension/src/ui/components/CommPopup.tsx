import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { TEAM_COLOUR, UI_COLORS, normalizeTeam } from '../theme';

interface CommPopupProps {
    onClose: () => void;
}

export function CommPopup({ onClose }: CommPopupProps) {
    const plexts = useStore((state) => state.plexts);

    const formatTime = (ms: number) => {
        const date = new Date(ms);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    const renderMarkup = (markup: any[]) => {
        return markup.map((m, i) => {
            const type = m[0];
            const data = m[1];
            let color = UI_COLORS.TEXT_BASE;

            if (type === 'PLAYER') {
                color = TEAM_COLOUR[normalizeTeam(data.team)] || UI_COLORS.TEXT_BASE;
            } else if (type === 'PORTAL') {
                color = UI_COLORS.AQUA;
            } else if (type === 'SECURE') {
                color = '#ffff00';
            } else if (type === 'SENDER') {
                color = TEAM_COLOUR[normalizeTeam(data.team)] || UI_COLORS.TEXT_BASE;
            }

            return (
                <span key={i} style={{ color }}>
                    {data.plain || data.name || data}
                </span>
            );
        });
    };

    return (
        <Popup
            onClose={onClose}
            title="COMM"
            style={{
                top: '60px',
                right: '20px',
                width: '400px',
                padding: '0',
            }}
        >
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
            }}>
                {plexts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: UI_COLORS.TEXT_MUTED }}>
                        No messages yet
                    </div>
                ) : (
                    plexts.map((p) => (
                        <div key={p.id} style={{
                            marginBottom: '6px',
                            fontSize: '0.85em',
                            lineHeight: '1.4',
                            borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                            paddingBottom: '4px',
                        }}>
                            <span style={{ color: UI_COLORS.TEXT_MUTED, marginRight: '6px' }}>
                                [{formatTime(p.time)}]
                            </span>
                            {p.markup ? renderMarkup(p.markup) : p.text}
                        </div>
                    ))
                )}
            </div>
        </Popup>
    );
}
