import { h, JSX, Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {formatCompactEndpointStateLabel, getCompactEndpointStateKind, type Field, type Link, type Portal, type PlextRequestBounds} from '@iris/core';
import type { PlayerHistory } from './usePlayerTracker';
import { MapTools } from './MapTools';
import { DataDock } from './DataDock';
import { useComm } from './useComm';
import type { EndpointName, EndpointTelemetry } from './useEndpointTelemetry';
import type { PortalHistoryKey, PortalHistoryLayerState } from './portalHistory';
import type { MiniFrameStats, MiniRenderStats } from './diagnostics';
import { MINI_IRIS_MONO_FONT } from './typography';

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
    portalLevelColorEnabled: boolean;
    onPortalLevelColorToggle: () => void;
    portalHealthColorEnabled: boolean;
    onPortalHealthColorToggle: () => void;
    liveMode: boolean;
    patternMode: number;
    extrusionEnabled: boolean;
    renderStats: MiniRenderStats | null;
    frameStats: MiniFrameStats;
    entityCounts: {
        portals: number;
        links: number;
        fields: number;
        players: number;
    };
}

export function TacticalUI({ zoom, lat, lng, events, endpointTelemetry, plextBounds, playerHistories, selected, selectionDetailsRequestKey, onNav, onStyle, onMode, onPortalClick, onSelectionPanelOpen, onSelectionPanelClose, portalHistoryLayers, onPortalHistoryLayerToggle, keyOverlayEnabled, onKeyOverlayToggle, portalLevelColorEnabled, onPortalLevelColorToggle, portalHealthColorEnabled, onPortalHealthColorToggle, liveMode, patternMode, extrusionEnabled, renderStats, frameStats, entityCounts }: TacticalUIProps): JSX.Element {
    const [openDrawer, setOpenDrawer] = useState<string | null>(null);
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
                window.postMessage({ type: 'IRIS_SUBSCRIPTION_REQUEST' }, '*');
            } else if (id === 'inventory') {
                window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
            } else if (id === 'scores') {
                window.postMessage({ type: 'IRIS_GAME_SCORE_REQUEST' }, '*');
                window.postMessage({ type: 'IRIS_REGION_SCORE_REQUEST', lat, lng }, '*');
            } else if (id === 'comm') {
                refreshComm();
            }
        }
    };

    const formatMs = (value: number | null | undefined): string => {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
        return `${Math.round(value)}ms`;
    };

    const formatCount = (value: number | null | undefined): string => {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
        return value.toLocaleString();
    };

    const getBrowserLabel = (): string => {
        const userAgent = navigator.userAgent;
        const firefox = userAgent.match(/Firefox\/([0-9.]+)/);
        if (firefox) return `Firefox/${firefox[1]}`;
        const chrome = userAgent.match(/Chrome\/([0-9.]+)/);
        if (chrome) return `Chrome/${chrome[1]}`;
        const safari = userAgent.match(/Version\/([0-9.]+).*Safari\//);
        if (safari) return `Safari/${safari[1]}`;
        return 'Unknown';
    };

    const benchLine = [
        `MINI IRIS BENCH`,
        `browser ${getBrowserLabel()}`,
        `platform ${navigator.platform}`,
        `viewport ${window.innerWidth}x${window.innerHeight}`,
        `dpr ${window.devicePixelRatio.toFixed(2)}`,
        `z${zoom.toFixed(2)}`,
        liveMode ? 'mode live' : `mode mock${patternMode}`,
        `items ${formatCount(renderStats?.totalFeatures)}`,
        `P ${formatCount(renderStats?.portalCount)}`,
        `L ${formatCount(renderStats?.linkCount)}`,
        `F ${formatCount(renderStats?.fieldCount)}`,
        `keys ${formatCount(renderStats?.keyLabelCount)}`,
        `sources P ${formatCount(entityCounts.portals)} L ${formatCount(entityCounts.links)} F ${formatCount(entityCounts.fields)}`,
        `avg ${formatMs(frameStats.avgMs)}`,
        `max ${formatMs(frameStats.maxMs)}`,
        `fps ${frameStats.fps}`,
        `slow ${frameStats.slowFrames}/${frameStats.sampleCount}`,
        `render ${formatMs(renderStats?.renderMs)}`,
        `query ${formatCount(renderStats?.queryItemCount)}`,
        `toggles lvl ${portalLevelColorEnabled ? 'on' : 'off'} hp ${portalHealthColorEnabled ? 'on' : 'off'} keys ${keyOverlayEnabled ? 'on' : 'off'} 3d ${extrusionEnabled ? 'on' : 'off'}`,
    ].join(' | ');

    const copyBenchLine = (): void => {
        const write = navigator.clipboard?.writeText(benchLine);
        if (write) void write.catch(() => undefined);
    };

    return (
        <Fragment>
            {/* Top Right: Map Tools */}
            <MapTools
                openDrawer={openDrawer}
                onToggle={toggleDrawer}
                onNav={onNav}
                onStyle={onStyle}
                onMode={onMode}
                portalHistoryLayers={portalHistoryLayers}
                onPortalHistoryLayerToggle={onPortalHistoryLayerToggle}
                keyOverlayEnabled={keyOverlayEnabled}
                onKeyOverlayToggle={onKeyOverlayToggle}
                portalLevelColorEnabled={portalLevelColorEnabled}
                onPortalLevelColorToggle={onPortalLevelColorToggle}
                portalHealthColorEnabled={portalHealthColorEnabled}
                onPortalHealthColorToggle={onPortalHealthColorToggle}
            />

            {openDrawer === 'diagnostics' && (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 10px', borderBottom: '1px solid rgba(126, 249, 255, 0.2)' }}>
                        <strong style={{ color: '#7ef9ff', fontSize: '12px' }}>Diagnostics</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                type="button"
                                onClick={copyBenchLine}
                                style={{ background: 'rgba(0,255,255,0.12)', color: '#7ef9ff', border: '1px solid rgba(126,249,255,0.35)', borderRadius: '4px', padding: '4px 7px', font: 'inherit', cursor: 'pointer' }}
                            >
                                Copy
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpenDrawer(null)}
                                aria-label="Close diagnostics"
                                style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.06)', color: '#d8fdfd', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '4px', font: 'inherit', fontSize: '18px', lineHeight: 1, cursor: 'pointer' }}
                            >
                                x
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 10px', padding: '9px 10px' }}>
                        <span>Mode</span><span>{liveMode ? 'Live' : `Mock ${patternMode}`}</span>
                        <span>Camera</span><span>Z{zoom.toFixed(2)} / {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                        <span>Network</span><span>{activeCount}A / {cooldownCount}C / {errorCount}E / {freshCount}F</span>
                        <span>Sources</span><span>P {formatCount(entityCounts.portals)} / L {formatCount(entityCounts.links)} / F {formatCount(entityCounts.fields)}</span>
                        <span>Players</span><span>{formatCount(entityCounts.players)}</span>
                        <span>Visible</span><span>P {formatCount(renderStats?.portalCount)} / L {formatCount(renderStats?.linkCount)} / F {formatCount(renderStats?.fieldCount)}</span>
                        <span>Items</span><span>{formatCount(renderStats?.totalFeatures)}</span>
                        <span>Keys</span><span>{formatCount(renderStats?.keyLabelCount)}</span>
                        <span>Query</span><span>{formatCount(renderStats?.queryItemCount)}</span>
                        <span>Build</span><span>{formatMs(renderStats?.renderMs)}</span>
                        <span>Frame</span><span>{formatMs(frameStats.avgMs)} avg / {formatMs(frameStats.maxMs)} max</span>
                        <span>FPS</span><span>{frameStats.fps} ({frameStats.slowFrames}/{frameStats.sampleCount} slow)</span>
                        <span>Toggles</span><span>LVL {portalLevelColorEnabled ? 'on' : 'off'} / HP {portalHealthColorEnabled ? 'on' : 'off'} / KEY {keyOverlayEnabled ? 'on' : 'off'} / 3D {extrusionEnabled ? 'on' : 'off'}</span>
                    </div>
                    <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(126, 249, 255, 0.14)', color: '#9fb8b8', overflowWrap: 'anywhere', fontFamily: MINI_IRIS_MONO_FONT, fontSize: '10px', lineHeight: 1.35 }}>
                        {benchLine}
                    </div>
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
                        <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(126, 249, 255, 0.14)', color: '#7ef9ff' }}>
                            {events.slice(0, 6).map((e, i) => (
                                <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>[{e.time}] {e.msg}</div>
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
