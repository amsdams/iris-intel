import { h, JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
    EndpointDiagnostics,
    EndpointKey,
    buildDiagnosticsEnvironmentSummary,
    formatDiagnosticCount,
    formatDiagnosticMs,
    formatEndpointCountdown,
    formatOptionalDiagnosticMs,
    formatOptionalDiagnosticNumber,
    formatRelativeTime,
    getBrowserLabel,
    getDerivedEndpointStatus,
    MainThreadDiagnostics,
    MapPerfDiagnostics,
    sortEndpointDiagnostics,
    UiRenderDiagnosticsEntry,
    useStore,
} from '@iris/core';
import { Popup } from '../../shared/Popup';
import { IRIS_VERSION_LABEL } from '../../../version';
import './debug.css';
import {THEMES} from "../../theme";
import { useRenderDiagnostics } from '../../shared/useRenderDiagnostics';

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

interface PerfSummaryContext {
    versionLabel: string;
    mapThemeId: string;
    activeVisualOverlayIds: string[];
    endpointDiagnostics: Record<EndpointKey, EndpointDiagnostics>;
    uiRenderDiagnostics: Record<string, UiRenderDiagnosticsEntry>;
    mainThreadDiagnostics: MainThreadDiagnostics;
}

function buildEnvironmentSummary(context: PerfSummaryContext): string {
    const pointer = window.matchMedia?.('(pointer: coarse)').matches ? 'coarse' : 'fine';
    const hover = window.matchMedia?.('(hover: hover)').matches ? 'yes' : 'no';
    const overlays = context.activeVisualOverlayIds.length > 0 ? context.activeVisualOverlayIds.join(',') : 'none';

    return buildDiagnosticsEnvironmentSummary(`CONTEXT ${context.versionLabel}`, {
        browser: getBrowserLabel(navigator.userAgent),
        platform: navigator.platform || '-',
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        touchPoints: navigator.maxTouchPoints ?? 0,
        pointer,
        hover,
    }, {
        mapStyle: context.mapThemeId,
        overlays,
    });
}

function buildPerfSummary(perf: MapPerfDiagnostics, context: PerfSummaryContext): string {
    const viewport = perf.viewport;
    const frame = perf.frame;
    const uiRenderDetails = Object.values(context.uiRenderDiagnostics)
        .sort((a, b) => b.lastAt - a.lastAt)
        .slice(0, 8)
        .map((entry) => `${entry.name} ${formatDiagnosticCount(entry.lastCount)}/${formatDiagnosticCount(entry.count)}`)
        .join(' | ');
    const longTask = context.mainThreadDiagnostics.lastLongTask;
    const sourceCounts = viewport?.sourceFeatureCounts ?? {};
    const sourceSetData = viewport?.sourceSetDataMs ?? {};
    const entityDiagnostics = context.endpointDiagnostics.entities;
    const entityGenerationDetails = entityDiagnostics.staleQueuedDropCount > 0 || entityDiagnostics.staleResponseIgnoreCount > 0
        ? `ENTITYGEN staleQueued ${formatDiagnosticCount(entityDiagnostics.staleQueuedDropCount)} staleResponses ${formatDiagnosticCount(entityDiagnostics.staleResponseIgnoreCount)} lastSkip ${entityDiagnostics.lastSkipReason ?? 'none'}`
        : '';
    const pluginCounts = viewport?.pluginFeatureCounts;
    const pluginDetails = pluginCounts
        ? `PLUGIN total ${formatDiagnosticCount(pluginCounts.total)} rendered ${formatDiagnosticCount(pluginCounts.renderedSource)} html ${formatDiagnosticCount(pluginCounts.htmlMarkers)} labels ${formatDiagnosticCount(pluginCounts.labels)} player ${formatDiagnosticCount(pluginCounts.playerMarkers)} highlights ${formatDiagnosticCount(pluginCounts.highlights)} lines ${formatDiagnosticCount(pluginCounts.lines)} fills ${formatDiagnosticCount(pluginCounts.fills)} points ${formatDiagnosticCount(pluginCounts.points)} interactive ${formatDiagnosticCount(pluginCounts.interactive)}`
        : '';
    const sourceDetails = viewport
        ? ['portals', 'links', 'fields', 'artifacts', 'ornaments', 'plugin-features']
            .map((sourceId) => `${sourceId} ${formatDiagnosticCount(sourceCounts[sourceId])}/${formatDiagnosticMs(sourceSetData[sourceId])}`)
            .join(' | ')
        : '';
    return [
        buildEnvironmentSummary(context),
        viewport
            ? `VIEWPORT source ${formatDiagnosticMs(viewport.totalMs)} z ${formatOptionalDiagnosticNumber(viewport.zoom, (value) => value.toFixed(2))} buffer ${formatOptionalDiagnosticNumber(viewport.queryBufferDegrees, (value) => value.toFixed(4))} query ${formatOptionalDiagnosticMs(viewport.queryMs)} setData ${formatDiagnosticMs(viewport.setDataMs)} items ${formatDiagnosticCount(viewport.itemCount)} P ${formatDiagnosticCount(viewport.portalCount)} L ${formatDiagnosticCount(viewport.linkCount)} F ${formatDiagnosticCount(viewport.fieldCount)} art ${formatDiagnosticCount(viewport.artifactCount)} orn ${formatDiagnosticCount(viewport.ornamentCount)} plugin ${formatDiagnosticCount(viewport.pluginCount)}`
            : 'VIEWPORT no sample',
        sourceDetails ? `SOURCES ${sourceDetails}` : 'SOURCES no sample',
        entityGenerationDetails,
        pluginDetails,
        frame
            ? `FRAME ${formatDiagnosticMs(frame.totalMs)} avg ${formatDiagnosticMs(frame.averageFrameMs)} max ${formatDiagnosticMs(frame.maxFrameMs)} fps ${formatDiagnosticCount(frame.estimatedFps)} slow ${formatDiagnosticCount(frame.slowFrameCount)}/${formatDiagnosticCount(frame.frameCount)}${frame.benchmarkRunCount ? ` bench ${formatDiagnosticCount(frame.benchmarkRunCount)}${frame.benchmarkVariant ? ` variant ${frame.benchmarkVariant}` : ''}${frame.benchmarkMode ? ` mode ${frame.benchmarkMode}` : ''}${typeof frame.benchmarkZoom === 'number' ? ` z ${frame.benchmarkZoom.toFixed(2)}` : ''} median ${formatDiagnosticMs(frame.benchmarkMedianAverageFrameMs)} range ${formatDiagnosticMs(frame.benchmarkMinAverageFrameMs)}-${formatDiagnosticMs(frame.benchmarkMaxAverageFrameMs)} benchMax ${formatDiagnosticMs(frame.benchmarkMaxFrameMs)}` : ''}`
            : 'FRAME no sample',
        `LONGTASK count ${formatDiagnosticCount(context.mainThreadDiagnostics.longTaskCount)} max ${formatDiagnosticMs(context.mainThreadDiagnostics.maxLongTaskMs)} last ${longTask ? `${formatDiagnosticMs(longTask.durationMs)} ${longTask.source}` : 'none'}`,
        uiRenderDetails ? `UIRENDER recent/total ${uiRenderDetails}` : 'UIRENDER no sample',
    ].filter((line) => line.length > 0).join('\n');
}

// ---------------------------------------------------------------------------
// DiagnosticsPopup
// ---------------------------------------------------------------------------

interface DiagnosticsPopupProps {
    onClose: () => void;
}

interface DiagnosticsSample {
    portalCount: number;
    linkCount: number;
    fieldCount: number;
    mapState: {
        lat: number;
        lng: number;
        zoom: number;
    };
    mapPerfDiagnostics: MapPerfDiagnostics;
    uiRenderDiagnostics: Record<string, UiRenderDiagnosticsEntry>;
    mainThreadDiagnostics: MainThreadDiagnostics;
}

function readDiagnosticsSample(): DiagnosticsSample {
    const state = useStore.getState();

    return {
        portalCount: Object.keys(state.portals).length,
        linkCount: Object.keys(state.links).length,
        fieldCount: Object.keys(state.fields).length,
        mapState: {
            lat: state.mapState.lat,
            lng: state.mapState.lng,
            zoom: state.mapState.zoom,
        },
        mapPerfDiagnostics: state.mapPerfDiagnostics,
        uiRenderDiagnostics: state.uiRenderDiagnostics,
        mainThreadDiagnostics: state.mainThreadDiagnostics,
    };
}

export function DiagnosticsPopup({ onClose }: DiagnosticsPopupProps): JSX.Element {
    useRenderDiagnostics('DiagnosticsPopup');

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const statsItems = useStore((state) => state.statsItems);
    const debugLogging = useStore((state) => state.debugLogging);
    const toggleDebugLogging = useStore((state) => state.toggleDebugLogging);
    const showMockTools = useStore((state) => state.showMockTools);
    const toggleShowMockTools = useStore((state) => state.toggleShowMockTools);
    const discoveredLocation = useStore((state) => state.discoveredLocation);
    const lastResolvedLatLng = useStore((state) => state.lastResolvedLatLng);
    const addressStatus = useStore((state) => state.addressStatus);
    const addressNextLookupAt = useStore((state) => state.addressNextLookupAt);
    const reverseGeocode = useStore((state) => state.reverseGeocode);
    const endpointDiagnostics = useStore((state) => state.endpointDiagnostics);
    const endpointActivityLog = useStore((state) => state.endpointActivityLog);
    const clearEndpointActivityLog = useStore((state) => state.clearEndpointActivityLog);
    const domainErrors = useStore((state) => state.domainErrors);
    const clearDomainErrors = useStore((state) => state.clearDomainErrors);
    const mapThemeId = useStore((state) => state.mapThemeId);
    const activeVisualOverlayIds = useStore((state) => state.activeVisualOverlayIds);

    const [countdown, setCountdown] = useState<number | null>(null);
    const [, setNow] = useState(() => Date.now());
    const [diagnosticsSample, setDiagnosticsSample] = useState(readDiagnosticsSample);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const {
        portalCount,
        linkCount,
        fieldCount,
        mapState,
        mapPerfDiagnostics,
        uiRenderDiagnostics,
        mainThreadDiagnostics,
    } = diagnosticsSample;

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
        const interval = window.setInterval(() => {
            setNow(Date.now());
            setDiagnosticsSample(readDiagnosticsSample());
        }, 1000);
        return (): void => clearInterval(interval);
    }, []);

    const isStale = discoveredLocation && lastResolvedLatLng && (
        Math.abs(lastResolvedLatLng.lat - mapState.lat) > 0.000001 ||
        Math.abs(lastResolvedLatLng.lng - mapState.lng) > 0.000001
    );

    useEffect(() => {
        if (addressStatus !== 'idle') return;
        if (discoveredLocation && !isStale) return;
        reverseGeocode(mapState.lat, mapState.lng);
    }, [addressStatus, discoveredLocation, isStale, mapState.lat, mapState.lng, reverseGeocode]);

    const endpointEntries = Object.values(endpointDiagnostics).filter((entry) => entry.key !== 'unknown');

    const getEndpointTimingLabel = (entry: EndpointDiagnostics): string | null => {
        let timerLabel = '';
        if (entry.nextAutoRefreshAt && POLLED_ENDPOINT_LABELS[entry.key]) {
            const countdown = formatEndpointCountdown(entry, POLLED_ENDPOINT_LABELS);
            timerLabel = countdown ? `${POLLED_ENDPOINT_LABELS[entry.key]}: ${countdown}` : '';
        }

        if (ENDPOINT_REFRESH_MODE_LABELS[entry.key]) {
            let modeLabel = `refresh: ${ENDPOINT_REFRESH_MODE_LABELS[entry.key]}`;
            if (entry.key === 'entities' && entry.lastRefreshReason) {
                const skipPart = entry.lastSkipReason ? ` skip: ${entry.lastSkipReason}` : '';
                const stalePart = entry.staleQueuedDropCount > 0 || entry.staleResponseIgnoreCount > 0
                    ? ` stale queued/responses: ${entry.staleQueuedDropCount}/${entry.staleResponseIgnoreCount}`
                    : '';
                modeLabel += ` (last: ${entry.lastRefreshReason}${skipPart}${stalePart})`;
            }
            return timerLabel ? `${timerLabel} | ${modeLabel}` : modeLabel;
        }

        return timerLabel || null;
    };

    const sortedEndpointEntries = sortEndpointDiagnostics(endpointEntries, ENDPOINT_REFRESH_MODE_LABELS, ENDPOINT_FALLBACK_ORDER);
    const viewportPerf = mapPerfDiagnostics.viewport;
    const framePerf = mapPerfDiagnostics.frame;

    const copyPerfSummary = (): void => {
        const text = buildPerfSummary(mapPerfDiagnostics, {
            versionLabel: IRIS_VERSION_LABEL,
            mapThemeId,
            activeVisualOverlayIds,
            endpointDiagnostics,
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
                            className="iris-debug-copy-btn iris-ui-compact-pill"
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
                                    {viewportPerf ? `${formatDiagnosticMs(viewportPerf.totalMs)} | z ${viewportPerf.zoom?.toFixed(2) ?? '-'} | setData ${formatDiagnosticMs(viewportPerf.setDataMs)}` : 'no sample'}
                                </span>
                            </div>
                            {viewportPerf && (
                                <div className="iris-debug-endpoint-details">
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Counts</span>
                                        <span className="iris-debug-value">
                                            P {formatDiagnosticCount(viewportPerf.portalCount)} | L {formatDiagnosticCount(viewportPerf.linkCount)} | F {formatDiagnosticCount(viewportPerf.fieldCount)} | Plugin {formatDiagnosticCount(viewportPerf.pluginCount)}
                                        </span>
                                    </div>
                                    {viewportPerf.pluginFeatureCounts && (
                                        <div className="iris-debug-row">
                                            <span className="iris-debug-label-indent">Plugin mix</span>
                                            <span className="iris-debug-value">
                                                labels {formatDiagnosticCount(viewportPerf.pluginFeatureCounts.labels)} | html {formatDiagnosticCount(viewportPerf.pluginFeatureCounts.htmlMarkers)} | player {formatDiagnosticCount(viewportPerf.pluginFeatureCounts.playerMarkers)} | fills {formatDiagnosticCount(viewportPerf.pluginFeatureCounts.fills)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Other</span>
                                        <span className="iris-debug-value">
                                            query {formatOptionalDiagnosticMs(viewportPerf.queryMs)} | items {formatDiagnosticCount(viewportPerf.itemCount)} | art {formatDiagnosticCount(viewportPerf.artifactCount)} | orn {formatDiagnosticCount(viewportPerf.ornamentCount)}
                                        </span>
                                    </div>
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Sources</span>
                                        <span className="iris-debug-value">
                                            P {formatDiagnosticCount(viewportPerf.sourceFeatureCounts?.portals)}/{formatDiagnosticMs(viewportPerf.sourceSetDataMs?.portals)} | L {formatDiagnosticCount(viewportPerf.sourceFeatureCounts?.links)}/{formatDiagnosticMs(viewportPerf.sourceSetDataMs?.links)} | F {formatDiagnosticCount(viewportPerf.sourceFeatureCounts?.fields)}/{formatDiagnosticMs(viewportPerf.sourceSetDataMs?.fields)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="iris-debug-row iris-debug-row-endpoint">
                            <div className="iris-debug-endpoint-main">
                                <span className="iris-debug-label">Pan frames</span>
                                <span className="iris-debug-value">
                                    {framePerf ? `avg ${formatDiagnosticMs(framePerf.averageFrameMs)} | max ${formatDiagnosticMs(framePerf.maxFrameMs)} | fps ${formatDiagnosticCount(framePerf.estimatedFps)}${framePerf.benchmarkRunCount ? ` | bench ${formatDiagnosticCount(framePerf.benchmarkRunCount)}${framePerf.benchmarkVariant ? ` ${framePerf.benchmarkVariant}` : ''}${framePerf.benchmarkMode ? ` ${framePerf.benchmarkMode}` : ''}${typeof framePerf.benchmarkZoom === 'number' ? ` z${framePerf.benchmarkZoom.toFixed(2)}` : ''}` : ''}` : 'no sample'}
                                </span>
                            </div>
                            {framePerf && (
                                <div className="iris-debug-endpoint-details">
                                    {framePerf.benchmarkRunCount && (
                                        <div className="iris-debug-row">
                                            <span className="iris-debug-label-indent">Benchmark</span>
                                            <span className="iris-debug-value">
                                                median {formatDiagnosticMs(framePerf.benchmarkMedianAverageFrameMs)} | range {formatDiagnosticMs(framePerf.benchmarkMinAverageFrameMs)}-{formatDiagnosticMs(framePerf.benchmarkMaxAverageFrameMs)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="iris-debug-row">
                                        <span className="iris-debug-label-indent">Slow frames</span>
                                        <span className="iris-debug-value">
                                            {formatDiagnosticCount(framePerf.slowFrameCount)} / {formatDiagnosticCount(framePerf.frameCount)} over {formatDiagnosticMs(framePerf.totalMs)}
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
                                {formatDiagnosticCount(mainThreadDiagnostics.longTaskCount)} | max {formatDiagnosticMs(mainThreadDiagnostics.maxLongTaskMs)}
                            </span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Last spike</span>
                            <span className="iris-debug-value">
                                {mainThreadDiagnostics.lastLongTask
                                    ? `${formatDiagnosticMs(mainThreadDiagnostics.lastLongTask.durationMs)} | ${mainThreadDiagnostics.lastLongTask.source} | ${formatRelativeTime(mainThreadDiagnostics.lastLongTask.time)}`
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
                                        recent {formatDiagnosticCount(entry.lastCount)} | total {formatDiagnosticCount(entry.count)} | {formatRelativeTime(entry.lastAt)}
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
                                className="iris-debug-copy-btn iris-ui-compact-pill"
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

                    <div className="iris-debug-section-header">
                        <span className="iris-debug-section-title">ENDPOINT LOG</span>
                        {endpointActivityLog.length > 0 && (
                            <button
                                className="iris-debug-copy-btn iris-ui-compact-pill"
                                onClick={clearEndpointActivityLog}
                            >
                                CLEAR
                            </button>
                        )}
                    </div>
                    <div className="iris-debug-table">
                        {endpointActivityLog.slice(0, 12).map((entry) => (
                            <div key={`${entry.time}-${entry.endpoint}-${entry.message}`} className="iris-debug-row">
                                <span className="iris-debug-label">{entry.endpoint}</span>
                                <span className="iris-debug-value">
                                    {formatRelativeTime(entry.time)} | {entry.message}
                                </span>
                            </div>
                        ))}
                        {endpointActivityLog.length === 0 && (
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
                                        {getDerivedEndpointStatus(entry, ENDPOINT_STALE_AFTER_MS).toUpperCase()}
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
                    </div>

                </div>
            </div>
        </Popup>
    );
}
