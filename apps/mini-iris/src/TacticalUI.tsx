import { h, JSX, Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {createGameScoreRequestMessage, createInventoryRequestMessage, createRegionScoreRequestMessage, createSubscriptionRequestMessage, formatCompactEndpointStateLabel, formatDiagnosticCount, formatDiagnosticMs, getBrowserLabel, getCompactEndpointStateKind, type Field, type Link, type Portal, type PlextRequestBounds} from '@iris/core';
import type { PlayerHistory } from './usePlayerTracker';
import { MapTools } from './MapTools';
import { DataDock } from './DataDock';
import { useComm } from './useComm';
import type { EndpointName, EndpointTelemetry } from './useEndpointTelemetry';
import type { PortalHistoryKey, PortalHistoryLayerState } from './portalHistory';
import type { MiniFrameStats, MiniRenderStats } from './diagnostics';
import { MINI_IRIS_MONO_FONT } from './typography';
import type { PlextDebugSnapshot } from '@iris/core/plext-debug';

interface EventLogEntry {
    time: string;
    msg: string;
}

type SelectedEntity = { type: 'portal'; data: Portal } | { type: 'link'; data: Link } | { type: 'field'; data: Field };

interface TacticalUIProps {
    zoom: number;
    lat: number;
    lng: number;
    events: EventLogEntry[];
    plextDebugSnapshot: PlextDebugSnapshot | null;
    endpointTelemetry: Partial<Record<EndpointName, EndpointTelemetry>>;
    plextBounds: PlextRequestBounds | null;
    playerHistories: Map<string, PlayerHistory>;
    selected: SelectedEntity | null;
    selectionDetailsRequestKey: number;
    onNav: (action: string) => void;
    onStyle: (style: string) => void;
    onMode: (mode: string) => void;
    onPortalClick: (lat: number, lng: number, name: string) => void;
    onSelectionPanelOpen: () => void;
    onSelectionPanelClose: () => void;
    portalHistoryLayers: PortalHistoryLayerState;
    onPortalHistoryLayerToggle: (key: PortalHistoryKey) => void;
    keyOverlayEnabled: boolean;
    onKeyOverlayToggle: () => void;
    artifactsEnabled: boolean;
    onArtifactsToggle: () => void;
    ornamentsEnabled: boolean;
    onOrnamentsToggle: () => void;
    portalLevelColorEnabled: boolean;
    onPortalLevelColorToggle: () => void;
    portalHealthColorEnabled: boolean;
    onPortalHealthColorToggle: () => void;
    liveMode: boolean;
    patternMode: number;
    extrusionEnabled: boolean;
    renderStats: MiniRenderStats | null;
    frameStats: MiniFrameStats;
    benchBatchRunning: boolean;
    benchBatchReport: string;
    onRunBenchBatch: () => void;
    entityCounts: {
        portals: number;
        links: number;
        fields: number;
        players: number;
    };
}

export function TacticalUI({ zoom, lat, lng, events, plextDebugSnapshot, endpointTelemetry, plextBounds, playerHistories, selected, selectionDetailsRequestKey, onNav, onStyle, onMode, onPortalClick, onSelectionPanelOpen, onSelectionPanelClose, portalHistoryLayers, onPortalHistoryLayerToggle, keyOverlayEnabled, onKeyOverlayToggle, artifactsEnabled, onArtifactsToggle, ornamentsEnabled, onOrnamentsToggle, portalLevelColorEnabled, onPortalLevelColorToggle, portalHealthColorEnabled, onPortalHealthColorToggle, liveMode, patternMode, extrusionEnabled, renderStats, frameStats, benchBatchRunning, benchBatchReport, onRunBenchBatch, entityCounts }: TacticalUIProps): JSX.Element {
    const [openDrawer, setOpenDrawer] = useState<string | null>(null);
    const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
    const handledSelectionDetailsRequestKeyRef = useRef(0);
    
    const { activeTab, setActiveTab, refreshComm } = useComm(true, true, plextBounds);

    useEffect(() => {
        if (!selected) {
            setOpenDrawer((current) => {
                if (current === 'selection') {
                    onSelectionPanelClose();
                    return null;
                }
                return current;
            });
        }
    }, [onSelectionPanelClose, selected]);

    useEffect(() => {
        if (!selected || selectionDetailsRequestKey === 0 || selectionDetailsRequestKey === handledSelectionDetailsRequestKeyRef.current) return;
        handledSelectionDetailsRequestKeyRef.current = selectionDetailsRequestKey;
        setOpenDrawer((current) => {
            if (current !== 'selection') {
                onSelectionPanelOpen();
            }
            return 'selection';
        });
    }, [onSelectionPanelOpen, selected, selectionDetailsRequestKey]);

    const entries = (Object.entries(endpointTelemetry) as [EndpointName, EndpointTelemetry | undefined][])
        .filter((entry): entry is [EndpointName, EndpointTelemetry] => entry[1] !== undefined);
    const activeCount = entries.filter(([, value]) => value?.status === 'in_flight').length;
    const errorCount = entries.filter(([, value]) => value?.status === 'error').length;
    const cooldownCount = entries.filter(([, value]) => value?.cooldownUntil !== null && typeof value?.cooldownUntil === 'number' && value.cooldownUntil > Date.now()).length;
    const freshCount = entries.filter(([, value]) => {
        const next = value?.nextRefreshAt;
        return typeof next === 'number' && next > Date.now() && value?.status !== 'error';
    }).length;

    const endpointLabel = (endpoint: EndpointName): string => {
        switch (endpoint) {
            case 'entities':
                return 'Map';
            case 'portalDetails':
                return 'Portal';
            case 'gameScore':
                return 'Score';
            case 'regionScore':
                return 'Region';
            case 'subscription':
                return 'Sub';
            case 'inventory':
                return 'Inv';
            case 'plexts':
                return 'Comm';
            case 'artifacts':
                return 'Shard';
        }
    };

    const endpointBadgeStyle = (entry: EndpointTelemetry): Record<string, string> => {
        const kind = getCompactEndpointStateKind(entry);
        switch (kind) {
            case 'active':
                return {
                    background: 'rgba(24, 58, 98, 0.92)',
                    color: '#bfe4ff',
                    border: '1px solid rgba(159, 213, 255, 0.35)',
                };
            case 'error':
                return {
                    background: 'rgba(78, 20, 20, 0.94)',
                    color: '#ff9a9a',
                    border: '1px solid rgba(255, 154, 154, 0.42)',
                };
            case 'cooldown':
                return {
                    background: 'rgba(76, 52, 16, 0.92)',
                    color: '#ffd78a',
                    border: '1px solid rgba(255, 215, 138, 0.35)',
                };
            case 'fresh':
                return {
                    background: 'rgba(18, 58, 34, 0.92)',
                    color: '#a8f0c1',
                    border: '1px solid rgba(168, 240, 193, 0.3)',
                };
            case 'idle':
                return {
                    background: 'rgba(18, 18, 18, 0.88)',
                    color: '#d8fdfd',
                    border: '1px solid rgba(255,255,255,0.14)',
                };
        }
    };

    const toggleDrawer = (id: string): void => {
        const wasSelectionOpen = openDrawer === 'selection';
        const isOpening = openDrawer !== id;
        const nextDrawer = isOpening ? id : null;
        setOpenDrawer(nextDrawer);

        if (wasSelectionOpen && nextDrawer !== 'selection') {
            onSelectionPanelClose();
        }

        if (isOpening) {
            if (id === 'selection') {
                onSelectionPanelOpen();
            } else if (id === 'player') {
                window.postMessage(createSubscriptionRequestMessage(), '*');
            } else if (id === 'inventory') {
                window.postMessage(createInventoryRequestMessage(), '*');
            } else if (id === 'scores') {
                window.postMessage(createGameScoreRequestMessage(), '*');
                const regionScoreRequest = createRegionScoreRequestMessage(lat, lng);
                if (regionScoreRequest) window.postMessage(regionScoreRequest, '*');
            } else if (id === 'comm') {
                refreshComm();
            }
        }
    };

    const benchLine = [
        'MINI IRIS BENCH',
        `browser ${getBrowserLabel(navigator.userAgent)}`,
        `platform ${navigator.platform}`,
        `viewport ${window.innerWidth}x${window.innerHeight}`,
        `dpr ${Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio.toFixed(2) : '-'}`,
        `z${zoom.toFixed(2)}`,
        liveMode ? 'mode live' : `mode mock${patternMode}`,
        `items ${formatDiagnosticCount(renderStats?.totalFeatures)}`,
        `P ${formatDiagnosticCount(renderStats?.portalCount)}`,
        `L ${formatDiagnosticCount(renderStats?.linkCount)}`,
        `F ${formatDiagnosticCount(renderStats?.fieldCount)}`,
        `keys ${formatDiagnosticCount(renderStats?.keyLabelCount)}`,
        `sources P ${formatDiagnosticCount(entityCounts.portals)} L ${formatDiagnosticCount(entityCounts.links)} F ${formatDiagnosticCount(entityCounts.fields)}`,
        `avg ${formatDiagnosticMs(frameStats.avgMs)}`,
        `max ${formatDiagnosticMs(frameStats.maxMs)}`,
        `fps ${frameStats.fps}`,
        `slow ${frameStats.slowFrames}/${frameStats.sampleCount}`,
        `render ${formatDiagnosticMs(renderStats?.renderMs)}`,
        `query ${formatDiagnosticCount(renderStats?.queryItemCount)}`,
        `toggles lvl ${portalLevelColorEnabled ? 'on' : 'off'} hp ${portalHealthColorEnabled ? 'on' : 'off'} keys ${keyOverlayEnabled ? 'on' : 'off'} 3d ${extrusionEnabled ? 'on' : 'off'}`,
    ].join(' | ');

    const eventLogText = events.map((event) => `[${event.time}] ${event.msg}`).join('\n');

    const copyBenchLine = (): void => {
        const write = navigator.clipboard?.writeText(benchLine);
        if (write) void write.catch(() => undefined);
    };

    const copyBenchBatch = (): void => {
        if (!benchBatchReport) return;
        const write = navigator.clipboard?.writeText(benchBatchReport);
        if (write) void write.catch(() => undefined);
    };

    const copyEventLog = (): void => {
        const write = navigator.clipboard?.writeText(eventLogText);
        if (write) void write.catch(() => undefined);
    };

    const copyPlextRaw = (): void => {
        if (!plextDebugSnapshot) return;
        const write = navigator.clipboard?.writeText(plextDebugSnapshot.raw);
        if (write) void write.catch(() => undefined);
    };

    const copyPlextParsed = (): void => {
        if (!plextDebugSnapshot) return;
        const write = navigator.clipboard?.writeText(plextDebugSnapshot.parsed);
        if (write) void write.catch(() => undefined);
    };

    return (
        <Fragment>
            {/* Top Right: Map Tools */}
            <MapTools
                openDrawer={openDrawer}
                diagnosticsOpen={diagnosticsOpen}
                onToggle={toggleDrawer}
                onDiagnosticsToggle={() => setDiagnosticsOpen((open) => !open)}
                onNav={onNav}
                onStyle={onStyle}
                onMode={onMode}
                portalHistoryLayers={portalHistoryLayers}
                onPortalHistoryLayerToggle={onPortalHistoryLayerToggle}
                keyOverlayEnabled={keyOverlayEnabled}
                onKeyOverlayToggle={onKeyOverlayToggle}
                artifactsEnabled={artifactsEnabled}
                onArtifactsToggle={onArtifactsToggle}
                ornamentsEnabled={ornamentsEnabled}
                onOrnamentsToggle={onOrnamentsToggle}
                portalLevelColorEnabled={portalLevelColorEnabled}
                onPortalLevelColorToggle={onPortalLevelColorToggle}
                portalHealthColorEnabled={portalHealthColorEnabled}
                onPortalHealthColorToggle={onPortalHealthColorToggle}
            />

            {diagnosticsOpen && (
                <div
                    id="mini-iris-diagnostics"
                    style={{
                        position: 'fixed',
                        top: '10px',
                        right: '58px',
                        width: 'min(300px, calc(100vw - 78px))',
                        maxHeight: 'calc(100vh - 110px)',
                        overflowY: 'auto',
                        background: 'rgba(8, 12, 14, 0.94)',
                        color: '#d8fdfd',
                        border: '1px solid rgba(126, 249, 255, 0.35)',
                        borderRadius: '8px',
                        zIndex: 2000002,
                        pointerEvents: 'auto',
                        fontFamily: 'inherit',
                        fontSize: '11px',
                        lineHeight: 1.35,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.42)',
                    }}
                >
                    <div style={{ display: 'grid', gap: '7px', padding: '8px 10px', borderBottom: '1px solid rgba(126, 249, 255, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#7ef9ff', fontSize: '12px' }}>Diagnostics</strong>
                            <button
                                type="button"
                                onClick={() => setDiagnosticsOpen(false)}
                                aria-label="Close diagnostics"
                                title="Close diagnostics"
                                style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.06)', color: '#d8fdfd', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '4px', font: 'inherit', fontSize: '18px', lineHeight: 1, cursor: 'pointer' }}
                            >
                                x
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <button
                                type="button"
                                onClick={copyBenchLine}
                                title="Copy the one-line Mini-IRIS bench summary"
                                style={{ background: 'rgba(0,255,255,0.12)', color: '#7ef9ff', border: '1px solid rgba(126,249,255,0.35)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: 'pointer' }}
                            >
                                Copy Bench
                            </button>
                            <button
                                type="button"
                                onClick={onRunBenchBatch}
                                disabled={benchBatchRunning}
                                title="Run compact z14/z8 pan and zoom benchmark batch"
                                style={{ background: 'rgba(0,255,255,0.12)', color: benchBatchRunning ? '#617171' : '#7ef9ff', border: '1px solid rgba(126,249,255,0.35)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: benchBatchRunning ? 'default' : 'pointer' }}
                            >
                                {benchBatchRunning ? 'Batch Running' : 'Run Batch'}
                            </button>
                            <button
                                type="button"
                                onClick={copyBenchBatch}
                                disabled={!benchBatchReport}
                                title={benchBatchReport ? 'Copy the last Mini-IRIS benchmark batch report' : 'No benchmark batch captured'}
                                style={{ background: 'rgba(0,255,255,0.08)', color: !benchBatchReport ? '#617171' : '#7ef9ff', border: '1px solid rgba(126,249,255,0.25)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: !benchBatchReport ? 'default' : 'pointer' }}
                            >
                                Copy Batch
                            </button>
                            <button
                                type="button"
                                onClick={copyEventLog}
                                disabled={events.length === 0}
                                title={events.length === 0 ? 'No diagnostics events captured' : 'Copy recent diagnostics event log'}
                                style={{ background: 'rgba(0,255,255,0.08)', color: events.length === 0 ? '#617171' : '#7ef9ff', border: '1px solid rgba(126,249,255,0.25)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: events.length === 0 ? 'default' : 'pointer' }}
                            >
                                Copy Log
                            </button>
                            <button
                                type="button"
                                onClick={copyPlextRaw}
                                disabled={!plextDebugSnapshot}
                                title={plextDebugSnapshot ? `Copy raw getPlexts response captured at ${plextDebugSnapshot.capturedAt}` : 'No COMM payload captured'}
                                style={{ background: 'rgba(0,255,255,0.08)', color: !plextDebugSnapshot ? '#617171' : '#7ef9ff', border: '1px solid rgba(126,249,255,0.25)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: !plextDebugSnapshot ? 'default' : 'pointer' }}
                            >
                                Copy COMM Raw
                            </button>
                            <button
                                type="button"
                                onClick={copyPlextParsed}
                                disabled={!plextDebugSnapshot}
                                title={plextDebugSnapshot ? `Copy parsed COMM summary and refresh hints from ${plextDebugSnapshot.capturedAt}` : 'No COMM payload captured'}
                                style={{ background: 'rgba(0,255,255,0.08)', color: !plextDebugSnapshot ? '#617171' : '#7ef9ff', border: '1px solid rgba(126,249,255,0.25)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: !plextDebugSnapshot ? 'default' : 'pointer' }}
                            >
                                Copy COMM Summary
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 10px', padding: '9px 10px' }}>
                        <span>Mode</span><span>{liveMode ? 'Live' : `Mock ${patternMode}`}</span>
                        <span>Location</span><span>Z{zoom.toFixed(2)} / {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                        <span>Entities</span><span>P {formatDiagnosticCount(entityCounts.portals)} / L {formatDiagnosticCount(entityCounts.links)} / F {formatDiagnosticCount(entityCounts.fields)}</span>
                        <span>Players</span><span>{formatDiagnosticCount(entityCounts.players)}</span>
                        <span>Viewport</span><span>P {formatDiagnosticCount(renderStats?.portalCount)} / L {formatDiagnosticCount(renderStats?.linkCount)} / F {formatDiagnosticCount(renderStats?.fieldCount)}</span>
                        <span>Rendered</span><span>{formatDiagnosticCount(renderStats?.totalFeatures)}</span>
                        <span>Keys</span><span>{formatDiagnosticCount(renderStats?.keyLabelCount)}</span>
                        <span>Query</span><span>{formatDiagnosticCount(renderStats?.queryItemCount)}</span>
                        <span>Render</span><span>{formatDiagnosticMs(renderStats?.renderMs)}</span>
                        <span>Frame</span><span>{formatDiagnosticMs(frameStats.avgMs)} avg / {formatDiagnosticMs(frameStats.maxMs)} max</span>
                        <span>FPS</span><span>{frameStats.fps} ({frameStats.slowFrames}/{frameStats.sampleCount} slow)</span>
                        <span>Network</span><span>{activeCount}A / {cooldownCount}C / {errorCount}E / {freshCount}F</span>
                        <span>Toggles</span><span>LVL {portalLevelColorEnabled ? 'on' : 'off'} / HP {portalHealthColorEnabled ? 'on' : 'off'} / KEY {keyOverlayEnabled ? 'on' : 'off'} / 3D {extrusionEnabled ? 'on' : 'off'}</span>
                    </div>
                    <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(126, 249, 255, 0.14)', color: '#9fb8b8', overflowWrap: 'anywhere', fontFamily: MINI_IRIS_MONO_FONT, fontSize: '10px', lineHeight: 1.35 }}>
                        {benchLine}
                    </div>
                    {benchBatchReport && (
                        <textarea
                            readOnly
                            value={benchBatchReport}
                            style={{ display: 'block', width: 'calc(100% - 20px)', minHeight: '92px', maxHeight: '160px', margin: '8px 10px', padding: '6px', resize: 'vertical', boxSizing: 'border-box', background: 'rgba(0,0,0,0.38)', color: '#d8fdfd', border: '1px solid rgba(126,249,255,0.2)', borderRadius: '4px', fontFamily: MINI_IRIS_MONO_FONT, fontSize: '10px', lineHeight: 1.35 }}
                        />
                    )}
                    {entries.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 10px', borderTop: '1px solid rgba(126, 249, 255, 0.14)' }}>
                            {entries.map(([endpoint, entry]) => (
                                <span
                                    key={endpoint}
                                    style={{ ...endpointBadgeStyle(entry), padding: '2px 7px', borderRadius: '999px' }}
                                >
                                    {endpointLabel(endpoint)} {formatCompactEndpointStateLabel(entry)}
                                </span>
                            ))}
                        </div>
                    )}
                    {events.length > 0 && (
                        <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '8px 10px', borderTop: '1px solid rgba(126, 249, 255, 0.14)', color: '#7ef9ff', fontFamily: MINI_IRIS_MONO_FONT, fontSize: '10px', lineHeight: 1.35 }}>
                            {events.map((e, i) => (
                                <div key={`${e.time}-${i}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>[{e.time}] {e.msg}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bottom: Data & Profile Dock */}
            <DataDock 
                openDrawer={openDrawer} 
                onToggle={toggleDrawer} 
                commTab={activeTab}
                onCommTabChange={setActiveTab}
                onPortalClick={onPortalClick}
                plextBounds={plextBounds}
                playerHistories={playerHistories}
                selected={selected}
            />

        </Fragment>
    );
}
