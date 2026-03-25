import { h } from 'preact';
import { useEffect, useState, useRef, useMemo } from 'preact/hooks';
import { useStore, normalizeTeam, Plext } from '@iris/core';
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
    const scrollRef = useRef<HTMLDivElement>(null);

    const formatTime = (ms: number) => {
        const date = new Date(ms);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    const formatDateHeader = (ms: number) => {
        const date = new Date(ms);
        return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleRefresh = () => {
        const minTimestampMs = plexts.length > 0 ? plexts[0].time : -1;
        window.postMessage({ type: 'IRIS_PLEXTS_REQUEST', minTimestampMs }, '*');
    };

    useEffect(() => {
        handleRefresh();
    }, []);

    // Scroll to bottom whenever plexts or tab change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [plexts, activeTab]);

    const filteredPlexts = useMemo(() => {
        const filtered = plexts.filter(p => {
            if (activeTab === 'ALL') return p.categories === 1 || p.categories === 2;
            if (activeTab === 'FACTION') return p.categories === 2;
            if (activeTab === 'ALERTS') return p.categories === 4;
            return true;
        });
        return [...filtered].reverse();
    }, [plexts, activeTab]);

    const renderMarkupSegment = (m: any, i: number) => {
        const type = m[0];
        const data = m[1];
        let color = UI_COLORS.TEXT_BASE;
        let text = typeof data === 'string' ? data : (data.plain || data.name || '');

        if (type === 'FACTION') return null;

        if (type === 'TEXT' && typeof text === 'string') {
            if (text === ' agent ' || text === ' agent') return null;
            text = text.replace(/Resistance agent\s/g, '');
            text = text.replace(/Enlightened agent\s/g, '');
        }

        if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
            const teamKey = normalizeTeam(data.team) as 'E' | 'R' | 'M' | 'N';
            color = theme[teamKey] || UI_COLORS.TEXT_BASE;
            if (type === 'AT_PLAYER' && typeof text === 'string' && !text.startsWith('@')) {
                text = '@' + text;
            }
            return <span key={i} className={`iris-comm-markup iris-comm-markup-${type.toLowerCase()}`} style={{ color }}>{String(text || '')}</span>;
        } else if (type === 'PORTAL' || type === 'LINK') {
            const teamKey = normalizeTeam(data.team) as 'E' | 'R' | 'M' | 'N';
            color = type === 'PORTAL' ? theme.AQUA : (theme[teamKey] || theme.AQUA);
            return <span key={i} className={`iris-comm-markup iris-comm-markup-${type.toLowerCase()}`} style={{ color }}>{String(text || '')}</span>;
        } else if (type === 'SECURE') {
            color = '#ffff00';
            return <span key={i} className="iris-comm-markup iris-comm-markup-secure" style={{ color }}>{String(text || '')}</span>;
        }

        return <span key={i} className="iris-comm-markup iris-comm-markup-text" style={{ color }}>{String(text || '')}</span>;
    };

    const renderActionLine = (markup: any[]) => {
        const actionItems: any[] = [];
        const connectors = [/\son\s*$/, /\sat\s*$/, /\sfrom\s*$/, /\sto\s*$/, /\sin\s*$/, /\snear\s*$/];

        for (let i = 0; i < markup.length; i++) {
            const [type, data] = markup[i];
            if (type === 'PORTAL' || type === 'LINK') break;

            if (type === 'TEXT') {
                let text = typeof data === 'string' ? data : data.plain;
                const next = markup[i+1];
                if (next && (next[0] === 'PORTAL' || next[0] === 'LINK')) {
                    for (const reg of connectors) {
                        if (reg.test(text)) {
                            text = text.replace(reg, '');
                            break;
                        }
                    }
                }
                actionItems.push(renderMarkupSegment([type, text], i));
            } else {
                actionItems.push(renderMarkupSegment(markup[i], i));
            }
        }
        return actionItems;
    };

    const renderPlext = (p: Plext) => {
        const markup = p.markup || [];
        const isSystem = p.type !== 'PLAYER_GENERATED';
        const portals = markup.filter(m => m[0] === 'PORTAL');
        const links = markup.filter(m => m[0] === 'LINK');
        const primaryPortal = portals.length > 0 ? portals[portals.length - 1][1] : 
                        (links.length > 0 ? links[0][1] : null);

        return (
            <div key={p.id} className={`iris-comm-message ${isSystem ? 'iris-comm-message-system' : 'iris-comm-message-user'}`} style={{
                marginBottom: SPACING.MD,
                fontSize: '0.85em',
                lineHeight: '1.4',
                borderLeft: isSystem ? `3px solid ${p.categories === 2 ? theme.AQUA : '#444'}` : 'none',
                paddingLeft: isSystem ? SPACING.SM : '0',
                borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                paddingBottom: SPACING.SM,
                background: p.categories === 2 ? `${theme.AQUA}08` : 'transparent',
            }}>
                {/* Line 1: Time + Action */}
                <div className="iris-comm-line iris-comm-action-line" style={{ marginBottom: '2px' }}>
                    <span className="iris-comm-timestamp" style={{ color: UI_COLORS.TEXT_MUTED, fontSize: '0.8em', marginRight: SPACING.XS }}>
                        [{formatTime(p.time)}]
                    </span>
                    <span className="iris-comm-action-content" style={{ opacity: isSystem ? 0.9 : 1 }}>
                        {isSystem ? renderActionLine(markup) : markup.map((m, i) => renderMarkupSegment(m, i))}
                    </span>
                </div>

                {/* System-only lines for Portal Details */}
                {isSystem && primaryPortal && (
                    <div className="iris-comm-portal-details" style={{ paddingLeft: '65px' }}>
                        {/* Line 2: Portal Name */}
                        <div 
                            className="iris-comm-line iris-comm-portal-name"
                            style={{ 
                                color: theme.AQUA, 
                                fontWeight: 'bold', 
                                cursor: 'pointer',
                                fontSize: '0.9em',
                                textDecoration: 'underline'
                            }}
                            onClick={() => {
                                if (primaryPortal.latE6 && primaryPortal.lngE6) {
                                    window.postMessage({
                                        type: 'IRIS_MOVE_MAP',
                                        center: { lat: primaryPortal.latE6 / 1e6, lng: primaryPortal.lngE6 / 1e6 },
                                        zoom: 17
                                    }, '*');
                                }
                            }}
                        >
                            {primaryPortal.name || primaryPortal.plain || 'Unknown Portal'}
                        </div>

                        {/* Line 3: Portal Address */}
                        <div className="iris-comm-line iris-comm-portal-address" style={{ 
                            color: '#888', 
                            fontSize: '0.8em',
                            fontStyle: 'italic'
                        }}>
                            {primaryPortal.address || `${(primaryPortal.latE6 / 1e6).toFixed(6)}, ${(primaryPortal.lngE6 / 1e6).toFixed(6)}`}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const rows: any[] = [];
    let lastDate: string | null = null;

    filteredPlexts.forEach(p => {
        const dateStr = new Date(p.time).toDateString();
        if (dateStr !== lastDate) {
            rows.push(
                <div key={`date-${dateStr}`} className="iris-comm-date-header" style={{
                    textAlign: 'center',
                    margin: `${SPACING.MD} 0`,
                    borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                    lineHeight: '0.1em',
                }}>
                    <span style={{ 
                        background: UI_COLORS.BG_BASE, 
                        padding: `0 ${SPACING.SM}`, 
                        color: theme.AQUA,
                        fontSize: '0.75em',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>
                        {formatDateHeader(p.time)}
                    </span>
                </div>
            );
            lastDate = dateStr;
        }
        rows.push(renderPlext(p));
    });

    return (
        <Popup
            onClose={onClose}
            title="COMM"
            headerExtras={
                <button 
                    className="iris-comm-refresh-btn"
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
                top: '50px',
                right: '10px',
                left: '10px',
                width: 'auto',
                maxWidth: '450px',
                height: 'calc(80vh - 60px)',
                marginLeft: 'auto',
            }}
        >
            <div className="iris-comm-tabs" style={{ display: 'flex', borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`, marginBottom: SPACING.SM }}>
                {['ALL', 'FACTION', 'ALERTS'].map(tab => (
                    <div 
                        key={tab}
                        className={`iris-comm-tab ${activeTab === tab ? 'iris-comm-tab-active' : ''}`}
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

            <div 
                ref={scrollRef}
                className="iris-comm-scroll-container"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '4px'
                }}
            >
                {rows.length === 0 ? (
                    <div className="iris-comm-empty" style={{ padding: SPACING.LG, textAlign: 'center', color: UI_COLORS.TEXT_MUTED }}>
                        No messages yet
                    </div>
                ) : rows}
            </div>
        </Popup>
    );
}
