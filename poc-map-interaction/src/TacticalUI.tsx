import { h, JSX, Fragment } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { MapTools } from './MapTools';
import { DataDock } from './DataDock';
import { useComm } from './useComm';
import type { EndpointName, EndpointTelemetry } from './useEndpointTelemetry';
import type { PlextRequestBounds } from './plextRequests';

interface EventLogEntry {
    time: string;
    msg: string;
}

interface TacticalUIProps {
    zoom: number;
    lat: number;
    lng: number;
    events: EventLogEntry[];
    endpointTelemetry: Partial<Record<EndpointName, EndpointTelemetry>>;
    plextBounds: PlextRequestBounds | null;
    onNav: (action: string) => void;
    onStyle: (style: string) => void;
    onMode: (mode: string) => void;
    onPortalClick: (lat: number, lng: number, name: string) => void;
}

export function TacticalUI({ zoom, lat, lng, events, endpointTelemetry, plextBounds, onNav, onStyle, onMode, onPortalClick }: TacticalUIProps): JSX.Element {
    const [openDrawer, setOpenDrawer] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);
    
    const { activeTab, setActiveTab, refreshComm } = useComm(true, true, plextBounds);

    const formatDelay = (ms: number | null | undefined): string => {
        if (typeof ms !== 'number' || !Number.isFinite(ms)) return '';
        const diff = Math.max(0, ms - Date.now());
        const seconds = Math.ceil(diff / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;
        return `${minutes}m ${rest}s`;
    };

    const formatCompactDelay = (ms: number | null | undefined): string => {
        const value = formatDelay(ms);
        return value ? ` ${value}` : '';
    };

    const entries = (Object.entries(endpointTelemetry) as [EndpointName, EndpointTelemetry | undefined][])
        .filter(([, value]) => !!value);
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

    const endpointStateKind = (entry: EndpointTelemetry): 'active' | 'error' | 'cooldown' | 'fresh' | 'idle' => {
        if (entry.status === 'in_flight') return 'active';
        if (entry.status === 'error') return 'error';
        if (entry.cooldownUntil !== null && entry.cooldownUntil > Date.now()) return 'cooldown';
        if (entry.lastSkipReason === 'fresh') return 'fresh';
        return 'idle';
    };

    const endpointStateLabel = (entry: EndpointTelemetry): string => {
        const kind = endpointStateKind(entry);
        switch (kind) {
            case 'active':
                return `A${entry.inFlightCount > 1 ? `x${entry.inFlightCount}` : ''}`;
            case 'error':
                return `E${formatCompactDelay(entry.cooldownUntil)}`;
            case 'cooldown':
                return `C${formatCompactDelay(entry.cooldownUntil)}`;
            case 'fresh':
                return `F${formatCompactDelay(entry.nextRefreshAt)}`;
            case 'idle':
                return 'I';
        }
    };

    const endpointBadgeStyle = (entry: EndpointTelemetry): Record<string, string> => {
        const kind = endpointStateKind(entry);
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
        const isOpening = openDrawer !== id;
        setOpenDrawer(isOpening ? id : null);

        if (isOpening) {
            if (id === 'player') {
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

    return (
        <Fragment>
            {/* Position Log */}
            <div id="pos-log" style={{ position: 'fixed', top: '10px', left: '10px', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '4px 8px', fontFamily: 'monospace', fontSize: '11px', borderRadius: '4px', zIndex: 1000006, border: '1px solid #888', pointerEvents: 'none' }}>
                Z: {zoom.toFixed(2)} | {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>

            <div id="queue-strip" style={{ position: 'fixed', top: '34px', left: '10px', right: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', zIndex: 1000005, pointerEvents: 'none', fontFamily: 'monospace', fontSize: '10px' }}>
                <span style={{ background: 'rgba(8, 28, 28, 0.96)', color: '#7ef9ff', padding: '2px 7px', borderRadius: '999px', border: '1px solid rgba(126, 249, 255, 0.24)', letterSpacing: '0.02em' }}>
                    Q {activeCount}A {cooldownCount}C {errorCount}E {freshCount}F
                </span>
                {entries.map(([endpoint, entry]) => (
                    <span
                        key={endpoint}
                        style={{ ...endpointBadgeStyle(entry!), padding: '2px 7px', borderRadius: '999px' }}
                    >
                        {endpointLabel(endpoint)} {endpointStateLabel(entry!)}
                    </span>
                ))}
            </div>

            {/* Top Right: Map Tools */}
            <MapTools 
                openDrawer={openDrawer} 
                onToggle={toggleDrawer} 
                onNav={onNav} 
                onStyle={onStyle} 
                onMode={onMode} 
            />

            {/* Bottom: Data & Profile Dock */}
            <DataDock 
                openDrawer={openDrawer} 
                onToggle={toggleDrawer} 
                commTab={activeTab}
                onCommTabChange={setActiveTab}
                onPortalClick={onPortalClick}
                plextBounds={plextBounds}
            />

            {/* Event Log */}
            <div id="event-log" ref={logRef} style={{ position: 'fixed', bottom: '85px', left: '10px', right: '10px', height: '60px', background: 'rgba(0,0,0,0.7)', color: '#00ffff', overflowY: 'auto', zIndex: 2000000, fontFamily: 'monospace', padding: '8px', fontSize: '10px', border: '1px solid rgba(0,255,255,0.3)', pointerEvents: 'none', borderRadius: '4px', opacity: 0.6 }}>
                {events.map((e, i) => (
                    <div key={i}>[{e.time}] {e.msg}</div>
                ))}
            </div>
        </Fragment>
    );
}
