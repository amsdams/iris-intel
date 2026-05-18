import { h, JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
    EndpointDiagnostics,
    EndpointKey,
    MainThreadDiagnostics,
    MapPerfDiagnostics,
    UiRenderDiagnosticsEntry,
    useStore,
} from '@iris/core';
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

function formatMs(value: number | undefined): string {
    return typeof value === 'number' ? `${Math.round(value)}ms` : '-';
}

function formatCount(value: number | undefined): string {
    return typeof value === 'number' ? value.toLocaleString() : '-';
}

function formatOptionalNumber(value: number | undefined, formatter: (value: number) => string): string {
    return typeof value === 'number' ? formatter(value) : 'n/a';
}

function formatOptionalMs(value: number | undefined): string {
    return formatOptionalNumber(value, (numericValue) => `${Math.round(numericValue)}ms`);
}

interface PerfSummaryContext {
    versionLabel: string;
    mapThemeId: string;
    activeVisualOverlayIds: string[];
    uiRenderDiagnostics: Record<string, UiRenderDiagnosticsEntry>;
    mainThreadDiagnostics: MainThreadDiagnostics;
}

function getBrowserLabel(): string {
    const ua = navigator.userAgent;
    const match =
        ua.match(/Edg\/([\d.]+)/) ??
        ua.match(/Firefox\/([\d.]+)/) ??
        ua.match(/Chrome\/([\d.]+)/) ??
        ua.match(/Version\/([\d.]+).*Safari/);

    if (!match) return 'Unknown';
    if (ua.includes('Edg/')) return `Edge ${match[1]}`;
    if (ua.includes('Firefox/')) return `Firefox ${match[1]}`;
    if (ua.includes('Chrome/')) return `Chrome ${match[1]}`;
    return `Safari ${match[1]}`;
}

function buildEnvironmentSummary(context: PerfSummaryContext): string {
    const pointer = window.matchMedia?.('(pointer: coarse)').matches ? 'coarse' : 'fine';
    const hover = window.matchMedia?.('(hover: hover)').matches ? 'yes' : 'no';
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio.toFixed(2) : '-';
    const touchPoints = navigator.maxTouchPoints ?? 0;
    const overlays = context.activeVisualOverlayIds.length > 0 ? context.activeVisualOverlayIds.join(',') : 'none';

    return `CONTEXT ${context.versionLabel} browser ${getBrowserLabel()} platform ${navigator.platform || '-'} viewport ${viewport} dpr ${dpr} touch ${touchPoints} pointer ${pointer} hover ${hover} mapStyle ${context.mapThemeId} overlays ${overlays}`;
}

function buildPerfSummary(perf: MapPerfDiagnostics, context: PerfSummaryContext): string {
    const viewport = perf.viewport;
    const frame = perf.frame;
    const uiRenderDetails = Object.values(context.uiRenderDiagnostics)
        .sort((a, b) => b.lastAt - a.lastAt)
        .slice(0, 8)
        .map((entry) => `${entry.name} ${formatCount(entry.lastCount)}/${formatCount(entry.count)}`)
        .join(' | ');
    const longTask = context.mainThreadDiagnostics.lastLongTask;
    const sourceCounts = viewport?.sourceFeatureCounts ?? {};
    const sourceSetData = viewport?.sourceSetDataMs ?? {};
    const sourceDetails = viewport
        ? ['portals', 'links', 'fields', 'artifacts', 'ornaments', 'plugin-features']
            .map((sourceId) => `${sourceId} ${formatCount(sourceCounts[sourceId])}/${formatMs(sourceSetData[sourceId])}`)
            .join(' | ')
        : '';
    return [
        buildEnvironmentSummary(context),
        viewport
            ? `VIEWPORT source ${formatMs(viewport.totalMs)} z ${formatOptionalNumber(viewport.zoom, (value) => value.toFixed(2))} buffer ${formatOptionalNumber(viewport.queryBufferDegrees, (value) => value.toFixed(4))} query ${formatOptionalMs(viewport.queryMs)} setData ${formatMs(viewport.setDataMs)} items ${formatCount(viewport.itemCount)} P ${formatCount(viewport.portalCount)} L ${formatCount(viewport.linkCount)} F ${formatCount(viewport.fieldCount)} art ${formatCount(viewport.artifactCount)} orn ${formatCount(viewport.ornamentCount)} plugin ${formatCount(viewport.pluginCount)}`
            : 'VIEWPORT no sample',
        sourceDetails ? `SOURCES ${sourceDetails}` : 'SOURCES no sample',
        frame
            ? `FRAME ${formatMs(frame.totalMs)} avg ${formatMs(frame.averageFrameMs)} max ${formatMs(frame.maxFrameMs)} fps ${formatCount(frame.estimatedFps)} slow ${formatCount(frame.slowFrameCount)}/${formatCount(frame.frameCount)}${frame.benchmarkRunCount ? ` bench ${formatCount(frame.benchmarkRunCount)} median ${formatMs(frame.benchmarkMedianAverageFrameMs)} range ${formatMs(frame.benchmarkMinAverageFrameMs)}-${formatMs(frame.benchmarkMaxAverageFrameMs)} benchMax ${formatMs(frame.benchmarkMaxFrameMs)}` : ''}`
            : 'FRAME no sample',
        `LONGTASK count ${formatCount(context.mainThreadDiagnostics.longTaskCount)} max ${formatMs(context.mainThreadDiagnostics.maxLongTaskMs)} last ${longTask ? `${formatMs(longTask.durationMs)} ${longTask.source}` : 'none'}`,
        uiRenderDetails ? `UIRENDER recent/total ${uiRenderDetails}` : 'UIRENDER no sample',
    ].join('\n');
}

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
    const showMapControls = useStore((state) => state.showMapControls);
    const toggleShowMapControls = useStore((state) => state.toggleShowMapControls);
    const mapState = useStore((state) => state.mapState);
    const discoveredLocation = useStore((state) => state.discoveredLocation);
    const lastResolvedLatLng = useStore((state) => state.lastResolvedLatLng);
    const addressStatus = useStore((state) => state.addressStatus);
    const addressNextLookupAt = useStore((state) => state.addressNextLookupAt);
    const endpointDiagnostics = useStore((state) => state.endpointDiagnostics);
    const mapPerfDiagnostics = useStore((state) => state.mapPerfDiagnostics);
    const uiRenderDiagnostics = useStore((state) => state.uiRenderDiagnostics);
    const mainThreadDiagnostics = useStore((state) => state.mainThreadDiagnostics);
    const domainErrors = useStore((state) => state.domainErrors);
    const clearDomainErrors = useStore((state) => state.clearDomainErrors);
    const mapThemeId = useStore((state) => state.mapThemeId);
    const activeVisualOverlayIds = useStore((state) => state.activeVisualOverlayIds);

    const [countdown, setCountdown] = useState<number | null>(null);
    const [, setNow] = useState(() => Date.now());
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

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

    const formatRelativeTime = (time: number | null | undefined): string => {
        if (!time) return 'never';
        const seconds = Math.floor((Date.now() - time) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        return `${Math.floor(seconds / 60)}m ago`;
    };

    const getEndpointTimingLabel = (entry: EndpointDiagnostics): string | null => {
        let timerLabel = '';
        if (entry.nextAutoRefreshAt && POLLED_ENDPOINT_LABELS[entry.key]) {
            if (entry.status === 'in_flight') {
                timerLabel = `${POLLED_ENDPOINT_LABELS[entry.key]}: refreshing now`;
            } else {
                const remainingMs = entry.nextAutoRefreshAt - Date.now();
                if (remainingMs <= 0) {
                    timerLabel = `${POLLED_ENDPOINT_LABELS[entry.key]}: due`;
                } else {
                    const totalSeconds = Math.ceil(remainingMs / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    const formatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                    timerLabel = `${POLLED_ENDPOINT_LABELS[entry.key]}: ${formatted}`;
                }
            }
        }

        if (ENDPOINT_REFRESH_MODE_LABELS[entry.key]) {
            let modeLabel = `refresh: ${ENDPOINT_REFRESH_MODE_LABELS[entry.key]}`;
            if (entry.key === 'entities' && entry.lastRefreshReason) {
                const skipPart = entry.lastSkipReason ? ` skip: ${entry.lastSkipReason}` : '';
                modeLabel += ` (last: ${entry.lastRefreshReason}${skipPart})`;
            }
            return timerLabel ? `${timerLabel} | ${modeLabel}` : modeLabel;
        }

        return timerLabel || null;
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
    const viewportPerf = mapPerfDiagnostics.viewport;
    const framePerf = mapPerfDiagnostics.frame;

    const copyPerfSummary = (): void => {
        const text = buildPerfSummary(mapPerfDiagnostics, {
            versionLabel: IRIS_VERSION_LABEL,
            mapThemeId,
            activeVisualOverlayIds,
            uiRenderDiagnostics,
            mainThreadDiagnostics,
        });
        navigator.clipboard?.writeText(text)
            .then(() => setCopyStatus('Copied'))
            .catch(() => setCopyStatus('Copy failed'));
        window.setTimeout(() => setCopyStatus(null), 1600);
    };


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

                    <div className="iris-debug-section-header">
                        <span className="iris-debug-section-title">MAP PERFORMANCE</span>
                        <button
                            className="iris-button iris-debug-copy-btn"
                            onClick={copyPerfSummary}
                        >
                            {copyStatus || 'COPY'}
                        </button>
                    </div>
                    <div className="iris-debug-table">
                        <div className="iris-debug-row iris-debug-row-endpoint">
                            <div className="iris-debug-endpoint-main">
                                <span className="iris-debug-label">Viewport</span>
                                <span className="iris-debug-value">
                                    {viewportPerf ? `${formatMs(viewportPerf.totalMs)} | z ${viewportPerf.zoom?.toFixed(2) ?? '-'} | setData ${formatMs(viewportPerf.setDataMs)}` : 'no sample'}
                                </span>
                            </div>
                            {viewportPerf && (
                                <div className="iris-debug-endpoint-details">
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Counts</span>
                                        <span className="iris-debug-value">
                                            P {formatCount(viewportPerf.portalCount)} | L {formatCount(viewportPerf.linkCount)} | F {formatCount(viewportPerf.fieldCount)} | Plugin {formatCount(viewportPerf.pluginCount)}
                                        </span>
                                    </div>
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Other</span>
                                        <span className="iris-debug-value">
                                            query {formatOptionalMs(viewportPerf.queryMs)} | items {formatCount(viewportPerf.itemCount)} | art {formatCount(viewportPerf.artifactCount)} | orn {formatCount(viewportPerf.ornamentCount)}
                                        </span>
                                    </div>
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Sources</span>
                                        <span className="iris-debug-value">
                                            P {formatCount(viewportPerf.sourceFeatureCounts?.portals)}/{formatMs(viewportPerf.sourceSetDataMs?.portals)} | L {formatCount(viewportPerf.sourceFeatureCounts?.links)}/{formatMs(viewportPerf.sourceSetDataMs?.links)} | F {formatCount(viewportPerf.sourceFeatureCounts?.fields)}/{formatMs(viewportPerf.sourceSetDataMs?.fields)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="iris-debug-row iris-debug-row-endpoint">
                            <div className="iris-debug-endpoint-main">
                                <span className="iris-debug-label">Pan frames</span>
                                <span className="iris-debug-value">
                                    {framePerf ? `avg ${formatMs(framePerf.averageFrameMs)} | max ${formatMs(framePerf.maxFrameMs)} | fps ${formatCount(framePerf.estimatedFps)}${framePerf.benchmarkRunCount ? ` | bench ${formatCount(framePerf.benchmarkRunCount)}` : ''}` : 'no sample'}
                                </span>
                            </div>
                            {framePerf && (
                                <div className="iris-debug-endpoint-details">
                                    {framePerf.benchmarkRunCount && (
                                        <div className="iris-debug-row">
                                            <span className="iris-debug-label-indent">Benchmark</span>
                                            <span className="iris-debug-value">
                                                median {formatMs(framePerf.benchmarkMedianAverageFrameMs)} | range {formatMs(framePerf.benchmarkMinAverageFrameMs)}-{formatMs(framePerf.benchmarkMaxAverageFrameMs)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Slow frames</span>
                                        <span className="iris-debug-value">
                                            {formatCount(framePerf.slowFrameCount)} / {formatCount(framePerf.frameCount)} over {formatMs(framePerf.totalMs)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="iris-debug-section-title">MAIN THREAD</div>
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Long tasks</span>
                            <span className="iris-debug-value">
                                {formatCount(mainThreadDiagnostics.longTaskCount)} | max {formatMs(mainThreadDiagnostics.maxLongTaskMs)}
                            </span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Last spike</span>
                            <span className="iris-debug-value">
                                {mainThreadDiagnostics.lastLongTask
                                    ? `${formatMs(mainThreadDiagnostics.lastLongTask.durationMs)} | ${mainThreadDiagnostics.lastLongTask.source} | ${formatRelativeTime(mainThreadDiagnostics.lastLongTask.time)}`
                                    : 'none'}
                            </span>
                        </div>
                    </div>

                    <div className="iris-debug-section-title">UI RENDERS</div>
                    <div className="iris-debug-table">
                        {Object.values(uiRenderDiagnostics)
                            .sort((a, b) => b.lastAt - a.lastAt)
                            .slice(0, 8)
                            .map((entry) => (
                                <div key={entry.name} className="iris-debug-row">
                                    <span className="iris-debug-label">{entry.name}</span>
                                    <span className="iris-debug-value">
                                        recent {formatCount(entry.lastCount)} | total {formatCount(entry.count)} | {formatRelativeTime(entry.lastAt)}
                                    </span>
                                </div>
                            ))}
                        {Object.keys(uiRenderDiagnostics).length === 0 && (
                            <div className="iris-debug-row">
                                <span className="iris-debug-label">Samples</span>
                                <span className="iris-debug-value">none yet</span>
                            </div>
                        )}
                    </div>

                    <div className="iris-debug-section-header">
                        <span className="iris-debug-section-title">DOMAIN ERRORS</span>
                        {domainErrors.length > 0 && (
                            <button
                                className="iris-button iris-debug-copy-btn"
                                onClick={clearDomainErrors}
                            >
                                CLEAR
                            </button>
                        )}
                    </div>
                    <div className="iris-debug-table">
                        {domainErrors.slice(0, 5).map((error) => (
                            <div key={`${error.time}-${error.domain}-${error.message}`} className="iris-debug-row iris-debug-row-endpoint">
                                <div className="iris-debug-endpoint-main">
                                    <span className="iris-debug-label">{error.domain}</span>
                                    <span className="iris-debug-value">
                                        {formatRelativeTime(error.time)} | {error.message}
                                    </span>
                                </div>
                                {error.detail && (
                                    <div className="iris-debug-endpoint-details">
                                        <div className="iris-debug-row">
                                            <span className="iris-debug-label-indent">Detail</span>
                                            <span className="iris-debug-value">{error.detail}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {domainErrors.length === 0 && (
                            <div className="iris-debug-row">
                                <span className="iris-debug-label">Recent</span>
                                <span className="iris-debug-value">none</span>
                            </div>
                        )}
                    </div>

                    <div className="iris-debug-section-title">ENDPOINTS</div>
                    <div className="iris-debug-table">
                        {sortedEndpointEntries.map((entry) => (
                            <div key={entry.key} className="iris-debug-row iris-debug-row-endpoint">
                                <div className="iris-debug-endpoint-main">
                                    <span className="iris-debug-label">{entry.key}</span>
                                    <span className="iris-debug-value">
                                        {getDerivedEndpointStatus(entry).toUpperCase()}
                                        {getEndpointTimingLabel(entry) ? ` | ${getEndpointTimingLabel(entry)}` : ''}
                                    </span>
                                </div>
                                {entry.key === 'entities' && (
                                    <div className="iris-debug-endpoint-details">
                                        <div className="iris-debug-row">
                                            <span className="iris-debug-label-indent">Source</span>
                                            <span className="iris-debug-value">
                                                IRIS: {formatRelativeTime(entry.lastActiveSuccessAt)} | 
                                                Intel: {formatRelativeTime(entry.lastPassiveSuccessAt)}
                                            </span>
                                        </div>
                                        {entry.lastCoverageKey && (
                                            <div className="iris-debug-row">
                                                <span className="iris-debug-label-indent">Coverage</span>
                                                <span className="iris-debug-value iris-debug-coverage-key">{entry.lastCoverageKey}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                        <label className="iris-choice-item iris-label">
                            <input
                                type="checkbox"
                                checked={showMapControls}
                                onChange={toggleShowMapControls}
                                className="iris-checkbox"
                            />
                            Show map navigation controls
                        </label>
                    </div>

                </div>
            </div>
        </Popup>
    );
}
