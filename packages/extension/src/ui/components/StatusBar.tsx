import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { UI_COLORS, SPACING } from '../theme';

export function StatusBar(): JSX.Element {
    const activeRequests = useStore((state) => state.activeRequests);
    const lastRequestUrl = useStore((state) => state.lastRequestUrl);
    const failedRequests = useStore((state) => state.failedRequests);
    const clearFailedRequests = useStore((state) => state.clearFailedRequests);
    const successfulRequests = useStore((state) => state.successfulRequests);
    const clearSuccessfulRequests = useStore((state) => state.clearSuccessfulRequests);
    const jsErrors = useStore((state) => state.jsErrors);
    const clearJSErrors = useStore((state) => state.clearJSErrors);
    const hasSubscription = useStore((state) => state.hasSubscription);
    
    const [isExpanded, setIsExpanded] = useState(false);

    // Extract endpoint name from URL for cleaner display
    const getEndpointName = (url: string): string => {
        if (url.includes('getEntities')) return 'getEntities';
        if (url.includes('getPortalDetails')) return 'getPortalDetails';
        if (url.includes('getPlexts')) return 'getPlexts';
        return url.split('/').pop() || 'Request';
    };

    const toggleExpanded = (e: MouseEvent): void => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleClear = (e: MouseEvent): void => {
        e.stopPropagation();
        clearFailedRequests();
        clearJSErrors();
        clearSuccessfulRequests();
        setIsExpanded(false);
    };

    const hasErrors = failedRequests.length > 0 || jsErrors.length > 0;

    return (
        <div 
            onClick={toggleExpanded}
            className={`iris-status-bar ${isExpanded ? 'iris-status-bar-expanded' : 'iris-status-bar-collapsed'}`}
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                borderTop: `1px solid ${UI_COLORS.BORDER_DIM}`,
                display: 'flex',
                flexDirection: 'column',
                fontSize: '10px',
                color: UI_COLORS.TEXT_MUTED,
                fontFamily: 'monospace',
                zIndex: 10001,
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transition: 'max-height 0.3s ease-in-out',
                maxHeight: isExpanded ? '400px' : '24px',
            }}
        >
            {/* Expanded List */}
            {isExpanded && (
                <div className="iris-status-expanded-content" style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: SPACING.SM,
                    borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                    background: 'rgba(0, 10, 20, 0.4)'
                }}>
                    <div className="iris-status-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.SM, borderBottom: '1px solid #444', paddingBottom: '4px' }}>
                        <span className="iris-status-summary" style={{ color: UI_COLORS.ERROR, fontWeight: 'bold' }}>
                            LOGS: {successfulRequests.length} OK, {failedRequests.length} NET, {jsErrors.length} JS
                        </span>
                        <span 
                            className="iris-status-clear-btn"
                            onClick={handleClear}
                            style={{ color: UI_COLORS.AQUA, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            CLEAR ALL
                        </span>
                    </div>
                    
                    {/* JS Errors Section */}
                    {jsErrors.length > 0 && (
                        <div className="iris-status-section iris-status-section-js-errors" style={{ marginBottom: SPACING.MD }}>
                            <div className="iris-status-section-title" style={{ color: UI_COLORS.WARNING, marginBottom: '4px', borderBottom: '1px solid #440000' }}>JS ERRORS</div>
                            {jsErrors.map((err, i) => (
                                <div key={`js-${i}`} className="iris-status-log-entry iris-status-log-entry-error" style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                                    <div className="iris-status-log-message" style={{ color: UI_COLORS.WARNING }}>
                                        [{new Date(err.time).toLocaleTimeString()}] {err.message}
                                    </div>
                                    <div className="iris-status-log-source" style={{ color: '#888', fontSize: '9px' }}>
                                        {err.source ? `${err.source}:${err.lineno}:${err.colno}` : 'Unknown source'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Net Errors Section */}
                    {failedRequests.length > 0 && (
                        <div className="iris-status-section iris-status-section-net-errors" style={{ marginBottom: SPACING.MD }}>
                            <div className="iris-status-section-title" style={{ color: UI_COLORS.ERROR, marginBottom: '4px', borderBottom: '1px solid #440000' }}>NETWORK ERRORS</div>
                            {failedRequests.map((req, i) => (
                                <div key={`net-err-${i}`} className="iris-status-log-entry iris-status-log-entry-error" style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                                    <div className="iris-status-log-message" style={{ color: UI_COLORS.ERROR, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>[{new Date(req.time).toLocaleTimeString()}] {getEndpointName(req.url)}</span>
                                        <span>STATUS: {req.status}</span>
                                    </div>
                                    <div className="iris-status-log-url" style={{ color: '#888', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {req.statusText} — {req.url}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Successful Requests Section */}
                    {successfulRequests.length > 0 && (
                        <div className="iris-status-section iris-status-section-success">
                            <div className="iris-status-section-title" style={{ color: UI_COLORS.AQUA, marginBottom: '4px', borderBottom: '1px solid #004444' }}>SUCCESSFUL REQUESTS</div>
                            {successfulRequests.map((req, i) => (
                                <div key={`net-ok-${i}`} className="iris-status-log-entry iris-status-log-entry-ok" style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                                    <div className="iris-status-log-message" style={{ color: UI_COLORS.AQUA }}>
                                        [{new Date(req.time).toLocaleTimeString()}] {getEndpointName(req.url)}
                                    </div>
                                    <div className="iris-status-log-url" style={{ color: '#888', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        OK — {req.url}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!hasErrors && successfulRequests.length === 0 && (
                        <div className="iris-status-empty" style={{ padding: SPACING.MD, textAlign: 'center', color: '#666' }}>No requests recorded</div>
                    )}
                </div>
            )}

            {/* Main Bar */}
            <div className="iris-status-main-bar" style={{
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${SPACING.MD}`,
            }}>
                <div className="iris-status-indicator-group" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div className="iris-status-led" style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: activeRequests > 0 ? UI_COLORS.AQUA : (hasErrors ? UI_COLORS.ERROR : (successfulRequests.length > 0 ? UI_COLORS.SUCCESS : '#333')),
                        marginRight: SPACING.SM,
                        boxShadow: activeRequests > 0 ? `0 0 5px ${UI_COLORS.AQUA}` : (hasErrors ? `0 0 5px ${UI_COLORS.ERROR}` : (successfulRequests.length > 0 ? `0 0 5px ${UI_COLORS.SUCCESS}` : 'none')),
                        transition: 'background 0.3s ease, box-shadow 0.3s ease'
                    }} />
                    <span className="iris-status-text" style={{ color: activeRequests > 0 ? UI_COLORS.TEXT_BASE : (hasErrors ? UI_COLORS.ERROR : UI_COLORS.TEXT_MUTED) }}>
                        {activeRequests > 0 ? `NET: ${activeRequests} ACTIVE` : 'NET: IDLE'}
                        {successfulRequests.length > 0 && ` (${successfulRequests.length} OK)`}
                        {failedRequests.length > 0 && ` (${failedRequests.length} NET)`}
                        {jsErrors.length > 0 && ` (${jsErrors.length} JS)`}
                    </span>
                    {hasSubscription && (
                        <span style={{ marginLeft: SPACING.MD, color: '#b000ff', fontWeight: 'bold', fontSize: '9px' }}>
                            [C.O.R.E.]
                        </span>
                    )}
                    {activeRequests > 0 && lastRequestUrl && (
                        <span className="iris-status-current-endpoint" style={{ marginLeft: SPACING.MD, opacity: 0.8 }}>
                            FETCHING {getEndpointName(lastRequestUrl)}...
                        </span>
                    )}
                </div>

                {/* Simple Progress Bar */}
                <div className="iris-status-progress-bg" style={{ 
                    width: '100px', 
                    height: '2px', 
                    background: '#222', 
                    borderRadius: '1px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {activeRequests > 0 && (
                        <div className="iris-status-progress-bar" style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '50%',
                            background: UI_COLORS.AQUA,
                            boxShadow: `0 0 5px ${UI_COLORS.AQUA}`,
                            animation: 'iris-progress 1.5s infinite linear'
                        }} />
                    )}
                </div>
            </div>

            <style>{`
                @keyframes iris-progress {
                    0% { left: -50%; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
    );
}
