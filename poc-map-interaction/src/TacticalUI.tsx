import { h, JSX, Fragment } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

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

    const toggleDrawer = (id: string): void => {
        setOpenDrawer(openDrawer === id ? null : id);
    };

    return (
        <Fragment>
            {/* Position Log */}
            <div id="pos-log" style={{ position: 'fixed', top: '10px', left: '10px', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '4px 8px', fontFamily: 'monospace', fontSize: '11px', borderRadius: '4px', zIndex: 1000006, border: '1px solid #888', pointerEvents: 'none', display: 'block' }}>
                Z: {zoom.toFixed(2)} | {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>

            {/* Event Log */}
            <div id="event-log" ref={logRef} style={{ position: 'fixed', bottom: '10px', left: '10px', right: '10px', height: '100px', background: 'rgba(0,0,0,0.85)', color: '#00ffff', overflowY: 'auto', zIndex: 2000000, fontFamily: 'monospace', padding: '10px', fontSize: '11px', border: '1px solid #00ffff', pointerEvents: 'none', borderRadius: '4px', opacity: 0.8, display: 'block' }}>
                {events.map((e, i) => (
                    <div key={i}>[{e.time}] {e.msg}</div>
                ))}
            </div>

            {/* Control Drawers */}
            <div id="debug-btns-container" style={{ position: 'fixed', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 2000001, pointerEvents: 'none' }}>
                
                {/* Navigation Drawer */}
                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('nav')} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🧭</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'nav' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.8)', borderRadius: '4px', border: '1px solid #00ffff' }}>
                        {['+', '-', '↑', '↓', '←', '→', 'R'].map(l => (
                            <div key={l} className="debug-btn" onClick={() => onNav(l)} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l}</div>
                        ))}
                    </div>
                </div>

                {/* Style Drawer */}
                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('style')} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🎨</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'style' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.8)', borderRadius: '4px', border: '1px solid #00ffff' }}>
                        {['Dark', 'Light', 'Voyager', 'OSM'].map(l => (
                            <div key={l} className="debug-btn" onClick={() => onStyle(l)} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l[0]}</div>
                        ))}
                    </div>
                </div>

                {/* Mode Drawer */}
                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('mode')} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🛠</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'mode' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.8)', borderRadius: '4px', border: '1px solid #00ffff' }}>
                        <div className="debug-btn" onClick={() => onMode('3D')} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>3D</div>
                        <div className="debug-btn" onClick={() => onMode('Src')} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>Src</div>
                    </div>
                </div>

            </div>
        </Fragment>
    );
}
