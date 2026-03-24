import { h } from 'preact';
import { useEffect } from 'preact/hooks';
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

    const handleRefresh = () => {
        const minTimestampMs = plexts.length > 0 ? plexts[0].time : -1;
        window.postMessage({ type: 'IRIS_PLEXTS_REQUEST', minTimestampMs }, '*');
    };

    useEffect(() => {
        handleRefresh();
    }, []);

    const renderMarkup = (markup: any[]) => {
        return markup.map((m, i) => {
            const type = m[0];
            const data = m[1];
            let color = UI_COLORS.TEXT_BASE;
            let text = data.plain || data.name || data;

            // Skip redundant FACTION labels (Resistance/Enlightened)
            if (type === 'FACTION') {
                return null;
            }

            // Skip the " agent " connector and other redundant team prefixes
            if (type === 'TEXT') {
                if (text === ' agent ' || text === ' agent') return null;
                text = text.replace(/Resistance agent\s/g, '');
                text = text.replace(/Enlightened agent\s/g, '');
            }

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
                    {text}
                </span>
            );
        });
    };

    return (
        <Popup
            onClose={onClose}
            title="COMM"
            headerExtras={
                <button 
                    onClick={handleRefresh}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${UI_COLORS.AQUA}`,
                        color: UI_COLORS.AQUA,
                        fontSize: '9px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        marginRight: SPACING.SM,
                    }}
                >
                    REFRESH
                </button>
            }
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
