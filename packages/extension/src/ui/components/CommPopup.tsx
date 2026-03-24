import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
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
    const [activeTab, setActiveTab] = useState('ALL');

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

    const filteredPlexts = plexts.filter(p => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'CHAT') return p.type === 'PLAYER_GENERATED';
        if (activeTab === 'GLOBAL') return p.type === 'SYSTEM_BROADCAST';
        if (activeTab === 'FACTION') return p.type === 'SYSTEM_NARROWCAST';
        return true;
    });

    const renderMarkup = (markup: any[]) => {
        return markup.map((m, i) => {
            const type = m[0];
            const data = m[1];
            let color = UI_COLORS.TEXT_BASE;
            
            // Get text, handle object vs string data
            let text = typeof data === 'string' ? data : (data.plain || data.name || '');

            // Skip redundant FACTION labels (Resistance/Enlightened)
            if (type === 'FACTION') {
                return null;
            }

            // Skip the " agent " connector and other redundant team prefixes
            if (type === 'TEXT' && typeof text === 'string') {
                if (text === ' agent ' || text === ' agent') return null;
                text = text.replace(/Resistance agent\s/g, '');
                text = text.replace(/Enlightened agent\s/g, '');
            }

            if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
                const team = normalizeTeam(data.team) as 'E' | 'R' | 'M' | 'N';
                color = theme[team] || UI_COLORS.TEXT_BASE;
                // Prepend @ for AT_PLAYER if not already there
                if (type === 'AT_PLAYER' && typeof text === 'string' && !text.startsWith('@')) {
                    text = '@' + text;
                }
            } else if (type === 'PORTAL') {
                color = theme.AQUA;
                return (
                    <span 
                        key={i} 
                        style={{ 
                            color, 
                            cursor: 'pointer',
                            borderBottom: `1px dotted ${theme.AQUA}`,
                        }}
                        onClick={() => {
                            if (data.latE6 && data.lngE6) {
                                window.postMessage({
                                    type: 'IRIS_MOVE_MAP',
                                    center: { lat: data.latE6 / 1e6, lng: data.lngE6 / 1e6 },
                                    zoom: 17
                                }, '*');
                            }
                        }}
                    >
                        {String(text || '')}
                    </span>
                );
            } else if (type === 'SECURE') {
                color = '#ffff00';
            } else if (type === 'LINK') {
                // Determine team color for link if available
                const team = normalizeTeam(data.team) as 'E' | 'R' | 'M' | 'N';
                color = theme[team] || theme.AQUA;
                return (
                    <span 
                        key={i} 
                        style={{ 
                            color, 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                        onClick={() => {
                            // Link objects usually have coordinates for start/end
                            const lat = data.latE6 / 1e6;
                            const lng = data.lngE6 / 1e6;
                            if (lat && lng) {
                                window.postMessage({
                                    type: 'IRIS_MOVE_MAP',
                                    center: { lat, lng },
                                    zoom: 16
                                }, '*');
                            }
                        }}
                    >
                        {String(text || 'link')}
                    </span>
                );
            }

            return (
                <span key={i} style={{ color }}>
                    {String(text || '')}
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
                width: '450px',
                height: '550px',
            }}
        >
            <div style={{ display: 'flex', borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`, marginBottom: SPACING.SM }}>
                {['ALL', 'CHAT', 'GLOBAL', 'FACTION'].map(tab => (
                    <div 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                            borderBottom: activeTab === tab ? `2px solid ${UI_COLORS.AQUA}` : 'none',
                            color: activeTab === tab ? UI_COLORS.AQUA : UI_COLORS.TEXT_MUTED,
                            fontWeight: activeTab === tab ? 'bold' : 'normal',
                        }}
                    >
                        {tab}
                    </div>
                ))}
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
            }}>
                {filteredPlexts.length === 0 ? (
                    <div style={{ padding: SPACING.LG, textAlign: 'center', color: UI_COLORS.TEXT_MUTED }}>
                        No messages yet
                    </div>
                ) : (
                    filteredPlexts.map((p) => (
                        <div key={p.id} style={{
                            marginBottom: SPACING.SM,
                            fontSize: '0.85em',
                            lineHeight: '1.4',
                            borderLeft: p.type === 'PLAYER_GENERATED' ? 'none' : `3px solid ${p.type === 'SYSTEM_NARROWCAST' ? theme.AQUA : '#444'}`,
                            paddingLeft: p.type === 'PLAYER_GENERATED' ? '0' : SPACING.SM,
                            borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                            paddingBottom: SPACING.XS,
                            background: p.type === 'SYSTEM_NARROWCAST' ? `${theme.AQUA}08` : 'transparent',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ color: UI_COLORS.TEXT_MUTED, fontSize: '0.8em' }}>
                                    [{formatTime(p.time)}]
                                </span>
                                {p.type && p.type !== 'PLAYER_GENERATED' && (
                                    <span style={{ 
                                        fontSize: '0.75em', 
                                        fontWeight: 'bold',
                                        color: p.type === 'SYSTEM_NARROWCAST' ? theme.AQUA : '#888',
                                        textTransform: 'uppercase'
                                    }}>
                                        {typeof p.type === 'string' ? p.type.replace('SYSTEM_', '') : 'SYSTEM'}
                                    </span>
                                )}
                            </div>
                            <div style={{ opacity: p.type === 'PLAYER_GENERATED' ? 1 : 0.9 }}>
                                {p.markup ? renderMarkup(p.markup) : p.text}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Popup>
    );
}
