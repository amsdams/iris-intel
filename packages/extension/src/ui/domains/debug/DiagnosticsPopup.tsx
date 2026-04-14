import { h, JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { EndpointDiagnostics, EndpointKey, useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { IRIS_VERSION_LABEL } from '../../../version';
import './debug.css';
import {THEMES} from "../../theme";

const POLLED_ENDPOINT_LABELS: Partial<Record<EndpointKey, string>> = {
    plexts: 'next auto refresh',
    entities: 'next refresh',
    artifacts: 'next auto refresh',
};

const ENDPOINT_REFRESH_MODE_LABELS: Partial<Record<EndpointKey, string>> = {
    entities: 'startup + move settle + idle',
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

const ENDPOINT_STALE_AFTER_MS: Partial<Record<EndpointKey, number>> = {
    plexts: 2 * 60 * 1000,
    entities: 2 * 60 * 1000,
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

// ---------------------------------------------------------------------------
// DiagnosticsPopup
// ---------------------------------------------------------------------------

interface DiagnosticsPopupProps {
    onClose: () => void;
}

export function DiagnosticsPopup({ onClose }: DiagnosticsPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const portals = useStore((state) => state.portals);
    const links = useStore((state) => state.links);
    const fields = useStore((state) => state.fields);
    const statsItems = useStore((state) => state.statsItems);

    const portalCount = Object.keys(portals).length;
    const linkCount = Object.keys(links).length;
    const fieldCount = Object.keys(fields).length;
    const debugLogging = useStore((state) => state.debugLogging);
    const toggleDebugLogging = useStore((state) => state.toggleDebugLogging);
    const showMockTools = useStore((state) => state.showMockTools);
    const toggleShowMockTools = useStore((state) => state.toggleShowMockTools);
    const mapState = useStore((state) => state.mapState);
    const discoveredLocation = useStore((state) => state.discoveredLocation);
    const lastResolvedLatLng = useStore((state) => state.lastResolvedLatLng);
    const addressStatus = useStore((state) => state.addressStatus);
    const addressNextLookupAt = useStore((state) => state.addressNextLookupAt);
    const endpointDiagnostics = useStore((state) => state.endpointDiagnostics);

    const handleLoadMockArtifacts = (): void => {
        window.postMessage({ type: 'IRIS_LOAD_MOCK_ARTIFACTS' }, '*');
    };

    const handleClearMockArtifacts = (): void => {
        window.postMessage({ type: 'IRIS_CLEAR_MOCK_ARTIFACTS' }, '*');
    };

    const handleLoadMockOrnaments = (): void => {
        window.postMessage({ type: 'IRIS_LOAD_MOCK_ORNAMENTS' }, '*');
    };

    const handleClearMockOrnaments = (): void => {
        window.postMessage({ type: 'IRIS_CLEAR_MOCK_ORNAMENTS' }, '*');
    };

    const [countdown, setCountdown] = useState<number | null>(null);
    const [, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (addressStatus !== 'pending' || !addressNextLookupAt) {
            setCountdown(null);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.max(0, addressNextLookupAt - Date.now());
            setCountdown(remaining);
        }, 50);

        return (): void => clearInterval(interval);
    }, [addressStatus, addressNextLookupAt]);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return (): void => clearInterval(interval);
    }, []);

    const isStale = discoveredLocation && lastResolvedLatLng && (
        Math.abs(lastResolvedLatLng.lat - mapState.lat) > 0.000001 ||
        Math.abs(lastResolvedLatLng.lng - mapState.lng) > 0.000001
    );
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

    const getEndpointTimingLabel = (entry: EndpointDiagnostics): string | null => {
        if (entry.nextAutoRefreshAt && POLLED_ENDPOINT_LABELS[entry.key]) {
            if (entry.status === 'in_flight') return `${POLLED_ENDPOINT_LABELS[entry.key]}: refreshing now`;

            const remainingMs = entry.nextAutoRefreshAt - Date.now();
            if (remainingMs <= 0) return `${POLLED_ENDPOINT_LABELS[entry.key]}: due`;

            const totalSeconds = Math.ceil(remainingMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const formatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            return `${POLLED_ENDPOINT_LABELS[entry.key]}: ${formatted}`;
        }

        if (ENDPOINT_REFRESH_MODE_LABELS[entry.key]) {
            return `refresh: ${ENDPOINT_REFRESH_MODE_LABELS[entry.key]}`;
        }

        return null;
    };

    const getEndpointSortBucket = (entry: EndpointDiagnostics): number => {
        if (entry.status === 'in_flight') return 0;
        if (entry.nextAutoRefreshAt) return 1;
        if (ENDPOINT_REFRESH_MODE_LABELS[entry.key]) return 2;
        return 3;
    };

    const sortedEndpointEntries = [...endpointEntries].sort((a, b) => {
        const bucketDiff = getEndpointSortBucket(a) - getEndpointSortBucket(b);
        if (bucketDiff !== 0) return bucketDiff;

        if (a.nextAutoRefreshAt && b.nextAutoRefreshAt) {
            const refreshDiff = a.nextAutoRefreshAt - b.nextAutoRefreshAt;
            if (refreshDiff !== 0) return refreshDiff;
        }

        return ENDPOINT_FALLBACK_ORDER.indexOf(a.key) - ENDPOINT_FALLBACK_ORDER.indexOf(b.key);
    });

    return (
        <Popup
            onClose={onClose}
            title="Diagnostics"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-debug-info">
                <div className="iris-debug-stats">
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Version</span>
                            <span className="iris-debug-value">{IRIS_VERSION_LABEL}</span>
                        </div>
                    </div>

                    <div className="iris-debug-section-title">LOCATION</div>
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Lat</span>
                            <span className="iris-debug-value">{mapState.lat.toFixed(6)}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Lng</span>
                            <span className="iris-debug-value">{mapState.lng.toFixed(6)}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Zoom</span>
                            <span className="iris-debug-value">{mapState.zoom}</span>
                        </div>
                    </div>
                    
                    <div className="iris-debug-address-section">
                        <div className="iris-debug-address-header">
                            <span className="iris-debug-section-title">ADDRESS</span>
                            {isStale && <span className="iris-debug-address-stale">(stale)</span>}
                            {addressStatus === 'resolving' && <span className="iris-debug-address-resolving">Resolving...</span>}
                            {countdown !== null && <span className="iris-debug-address-wait">Wait: {(countdown / 1000).toFixed(1)}s</span>}
                        </div>
                        <div className="iris-debug-table">
                             <div className="iris-debug-row">
                                <span className={`iris-debug-value iris-debug-discovered-location ${isStale ? 'iris-debug-location-stale' : ''}`}>
                                    {discoveredLocation || '(unknown)'}
                                </span>
                             </div>
                        </div>
                    </div>
                    
                    <div className="iris-debug-section-title">ENTITIES</div>
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Portals</span>
                            <span className="iris-debug-value">{portalCount}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Links</span>
                            <span className="iris-debug-value">{linkCount}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Fields</span>
                            <span className="iris-debug-value">{fieldCount}</span>
                        </div>
                    </div>

                    <div className="iris-debug-section-title">ENDPOINTS</div>
                    <div className="iris-debug-table">
                        {sortedEndpointEntries.map((entry) => (
                            <div key={entry.key} className="iris-debug-row iris-debug-row-endpoint">
                                <span className="iris-debug-label">{entry.key}</span>
                                <span className="iris-debug-value">
                                    {getDerivedEndpointStatus(entry).toUpperCase()}
                                    {getEndpointTimingLabel(entry) ? ` | ${getEndpointTimingLabel(entry)}` : ''}
                                </span>
                            </div>
                        ))}
                    </div>

                    {Object.values(statsItems).length > 0 && (
                        <>
                            <div className="iris-debug-section-title">EXTRA</div>
                            <div className="iris-debug-table">
                                {Object.values(statsItems).map((item) => (
                                    <div key={item.id} className="iris-debug-row">
                                        <span className="iris-debug-label">{item.label}</span>
                                        <span className={`iris-debug-value iris-debug-stat-${item.id}`}>
                                            {typeof item.value === 'function' ? item.value() : item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="iris-debug-section-title">DEVELOPER</div>
                    <div className="iris-debug-toggle">
                        <label className="iris-choice-item iris-label">
                            <input
                                type="checkbox"
                                checked={debugLogging}
                                onChange={toggleDebugLogging}
                                className="iris-checkbox"
                            />
                            Log raw message activity
                        </label>
                        <label className="iris-choice-item iris-label">
                            <input
                                type="checkbox"
                                checked={showMockTools}
                                onChange={toggleShowMockTools}
                                className="iris-checkbox"
                            />
                            Show mock tools
                        </label>
                    </div>
                    {showMockTools && (
                        <>
                            <div className="iris-debug-section-title">MOCK DATA</div>
                            <div className="iris-flex iris-gap-2 iris-flex-wrap">
                                <button
                                    className="iris-button iris-comm-refresh-btn"
                                    onClick={handleLoadMockArtifacts}
                                >
                                    LOAD MOCK ARTIFACTS
                                </button>
                                <button
                                    className="iris-button iris-comm-refresh-btn"
                                    onClick={handleClearMockArtifacts}
                                >
                                    CLEAR MOCK ARTIFACTS
                                </button>
                                <button
                                    className="iris-button iris-comm-refresh-btn"
                                    onClick={handleLoadMockOrnaments}
                                >
                                    LOAD MOCK ORNAMENTS
                                </button>
                                <button
                                    className="iris-button iris-comm-refresh-btn"
                                    onClick={handleClearMockOrnaments}
                                >
                                    CLEAR MOCK ORNAMENTS
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Popup>
    );
}
