import { h, JSX, Fragment } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@iris/core';
import { COLORS } from './MapConstants';

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
    const { gameScore, regionScore } = useStore();

    const toggleDrawer = (id: string): void => {
        setOpenDrawer(openDrawer === id ? null : id);
    };

    const formatMU = (val: number): string => {
        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
        return val.toString();
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
                
                {/* Scores Drawer */}
                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('scores')} style={{ width: '36px', height: '36px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>📊</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'scores' ? 'flex' : 'none', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(20,20,20,0.95)', borderRadius: '4px', border: '1px solid #00ffff', minWidth: '150px', color: '#fff', fontSize: '11px', fontFamily: 'monospace', pointerEvents: 'auto' }}>
                        
                        {/* Global Game Score */}
                        <div style={{ borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                            <div style={{ color: '#888', fontSize: '9px', marginBottom: '2px' }}>GLOBAL MU</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: COLORS.E }}>ENL: {gameScore ? formatMU(gameScore.enlightened) : '-'}</span>
                                <span style={{ color: COLORS.R }}>RES: {gameScore ? formatMU(gameScore.resistance) : '-'}</span>
                            </div>
                        </div>

                        {/* Region Score */}
                        {regionScore && (
                            <div>
                                <div style={{ color: '#888', fontSize: '9px', marginBottom: '2px' }}>REGION: {regionScore.regionName}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: COLORS.E }}>{formatMU(regionScore.gameScore[0])}</span>
                                    <span style={{ color: COLORS.R }}>{formatMU(regionScore.gameScore[1])}</span>
                                </div>
                                <div style={{ color: '#888', fontSize: '8px', borderTop: '1px solid #222', paddingTop: '4px' }}>TOP AGENTS</div>
                                {regionScore.topAgents.slice(0, 3).map((a, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: a.team === 'ENLIGHTENED' ? COLORS.E : COLORS.R }}>
                                        <span>{idx + 1}. {a.nick}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!regionScore && <div style={{ color: '#666', fontSize: '9px' }}>No regional data.</div>}
                    </div>
                </div>

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
