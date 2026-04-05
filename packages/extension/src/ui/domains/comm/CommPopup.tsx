import { h, JSX } from 'preact';
import { useEffect, useState, useRef, useMemo, useCallback } from 'preact/hooks';
import { useStore, normalizeTeam, Plext } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';
import './comm.css';

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
    const commSendStatus = useStore((state) => state.commSendStatus);
    const commSendError = useStore((state) => state.commSendError);
    const clearCommSendState = useStore((state) => state.clearCommSendState);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const scrollRef = useRef<HTMLDivElement>(null);
    const suppressNextScrollFetch = useRef(false);
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState('');
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
        const currentPlexts = useStore.getState().plexts;
        const minTimestampMs = currentPlexts.length > 0 ? currentPlexts[currentPlexts.length - 1].time : -1;
        window.postMessage({ 
            type: 'IRIS_PLEXTS_REQUEST', 
            minTimestampMs,
            tab: activeTab.toLowerCase(),
        }, '*');
    }, [activeTab]);

    const handleScroll = (): void => {
        const el = scrollRef.current;
        if (!el || loading) return;
        if (suppressNextScrollFetch.current) {
            suppressNextScrollFetch.current = false;
            return;
        }

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
                tab: activeTab.toLowerCase(),
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

    useEffect(() => {
        if (commSendStatus === 'success') {
            setDraft('');
            clearCommSendState();
        }
    }, [clearCommSendState, commSendStatus]);

    const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

    // Scroll to bottom whenever plexts or tab change
    // but only if already near the bottom (match original Intel behavior)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const isAtBottom = el.scrollTop + el.offsetHeight >= el.scrollHeight - 20;
        
        // Always scroll on initial load or tab switch
        if (!hasInitialScrolled || isAtBottom) {
            suppressNextScrollFetch.current = true;
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
        let color = '';
        let text = typeof data === 'string' ? data : (data.plain || data.name || '');

        if (type === 'FACTION') return null;

        if (type === 'TEXT') {
            return <span key={i} className="iris-comm-markup iris-comm-markup-text">{String(text || '')}</span>;
        }

        if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
            const teamKey = normalizeTeam(typeof data === 'object' ? data.team : undefined) as 'E' | 'R' | 'M' | 'N';
            color = theme[teamKey] || '';
            if (type === 'AT_PLAYER' && !text.startsWith('@')) {
                text = '@' + text;
            }
            return (
                <span
                    key={i}
                    className={`iris-comm-markup iris-comm-markup-${type.toLowerCase()}`}
                    style={{['--iris-comm-color' as any]: color}}
                >
                    {String(text || '')}
                </span>
            );
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
                        style={{['--iris-comm-color' as any]: color}}
                        onClick={handlePortalClick}
                    >
                        {String(portalName)}
                    </span>
                    {portalAddress && portalAddress !== portalName && (
                        <span className="iris-comm-portal-address"> ({portalAddress})</span>
                    )}
                </span>
            );
        } else if (type === 'SECURE') {
            return <span key={i} className="iris-comm-markup iris-comm-markup-secure">{String(text || '')}</span>;
        }

        return <span key={i} className="iris-comm-markup iris-comm-markup-unknown">{String(text || '')}</span>;
    };

    const renderPlext = (p: Plext): JSX.Element => {
        const markup = (p.markup as MarkupSegment[]) || [];
        const isSystem = p.type !== 'PLAYER_GENERATED';
        
        return (
            <div key={p.id} className={`iris-comm-message ${isSystem ? 'iris-comm-message-system' : 'iris-comm-message-user'}`}>
                <span className="iris-comm-timestamp">
                    [{formatTime(p.time)}]
                </span>
                <span className="iris-comm-content">
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
                <div key={`date-${dateStr}`} className="iris-comm-date-header">
                    <span>
                        {formatDateHeader(p.time)}
                    </span>
                </div>
            );
            lastDate = dateStr;
        }
        rows.push(renderPlext(p));
    });

    const canSend = activeTab !== 'ALERTS' && draft.trim().length > 0 && commSendStatus !== 'sending';

    const handleSend = (): void => {
        if (!canSend) return;
        window.postMessage({
            type: 'IRIS_COMM_SEND_REQUEST',
            text: draft.trim(),
            tab: activeTab.toLowerCase(),
        }, '*');
    };

    return (
        <Popup
            onClose={onClose}
            title="COMM"
            noScroll={true}
            className="iris-popup-center iris-popup-medium"
             style={{
                ['--iris-popup-border' as any]: theme.AQUA,
                ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
                ['--iris-popup-title-color' as any]: theme.AQUA,
            }}
            headerExtras={
                <button 
                    className="iris-comm-refresh-btn"
                    onClick={handleRefresh}
                >
                    REFRESH
                </button>
            }
        >
            <div className="iris-comm-tabs">
                {['ALL', 'FACTION', 'ALERTS'].map(tab => (
                    <div 
                        key={tab}
                        className={`iris-comm-tab ${activeTab === tab ? 'iris-comm-tab-active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </div>
                ))}
            </div>

            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="iris-comm-scroll-container"
            >
                {loading && (
                    <div className="iris-comm-loading">
                        FETCHING HISTORY...
                    </div>
                )}
                {rows.length === 0 ? (
                    <div className="iris-comm-empty">
                        No messages yet
                    </div>
                ) : rows}
            </div>

            <div className="iris-comm-send">
                {commSendError && (
                    <div className="iris-comm-send-error">
                        {commSendError}
                    </div>
                )}
                {activeTab === 'ALERTS' ? (
                    <div className="iris-comm-send-disabled">
                        ALERTS is read-only.
                    </div>
                ) : (
                    <div className="iris-comm-send-row">
                        <input
                            type="text"
                            value={draft}
                            className="iris-comm-send-input"
                            placeholder={`Send to ${activeTab.toLowerCase()}...`}
                            onInput={(e) => {
                                if (commSendError) clearCommSendState();
                                setDraft((e.target as HTMLInputElement).value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="iris-comm-send-button"
                            onClick={handleSend}
                            disabled={!canSend}
                        >
                            {commSendStatus === 'sending' ? '...' : 'SEND'}
                        </button>
                    </div>
                )}
            </div>
        </Popup>
    );
}
