import { h, JSX, Fragment } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { MapTools } from './MapTools';
import { DataDock } from './DataDock';
import { useComm } from './useComm';

interface EventLogEntry {
    time: string;
    msg: string;
}

interface TacticalUIProps {
    zoom: number;
    lat: number;
    lng: number;
    events: EventLogEntry[];
    onNav: (action: string) => void;
    onStyle: (style: string) => void;
    onMode: (mode: string) => void;
}

export function TacticalUI({ zoom, lat, lng, events, onNav, onStyle, onMode }: TacticalUIProps): JSX.Element {
    const [openDrawer, setOpenDrawer] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);
    
    // Live mode is assumed true if we are in this UI for now, 
    // but we can pass it from props if needed.
    const { activeTab, setActiveTab, refreshComm } = useComm(true, true);

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
                window.postMessage({ type: 'IRIS_REGION_SCORE_REQUEST' }, '*');
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
