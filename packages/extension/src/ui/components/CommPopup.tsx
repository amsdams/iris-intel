import { h, JSX } from 'preact';
import { useEffect, useState, useRef, useMemo, useCallback } from 'preact/hooks';
import { useStore, normalizeTeam, Plext } from '@iris/core';
import { Popup } from './Popup';
import { THEMES, UI_COLORS, SPACING } from '../theme';

interface CommPopupProps {
    onClose: () => void;
}

interface MarkupData {
    team?: string;
    plain?: string;
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
}

type MarkupSegment = [string, string | MarkupData];

export function CommPopup({ onClose }: CommPopupProps): JSX.Element {
    const plexts = useStore((state) => state.plexts);
    const themeId = useStore((state) => state.themeId);
    const activeTab = useStore((state) => state.activeCommTab);
    const setActiveTab = useStore((state) => state.setActiveCommTab);
    const theme = THEMES[themeId] || THEMES.DEFAULT;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const lastRequestTime = useRef(0);

    const formatTime = (ms: number): string => {
        const date = new Date(ms);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    const formatDateHeader = (ms: number): string => {
        const date = new Date(ms);
        return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleRefresh = useCallback((): void => {
        const minTimestampMs = plexts.length > 0 ? plexts[plexts.length - 1].time : -1;
        window.postMessage({ 
            type: 'IRIS_PLEXTS_REQUEST', 
            minTimestampMs,
            tab: activeTab.toLowerCase()
        }, '*');
    }, [activeTab, plexts]);

    const handleScroll = (): void => {
        const el = scrollRef.current;
        if (!el || loading) return;

        const now = Date.now();
        if (now - lastRequestTime.current < 1000) return;

        if (el.scrollTop === 0 && filteredPlexts.length > 0) {
            // At top -> Fetch older
            setLoading(true);
            lastRequestTime.current = now;
            const oldestTime = filteredPlexts[0].time;
            window.postMessage({ 
                type: 'IRIS_PLEXTS_REQUEST', 
                maxTimestampMs: oldestTime,
                ascendingTimestampOrder: false,
                tab: activeTab.toLowerCase()
            }, '*');
            
            // Reset loading state after a delay
            setTimeout(() => setLoading(false), 2000);
        } else if (el.scrollTop + el.offsetHeight >= el.scrollHeight - 20) {
            // At bottom -> Fetch newer
            handleRefresh();
        }
    };

    useEffect(() => {
        handleRefresh();
    }, [handleRefresh]);

    const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

    // Scroll to bottom whenever plexts or tab change
    // but only if already near the bottom (match original Intel behavior)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const isAtBottom = el.scrollTop + el.offsetHeight >= el.scrollHeight - 20;
        
        // Always scroll on initial load or tab switch
        if (!hasInitialScrolled || isAtBottom) {
            el.scrollTop = el.scrollHeight;
            if (!hasInitialScrolled) setHasInitialScrolled(true);
        }
    }, [plexts, activeTab, hasInitialScrolled]);

    // Reset initial scroll flag when tab changes to force a scroll-to-bottom
    useEffect(() => {
        setHasInitialScrolled(false);
    }, [activeTab]);

    const filteredPlexts = useMemo(() => {
        const filtered = plexts.filter(p => {
            if (activeTab === 'ALL') return p.categories === 1 || p.categories === 2;
            if (activeTab === 'FACTION') return p.categories === 2;
            if (activeTab === 'ALERTS') return p.categories === 4;
            return true;
        });
        return [...filtered].reverse();
    }, [plexts, activeTab]);

    const renderMarkupSegment = (m: MarkupSegment, i: number): JSX.Element | null => {
        const type = m[0];
        const data = m[1];
        let color = UI_COLORS.TEXT_BASE;
        let text = typeof data === 'string' ? data : (data.plain || data.name || '');

        if (type === 'FACTION') return null;

        if (type === 'TEXT') {
            return <span key={i} className="iris-comm-markup iris-comm-markup-text" style={{ color }}>{String(text || '')}</span>;
        }

        if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
            const teamKey = normalizeTeam(typeof data === 'object' ? data.team : undefined) as 'E' | 'R' | 'M' | 'N';
            color = theme[teamKey] || UI_COLORS.TEXT_BASE;
            if (type === 'AT_PLAYER' && !text.startsWith('@')) {
                text = '@' + text;
            }
            return <span key={i} className={`iris-comm-markup iris-comm-markup-${type.toLowerCase()}`} style={{ color, fontWeight: 'bold' }}>{String(text || '')}</span>;
        } else if (type === 'PORTAL' || type === 'LINK') {
            const teamKey = normalizeTeam(typeof data === 'object' ? data.team : undefined) as 'E' | 'R' | 'M' | 'N';
            color = type === 'PORTAL' ? theme.AQUA : (theme[teamKey] || theme.AQUA);
            
            // Original Intel uses .name for the link and .address for the brackets
            // .plain often contains both, which causes duplication if we use it.
            const portalName = (typeof data === 'object' ? data.name : '') || (typeof data === 'object' ? data.plain : '') || '';
            const portalAddress = typeof data === 'object' ? data.address : '';

            const handlePortalClick = (): void => {
                if (typeof data === 'object' && typeof data.latE6 === 'number' && typeof data.lngE6 === 'number') {
                    window.postMessage({
                        type: 'IRIS_MOVE_MAP',
                        center: { lat: data.latE6 / 1e6, lng: data.lngE6 / 1e6 },
                        zoom: 17
                    }, '*');
                }
            };

            return (
                <span key={i} className="iris-comm-markup-container">
                    <span 
                        className={`iris-comm-markup iris-comm-markup-${type.toLowerCase()}`} 
                        style={{ color, cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={handlePortalClick}
                    >
                        {String(portalName)}
                    </span>
                    {portalAddress && portalAddress !== portalName && (
                        <span className="iris-comm-portal-address" style={{ color: UI_COLORS.TEXT_MUTED, fontSize: '0.9em' }}> ({portalAddress})</span>
                    )}
                </span>
            );
        } else if (type === 'SECURE') {
            color = '#ffff00';
            return <span key={i} className="iris-comm-markup iris-comm-markup-secure" style={{ color }}>{String(text || '')}</span>;
        }

        return <span key={i} className="iris-comm-markup iris-comm-markup-unknown" style={{ color }}>{String(text || '')}</span>;
    };

    const renderPlext = (p: Plext): JSX.Element => {
        const markup = (p.markup as MarkupSegment[]) || [];
        const isSystem = p.type !== 'PLAYER_GENERATED';
        
        return (
            <div key={p.id} className={`iris-comm-message ${isSystem ? 'iris-comm-message-system' : 'iris-comm-message-user'}`} style={{
                marginBottom: '4px',
                fontSize: '0.85em',
                lineHeight: '1.4',
                padding: '2px 0',
                borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
            }}>
                <span className="iris-comm-timestamp" style={{ color: UI_COLORS.TEXT_MUTED, fontSize: '0.8em', marginRight: SPACING.XS }}>
                    [{formatTime(p.time)}]
                </span>
                <span className="iris-comm-content" style={{ wordBreak: 'break-word' }}>
                    {markup.map((m, i) => renderMarkupSegment(m, i))}
                </span>
            </div>
        );
    };

    const rows: JSX.Element[] = [];
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
            noScroll={true}
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
                onScroll={handleScroll}
                className="iris-comm-scroll-container"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '4px'
                }}
            >
                {loading && (
                    <div style={{ textAlign: 'center', fontSize: '0.7em', color: UI_COLORS.AQUA, padding: '5px' }}>
                        FETCHING HISTORY...
                    </div>
                )}
                {rows.length === 0 ? (
                    <div className="iris-comm-empty" style={{ padding: SPACING.LG, textAlign: 'center', color: UI_COLORS.TEXT_MUTED }}>
                        No messages yet
                    </div>
                ) : rows}
            </div>
        </Popup>
    );
}
