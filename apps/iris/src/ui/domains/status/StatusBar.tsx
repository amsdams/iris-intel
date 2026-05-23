import { h, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { EndpointDiagnostics, EndpointKey, formatEndpointCountdown, getDerivedEndpointStatus, sortEndpointDiagnostics, useStore } from '@iris/core';
import { useRenderDiagnostics } from '../../shared/useRenderDiagnostics';

const ENDPOINT_STALE_AFTER_MS: Partial<Record<EndpointKey, number>> = {
    plexts: 2 * 60 * 1000,
    entities: 5 * 60 * 1000, // 5m warning threshold
    portalDetails: 5 * 60 * 1000,
    missionDetails: 5 * 60 * 1000,
    topMissions: 5 * 60 * 1000,
    sendPlext: 2 * 60 * 1000,
    redeemReward: 2 * 60 * 1000,
    artifacts: 5 * 60 * 1000,
    subscription: 5 * 60 * 1000,
    inventory: 5 * 60 * 1000,
    gameScore: 5 * 60 * 1000,
    regionScore: 5 * 60 * 1000,
};

const POLLED_ENDPOINT_LABELS: Partial<Record<EndpointKey, string>> = {
    plexts: 'next auto refresh',
    entities: 'next refresh',
    artifacts: 'next auto refresh',
};

const ENDPOINT_REFRESH_MODE_LABELS: Partial<Record<EndpointKey, string>> = {
    entities: 'refresh: startup + move settle + idle',
};

const ENDPOINT_FALLBACK_ORDER: EndpointKey[] = [
    'entities',
    'portalDetails',
    'plexts',
    'missionDetails',
    'topMissions',
    'sendPlext',
    'redeemReward',
    'artifacts',
    'subscription',
    'inventory',
    'gameScore',
    'regionScore',
];

const STATUS_FAST_TICK_MS = 1000;
const STATUS_SLOW_TICK_MS = 60 * 1000;

export function StatusBar(): JSX.Element {
    useRenderDiagnostics('StatusBar');

    const activeRequests = useStore((state) => state.activeRequests);
    const lastRequestUrl = useStore((state) => state.lastRequestUrl);
    const failedRequests = useStore((state) => state.failedRequests);
    const clearFailedRequests = useStore((state) => state.clearFailedRequests);
    const successfulRequests = useStore((state) => state.successfulRequests);
    const clearSuccessfulRequests = useStore((state) => state.clearSuccessfulRequests);
    const jsErrors = useStore((state) => state.jsErrors);
    const clearJSErrors = useStore((state) => state.clearJSErrors);
    const interactionLogs = useStore((state) => state.interactionLogs);
    const clearInteractionLogs = useStore((state) => state.clearInteractionLogs);
    const hasSubscription = useStore((state) => state.hasSubscription);
    const sessionStatus = useStore((state) => state.sessionStatus);
    const lastSessionError = useStore((state) => state.lastSessionError);
    const endpointDiagnostics = useStore((state) => state.endpointDiagnostics);
    const clearEndpointDiagnostics = useStore((state) => state.clearEndpointDiagnostics);
    const [isExpanded, setIsExpanded] = useState(false);
    const [, setNow] = useState(() => Date.now());

    // Extract endpoint name from URL for cleaner display
    const getEndpointName = (url: string): string => {
        if (url.includes('getEntities')) return 'getEntities';
        if (url.includes('getPortalDetails')) return 'getPortalDetails';
        if (url.includes('getPlexts')) return 'getPlexts';
        if (url.includes('sendPlext')) return 'sendPlext';
        if (url.includes('redeemReward')) return 'redeemReward';
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
        clearInteractionLogs();
        clearEndpointDiagnostics();
        setIsExpanded(false);
    };

    const hasErrors = failedRequests.length > 0 || jsErrors.length > 0;
    const hasSessionIssue = sessionStatus === 'initial_login_required' || sessionStatus === 'expired' || sessionStatus === 'recovering';

    const sessionLabel = (): string => {
        if (sessionStatus === 'initial_login_required') return 'SESSION: SIGN-IN REQUIRED';
        if (sessionStatus === 'expired') return 'SESSION: EXPIRED';
        if (sessionStatus === 'recovering') return 'SESSION: RECOVERING';
        return 'SESSION: OK';
    };

    const sessionHelpText = (): string | null => {
        if (sessionStatus === 'initial_login_required') {
            return 'Intel is showing its logged-out landing page. Sign in on intel.ingress.com to continue.';
        }
        if (sessionStatus === 'expired') {
            return 'Intel sign-in required. Sign in on intel.ingress.com, then reload.';
        }
        if (sessionStatus === 'recovering') {
            return 'Intel session is recovering after login.';
        }
        return null;
    };

    const endpointEntries = Object.values(endpointDiagnostics).filter((entry) => entry.key !== 'unknown');

    useEffect(() => {
        const intervalMs = isExpanded || activeRequests > 0
            ? STATUS_FAST_TICK_MS
            : STATUS_SLOW_TICK_MS;
        const interval = window.setInterval(() => setNow(Date.now()), intervalMs);

        return (): void => window.clearInterval(interval);
    }, [activeRequests, isExpanded]);

    const endpointHealthCounts = endpointEntries.reduce((acc, entry) => {
        const status = getDerivedEndpointStatus(entry, ENDPOINT_STALE_AFTER_MS);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
    }, {} as Record<'idle' | 'in_flight' | 'success' | 'error' | 'stale', number>);

    const formatCountdown = (entry: EndpointDiagnostics): string | null => {
        return formatEndpointCountdown(entry, POLLED_ENDPOINT_LABELS);
    };

    const sortedEndpointEntries = sortEndpointDiagnostics(endpointEntries, ENDPOINT_REFRESH_MODE_LABELS, ENDPOINT_FALLBACK_ORDER);

    const lastEntitiesSuccessAt = endpointDiagnostics['entities']?.lastSuccessAt;
    const entitiesAgeMinutes = lastEntitiesSuccessAt ? Math.floor((Date.now() - lastEntitiesSuccessAt) / 60000) : null;
    const isEntitiesStale = entitiesAgeMinutes !== null && entitiesAgeMinutes >= ((ENDPOINT_STALE_AFTER_MS['entities'] ?? 300000) / 60000);
    const endpointStatusClass = (status: 'idle' | 'in_flight' | 'success' | 'error' | 'stale'): string => (
        `iris-status-endpoint-${status.replace('_', '-')}`
    );
    const networkTextClass = activeRequests > 0
        ? 'iris-status-text-primary'
        : (hasErrors ? 'iris-status-text-error' : 'iris-status-text-muted');
    const endpointTextClass = endpointHealthCounts.error
        ? 'iris-status-text-error'
        : (endpointHealthCounts.stale ? 'iris-status-text-warning' : 'iris-status-text-muted');
    const mapDataTextClass = isEntitiesStale
        ? 'iris-status-text-warning iris-status-text-bold'
        : 'iris-status-text-muted';
    const sessionTextClass = sessionStatus === 'expired' || sessionStatus === 'initial_login_required'
        ? 'iris-status-text-warning'
        : (sessionStatus === 'recovering' ? 'iris-status-text-accent' : 'iris-status-text-muted');
    const ledStatusClass = activeRequests > 0
        ? 'iris-status-led-active'
        : (hasErrors ? 'iris-status-led-error' : (successfulRequests.length > 0 ? 'iris-status-led-success' : 'iris-status-led-idle'));

    return (
        <div 
            onClick={toggleExpanded}
            className={`iris-status-bar ${isExpanded ? 'iris-status-bar-expanded' : 'iris-status-bar-collapsed'}`}
        >
            {isExpanded && (
                <div className="iris-status-expanded-content">
                    <div className="iris-status-header">
                        <span className="iris-status-summary">
                            LOGS: {successfulRequests.length} OK, {failedRequests.length} NET, {jsErrors.length} JS, {interactionLogs.length} INT
                        </span>
                        <span 
                            className="iris-status-clear-btn"
                            onClick={handleClear}
                        >
                            CLEAR ALL
                        </span>
                    </div>

                    {hasSessionIssue && (
                        <div className="iris-status-section iris-status-section-session">
                            <div className="iris-status-section-title">SESSION</div>
                            <div className="iris-status-log-entry iris-status-log-entry-error">
                                <div className="iris-status-log-message iris-status-log-message-network iris-status-log-message-warning">
                                    <span>{lastSessionError ? `[${new Date(lastSessionError.time).toLocaleTimeString()}] ` : ''}{sessionLabel()}</span>
                                    <span>STATUS: {lastSessionError?.status ?? 'N/A'}</span>
                                </div>
                                {lastSessionError && (
                                    <div className="iris-status-log-url">
                                        {lastSessionError.statusText} - {lastSessionError.url}
                                    </div>
                                )}
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
                                    <div className="iris-status-log-message iris-status-log-message-warning">
                                        [{new Date(err.time).toLocaleTimeString()}] {err.message}
                                    </div>
                                    <div className="iris-status-log-source">
                                        {err.source ? `${err.source}:${err.lineno}:${err.colno}` : 'Unknown source'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {interactionLogs.length > 0 && (
                        <div className="iris-status-section iris-status-section-interactions">
                            <div className="iris-status-section-title">MAP INTERACTIONS</div>
                            {interactionLogs.map((log) => (
                                <div key={`int-${log.time}-${log.type}-${log.layerId}`} className="iris-status-log-entry">
                                    <div className="iris-status-log-message iris-status-log-message-accent">
                                        [{new Date(log.time).toLocaleTimeString()}] {log.type.toUpperCase()}: {log.layerId}
                                    </div>
                                    <div className="iris-status-log-url">
                                        {log.featureId ? `feature: ${log.featureId} | ` : ''}
                                        {log.lngLat ? `location: ${log.lngLat[0].toFixed(5)}, ${log.lngLat[1].toFixed(5)}` : ''}
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
                                    <div className="iris-status-log-message iris-status-log-message-network iris-status-log-message-error">
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
                                    <div className="iris-status-log-message iris-status-log-message-accent">
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
                        {sortedEndpointEntries.map((entry) => {
                            const derivedStatus = getDerivedEndpointStatus(entry, ENDPOINT_STALE_AFTER_MS);
                            return (
                                <div key={`endpoint-${entry.key}`} className="iris-status-log-entry">
                                    <div className={`iris-status-log-message iris-status-log-message-network ${endpointStatusClass(derivedStatus)}`}>
                                        <span>{entry.key}</span>
                                        <span>{derivedStatus.toUpperCase()}</span>
                                    </div>
                                    <div className="iris-status-log-url">
                                        last request: {entry.lastRequestAt ? new Date(entry.lastRequestAt).toLocaleTimeString() : 'never'}
                                        {entry.lastSuccessAt ? ` | last success: ${new Date(entry.lastSuccessAt).toLocaleTimeString()}` : ''}
                                        {entry.lastErrorStatus !== null ? ` | last error: ${entry.lastErrorStatus}` : ''}
                                    </div>
                                    {formatCountdown(entry) && (
                                        <div className="iris-status-log-url">
                                            {POLLED_ENDPOINT_LABELS[entry.key]}: {formatCountdown(entry)}
                                        </div>
                                    )}
                                    {!formatCountdown(entry) && ENDPOINT_REFRESH_MODE_LABELS[entry.key] && (
                                        <div className="iris-status-log-url">
                                            {ENDPOINT_REFRESH_MODE_LABELS[entry.key]}
                                        </div>
                                    )}
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
                    <div className={`iris-status-led ${ledStatusClass}`} />
                    <span className={`iris-status-text ${networkTextClass}`}>
                        {activeRequests > 0 ? `NET: ${activeRequests} ACTIVE` : 'NET: IDLE'}
                        {successfulRequests.length > 0 && ` (${successfulRequests.length} OK)`}
                        {failedRequests.length > 0 && ` (${failedRequests.length} NET)`}
                        {jsErrors.length > 0 && ` (${jsErrors.length} JS)`}
                    </span>
                    <div className="iris-status-divider" />
                    <span className={`iris-status-text ${endpointTextClass}`}>
                        ENDPOINTS:
                        {endpointHealthCounts.in_flight ? ` ${endpointHealthCounts.in_flight} ACTIVE` : ''}
                        {endpointHealthCounts.error ? ` ${endpointHealthCounts.error} ERR` : ''}
                        {endpointHealthCounts.stale ? ` ${endpointHealthCounts.stale} STALE` : ''}
                    </span>

                    {entitiesAgeMinutes !== null && (
                        <>
                            <div className="iris-status-divider" />
                            <span className={`iris-status-text ${mapDataTextClass}`}>
                                MAP DATA: {entitiesAgeMinutes === 0 ? '< 1m' : `${entitiesAgeMinutes}m`} AGO
                            </span>
                        </>
                    )}

                    <div className="iris-status-divider" />
                    <span className={`iris-status-text ${sessionTextClass}`}>
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
                        <div className="iris-status-progress-bar" />
                    )}
                </div>
            </div>
        </div>
    );
}
