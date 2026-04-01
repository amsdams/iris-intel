import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { EndpointDiagnostics, EndpointKey, useStore } from '@iris/core';
import { UI_COLORS } from '../../theme';

const ENDPOINT_STALE_AFTER_MS: Partial<Record<EndpointKey, number>> = {
    plexts: 2 * 60 * 1000,
    entities: 2 * 60 * 1000,
    portalDetails: 5 * 60 * 1000,
    missionDetails: 5 * 60 * 1000,
    topMissions: 5 * 60 * 1000,
    artifacts: 5 * 60 * 1000,
    subscription: 5 * 60 * 1000,
    inventory: 5 * 60 * 1000,
    gameScore: 5 * 60 * 1000,
    regionScore: 5 * 60 * 1000,
};

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
    const sessionStatus = useStore((state) => state.sessionStatus);
    const lastSessionError = useStore((state) => state.lastSessionError);
    const endpointDiagnostics = useStore((state) => state.endpointDiagnostics);
    const clearEndpointDiagnostics = useStore((state) => state.clearEndpointDiagnostics);
    
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
        clearEndpointDiagnostics();
        setIsExpanded(false);
    };

    const hasErrors = failedRequests.length > 0 || jsErrors.length > 0;
    const hasSessionIssue = sessionStatus === 'expired' || sessionStatus === 'recovering';

    const sessionLabel = (): string => {
        if (sessionStatus === 'expired') return 'SESSION: EXPIRED';
        if (sessionStatus === 'recovering') return 'SESSION: RECOVERING';
        return 'SESSION: OK';
    };

    const sessionHelpText = (): string | null => {
        if (sessionStatus === 'expired') {
            return 'Intel sign-in required. Sign in on intel.ingress.com, then reload.';
        }
        if (sessionStatus === 'recovering') {
            return 'Intel session is recovering after login.';
        }
        return null;
    };

    const endpointEntries = Object.values(endpointDiagnostics).filter((entry) => entry.key !== 'unknown');

    const getDerivedEndpointStatus = (entry: EndpointDiagnostics): 'idle' | 'in_flight' | 'success' | 'error' | 'stale' => {
        if (entry.status === 'success' && entry.lastSuccessAt) {
            const staleAfter = ENDPOINT_STALE_AFTER_MS[entry.key];
            if (staleAfter && Date.now() - entry.lastSuccessAt > staleAfter) {
                return 'stale';
            }
        }
        return entry.status;
    };

    const endpointHealthCounts = endpointEntries.reduce((acc, entry) => {
        const status = getDerivedEndpointStatus(entry);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
    }, {} as Record<'idle' | 'in_flight' | 'success' | 'error' | 'stale', number>);

    const endpointStatusColor = (status: 'idle' | 'in_flight' | 'success' | 'error' | 'stale'): string => {
        switch (status) {
            case 'in_flight':
                return UI_COLORS.AQUA;
            case 'success':
                return UI_COLORS.SUCCESS;
            case 'error':
                return UI_COLORS.ERROR;
            case 'stale':
                return UI_COLORS.WARNING;
            default:
                return UI_COLORS.TEXT_MUTED;
        }
    };

    return (
        <div 
            onClick={toggleExpanded}
            className={`iris-status-bar ${isExpanded ? 'iris-status-bar-expanded' : 'iris-status-bar-collapsed'}`}
        >
            {isExpanded && (
                <div className="iris-status-expanded-content">
                    <div className="iris-status-header">
                        <span className="iris-status-summary">
                            LOGS: {successfulRequests.length} OK, {failedRequests.length} NET, {jsErrors.length} JS
                        </span>
                        <span 
                            className="iris-status-clear-btn"
                            onClick={handleClear}
                        >
                            CLEAR ALL
                        </span>
                    </div>

                    {hasSessionIssue && lastSessionError && (
                        <div className="iris-status-section iris-status-section-session">
                            <div className="iris-status-section-title">SESSION</div>
                            <div className="iris-status-log-entry iris-status-log-entry-error">
                                <div className="iris-status-log-message iris-status-log-message-network" style={{ color: UI_COLORS.WARNING }}>
                                    <span>[{new Date(lastSessionError.time).toLocaleTimeString()}] {sessionLabel()}</span>
                                    <span>STATUS: {lastSessionError.status}</span>
                                </div>
                                <div className="iris-status-log-url">
                                    {lastSessionError.statusText} - {lastSessionError.url}
                                </div>
                                {sessionHelpText() && (
                                    <div className="iris-status-log-url">
                                        {sessionHelpText()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {jsErrors.length > 0 && (
                        <div className="iris-status-section iris-status-section-js-errors">
                            <div className="iris-status-section-title">JS ERRORS</div>
                            {jsErrors.map((err) => (
                                <div key={`js-${err.time}-${err.message}`} className="iris-status-log-entry iris-status-log-entry-error">
                                    <div className="iris-status-log-message" style={{ color: UI_COLORS.WARNING }}>
                                        [{new Date(err.time).toLocaleTimeString()}] {err.message}
                                    </div>
                                    <div className="iris-status-log-source">
                                        {err.source ? `${err.source}:${err.lineno}:${err.colno}` : 'Unknown source'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {failedRequests.length > 0 && (
                        <div className="iris-status-section iris-status-section-net-errors">
                            <div className="iris-status-section-title">NETWORK ERRORS</div>
                            {failedRequests.map((req) => (
                                <div key={`net-err-${req.time}-${req.url}`} className="iris-status-log-entry iris-status-log-entry-error">
                                    <div className="iris-status-log-message iris-status-log-message-network" style={{ color: UI_COLORS.ERROR }}>
                                        <span>[{new Date(req.time).toLocaleTimeString()}] {getEndpointName(req.url)}</span>
                                        <span>STATUS: {req.status}</span>
                                    </div>
                                    <div className="iris-status-log-url">
                                        {req.statusText} - {req.url}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {successfulRequests.length > 0 && (
                        <div className="iris-status-section iris-status-section-success">
                            <div className="iris-status-section-title">SUCCESSFUL REQUESTS</div>
                            {successfulRequests.map((req) => (
                                <div key={`net-ok-${req.time}-${req.url}`} className="iris-status-log-entry iris-status-log-entry-ok">
                                    <div className="iris-status-log-message" style={{ color: UI_COLORS.AQUA }}>
                                        [{new Date(req.time).toLocaleTimeString()}] {getEndpointName(req.url)}
                                    </div>
                                    <div className="iris-status-log-url">
                                        OK - {req.url}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="iris-status-section iris-status-section-endpoints">
                        <div className="iris-status-section-title">ENDPOINT HEALTH</div>
                        {endpointEntries.map((entry) => {
                            const derivedStatus = getDerivedEndpointStatus(entry);
                            return (
                                <div key={`endpoint-${entry.key}`} className="iris-status-log-entry">
                                    <div className="iris-status-log-message iris-status-log-message-network" style={{ color: endpointStatusColor(derivedStatus) }}>
                                        <span>{entry.key}</span>
                                        <span>{derivedStatus.toUpperCase()}</span>
                                    </div>
                                    <div className="iris-status-log-url">
                                        last request: {entry.lastRequestAt ? new Date(entry.lastRequestAt).toLocaleTimeString() : 'never'}
                                        {entry.lastSuccessAt ? ` | last success: ${new Date(entry.lastSuccessAt).toLocaleTimeString()}` : ''}
                                        {entry.lastErrorStatus !== null ? ` | last error: ${entry.lastErrorStatus}` : ''}
                                    </div>
                                    {entry.lastUrl && (
                                        <div className="iris-status-log-url">
                                            {entry.lastUrl}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {!hasErrors && successfulRequests.length === 0 && (
                        <div className="iris-status-empty">No requests recorded</div>
                    )}
                </div>
            )}

            <div className="iris-status-main-bar">
                <div className="iris-status-indicator-group">
                    <div className="iris-status-led" style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: activeRequests > 0 ? UI_COLORS.AQUA : (hasErrors ? UI_COLORS.ERROR : (successfulRequests.length > 0 ? UI_COLORS.SUCCESS : '#333')),
                        boxShadow: activeRequests > 0 ? `0 0 5px ${UI_COLORS.AQUA}` : (hasErrors ? `0 0 5px ${UI_COLORS.ERROR}` : (successfulRequests.length > 0 ? `0 0 5px ${UI_COLORS.SUCCESS}` : 'none')),
                        transition: 'background 0.3s ease, box-shadow 0.3s ease'
                    }} />
                    <span className="iris-status-text" style={{ color: activeRequests > 0 ? UI_COLORS.TEXT_BASE : (hasErrors ? UI_COLORS.ERROR : UI_COLORS.TEXT_MUTED) }}>
                        {activeRequests > 0 ? `NET: ${activeRequests} ACTIVE` : 'NET: IDLE'}
                        {successfulRequests.length > 0 && ` (${successfulRequests.length} OK)`}
                        {failedRequests.length > 0 && ` (${failedRequests.length} NET)`}
                        {jsErrors.length > 0 && ` (${jsErrors.length} JS)`}
                    </span>
                    <span className="iris-status-text" style={{ color: endpointHealthCounts.error ? UI_COLORS.ERROR : (endpointHealthCounts.stale ? UI_COLORS.WARNING : UI_COLORS.TEXT_MUTED) }}>
                        ENDPOINTS:
                        {endpointHealthCounts.in_flight ? ` ${endpointHealthCounts.in_flight} ACTIVE` : ''}
                        {endpointHealthCounts.error ? ` ${endpointHealthCounts.error} ERR` : ''}
                        {endpointHealthCounts.stale ? ` ${endpointHealthCounts.stale} STALE` : ''}
                    </span>
                    <span className="iris-status-text" style={{ color: sessionStatus === 'expired' ? UI_COLORS.WARNING : (sessionStatus === 'recovering' ? UI_COLORS.AQUA : UI_COLORS.TEXT_MUTED) }}>
                        {sessionLabel()}
                    </span>
                    {hasSubscription && (
                        <span className="iris-status-core">
                            [C.O.R.E.]
                        </span>
                    )}
                    {activeRequests > 0 && lastRequestUrl && (
                        <span className="iris-status-current-endpoint">
                            FETCHING {getEndpointName(lastRequestUrl)}...
                        </span>
                    )}
                </div>

                <div className="iris-status-progress-bg">
                    {activeRequests > 0 && (
                        <div className="iris-status-progress-bar" style={{
                            background: UI_COLORS.AQUA,
                            boxShadow: `0 0 5px ${UI_COLORS.AQUA}`,
                        }} />
                    )}
                </div>
            </div>
        </div>
    );
}
