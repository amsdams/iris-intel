import { h } from 'preact';
import { useStore, normalizeTeam } from '@iris/core';
import { Popup } from './Popup';
import { THEMES, UI_COLORS, SPACING } from '../theme';

interface CommPopupProps {
    onClose: () => void;
}

export function CommPopup({ onClose }: CommPopupProps) {
    const plexts = useStore((state) => state.plexts);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

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
                const team = normalizeTeam(data.team) as 'E' | 'R' | 'M' | 'N';
                color = theme[team] || UI_COLORS.TEXT_BASE;
            } else if (type === 'PORTAL') {
                color = theme.AQUA;
            } else if (type === 'SECURE') {
                color = '#ffff00';
            } else if (type === 'SENDER') {
                const team = normalizeTeam(data.team) as 'E' | 'R' | 'M' | 'N';
                color = theme[team] || UI_COLORS.TEXT_BASE;
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
            }}
        >
            <div style={{
                flex: 1,
                overflowY: 'auto',
            }}>
                {plexts.length === 0 ? (
                    <div style={{ padding: SPACING.LG, textAlign: 'center', color: UI_COLORS.TEXT_MUTED }}>
                        No messages yet
                    </div>
                ) : (
                    plexts.map((p) => (
                        <div key={p.id} style={{
                            marginBottom: SPACING.SM,
                            fontSize: '0.85em',
                            lineHeight: '1.4',
                            borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                            paddingBottom: SPACING.XS,
                        }}>
                            <span style={{ color: UI_COLORS.TEXT_MUTED, marginRight: SPACING.SM }}>
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
