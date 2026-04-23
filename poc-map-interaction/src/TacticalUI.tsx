import { h, JSX, Fragment } from 'preact';
import { useState, useRef, useMemo } from 'preact/hooks';
import { useStore, InventoryParser } from '@iris/core';
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

const RARITY_COLORS: Record<string, string> = {
    'COMMON': '#49EBC3',
    'RARE': '#B68BFF',
    'VERY_RARE': '#F781FF'
};

const ITEM_LEVEL_COLORS: Record<number, string> = {
    1: '#FECE5A', 2: '#FFA630', 3: '#FF7315', 4: '#E80000',
    5: '#FF0099', 6: '#EE26CD', 7: '#C124E0', 8: '#9627F4'
};

export function TacticalUI({ zoom, lat, lng, events, onNav, onStyle, onMode }: TacticalUIProps): JSX.Element {
    const [openDrawer, setOpenDrawer] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const { gameScore, regionScore, playerStats, hasSubscription, inventory } = useStore();

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
            }
        }
    };

    const formatMU = (val: number): string => {
        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
        return val.toString();
    };

    const formatAP = (val: number): string => {
        return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Inventory Processing
    const derivedItems = useMemo(() => {
        if (!inventory || inventory.length === 0) return [];
        return InventoryParser.deriveInventoryDisplayItems(inventory);
    }, [inventory]);

    const inventoryStats = useMemo(() => {
        const stats: Record<string, { count: number, color: string }> = {};
        derivedItems.forEach(item => {
            const cat = item.category;
            if (!stats[cat]) {
                stats[cat] = { count: 0, color: '#aaa' };
                if (cat === 'RESONATORS') stats[cat].color = ITEM_LEVEL_COLORS[8];
                if (cat === 'WEAPONS') stats[cat].color = ITEM_LEVEL_COLORS[4];
                if (cat === 'MODS') stats[cat].color = RARITY_COLORS['VERY_RARE'];
                if (cat === 'KEYS') stats[cat].color = '#f1c40f';
            }
            stats[cat].count++;
        });
        return stats;
    }, [derivedItems]);

    return (
        <Fragment>
            {/* 1. TOP LEFT: Position Log */}
            <div id="pos-log" style={{ position: 'fixed', top: '10px', left: '10px', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '4px 8px', fontFamily: 'monospace', fontSize: '11px', borderRadius: '4px', zIndex: 1000006, border: '1px solid #888', pointerEvents: 'none' }}>
                Z: {zoom.toFixed(2)} | {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>

            {/* 2. TOP RIGHT: Map Tools */}
            <div id="map-tools-container" style={{ position: 'fixed', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 2000001, pointerEvents: 'none' }}>
                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('nav')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 0 10px rgba(0,255,255,0.2)' }}>🧭</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'nav' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                        {['+', '-', '↑', '↓', '←', '→', 'R'].map(l => (
                            <div key={l} className="debug-btn" onClick={() => onNav(l)} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l}</div>
                        ))}
                    </div>
                </div>

                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('style')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🎨</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'style' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                        {['Dark', 'Light', 'Voyager', 'OSM'].map(l => (
                            <div key={l} className="debug-btn" onClick={() => onStyle(l)} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l[0]}</div>
                        ))}
                    </div>
                </div>

                <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="debug-btn" onClick={() => toggleDrawer('mode')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🛠</div>
                    <div className="drawer-content" style={{ display: openDrawer === 'mode' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                        <div className="debug-btn" onClick={() => onMode('3D')} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>3D</div>
                        <div className="debug-btn" onClick={() => onMode('Src')} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>Src</div>
                    </div>
                </div>
            </div>

            {/* 3. DATA PANELS */}
            <div id="data-panel-container" style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 2000002, pointerEvents: 'none' }}>
                
                {/* Player Stats Panel */}
                <div style={{ display: openDrawer === 'player' ? 'block' : 'none', background: 'rgba(10,10,10,0.95)', border: '1px solid #00ffff', borderRadius: '12px', padding: '15px', color: '#fff', boxShadow: '0 -5px 20px rgba(0,0,0,0.8)', pointerEvents: 'auto' }}>
                    {playerStats ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ color: COLORS[playerStats.team as keyof typeof COLORS] || '#fff', fontWeight: 'bold', fontSize: '16px' }}>{playerStats.nickname}</span>
                                {hasSubscription && <span style={{ background: '#f1c40f', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>C.O.R.E.</span>}
                            </div>
                            <div style={{ background: '#1a1a1a', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#888', fontSize: '11px' }}>LEVEL {playerStats.level}</span>
                                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>{formatAP(playerStats.ap || 0)} AP</span>
                                </div>
                                {playerStats.min_ap_for_next_level && playerStats.min_ap_for_next_level > 0 ? (
                                    <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${Math.min(100, ((playerStats.ap || 0) - (playerStats.min_ap_for_current_level || 0)) / ((playerStats.min_ap_for_next_level || 0) - (playerStats.min_ap_for_current_level || 0)) * 100)}%`, 
                                            height: '100%', 
                                            background: COLORS[playerStats.team as keyof typeof COLORS] || '#00ffff',
                                            boxShadow: '0 0 10px rgba(0,255,255,0.5)'
                                        }}></div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>MAX LEVEL REACHED</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa' }}>
                                <span>XM: {playerStats.energy} / {playerStats.xm_capacity}</span>
                                <span>Invites: {playerStats.available_invites}</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Waiting for Intel data...</div>
                    )}
                </div>

                {/* Inventory Panel */}
                <div style={{ display: openDrawer === 'inventory' ? 'block' : 'none', background: 'rgba(10,10,10,0.95)', border: '1px solid #00ffff', borderRadius: '12px', padding: '15px', color: '#fff', boxShadow: '0 -5px 20px rgba(0,0,0,0.8)', pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#00ffff' }}>INVENTORY</span>
                        <span style={{ fontSize: '11px', color: '#888' }}>{derivedItems.length} ITEMS</span>
                    </div>
                    {inventory && inventory.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {Object.entries(inventoryStats).map(([cat, stat]) => (
                                <div key={cat} style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#888', fontSize: '10px' }}>{cat}</span>
                                    <span style={{ color: stat.color, fontWeight: 'bold', fontSize: '13px' }}>{stat.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                            {hasSubscription === false ? "C.O.R.E. Subscription Required" : "No inventory data yet."}
                        </div>
                    )}
                </div>

                {/* Scores Panel */}
                <div style={{ display: openDrawer === 'scores' ? 'block' : 'none', background: 'rgba(10,10,10,0.95)', border: '1px solid #00ffff', borderRadius: '12px', padding: '15px', color: '#fff', boxShadow: '0 -5px 20px rgba(0,0,0,0.8)', pointerEvents: 'auto' }}>
                    <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px', fontWeight: 'bold' }}>GLOBAL MU</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                            <span style={{ color: COLORS.E }}>ENL: {gameScore ? formatMU(gameScore.enlightened) : '-'}</span>
                            <span style={{ color: COLORS.R }}>RES: {gameScore ? formatMU(gameScore.resistance) : '-'}</span>
                        </div>
                    </div>
                    {regionScore && (
                        <div>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px', fontWeight: 'bold' }}>REGION: {regionScore.regionName}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: COLORS.E, fontSize: '13px' }}>{formatMU(regionScore.gameScore[0])}</span>
                                <span style={{ color: COLORS.R, fontSize: '13px' }}>{formatMU(regionScore.gameScore[1])}</span>
                            </div>
                            <div style={{ color: '#888', fontSize: '9px', borderTop: '1px solid #222', paddingTop: '8px', marginBottom: '5px' }}>TOP AGENTS</div>
                            {regionScore.topAgents.slice(0, 3).map((a, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: a.team === 'ENLIGHTENED' ? COLORS.E : COLORS.R, padding: '2px 0' }}>
                                    <span>{idx + 1}. {a.nick}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. BOTTOM DOCK */}
            <div id="bottom-dock" style={{ position: 'fixed', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '15px', padding: '8px 20px', background: 'rgba(20,20,20,0.9)', borderRadius: '30px', border: '1px solid #00ffff', zIndex: 2000003, pointerEvents: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                <div className="dock-item" onClick={() => toggleDrawer('player')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'player' ? 1 : 0.6, transition: 'opacity 0.2s' }}>👤</div>
                <div className="dock-item" onClick={() => toggleDrawer('inventory')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'inventory' ? 1 : 0.6, transition: 'opacity 0.2s' }}>🎒</div>
                <div className="dock-item" onClick={() => toggleDrawer('scores')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'scores' ? 1 : 0.6, transition: 'opacity 0.2s' }}>📊</div>
            </div>

            {/* 5. ABOVE DOCK: Event Log */}
            <div id="event-log" ref={logRef} style={{ position: 'fixed', bottom: '85px', left: '10px', right: '10px', height: '60px', background: 'rgba(0,0,0,0.7)', color: '#00ffff', overflowY: 'auto', zIndex: 2000000, fontFamily: 'monospace', padding: '8px', fontSize: '10px', border: '1px solid rgba(0,255,255,0.3)', pointerEvents: 'none', borderRadius: '4px', opacity: 0.6 }}>
                {events.map((e, i) => (
                    <div key={i}>[{e.time}] {e.msg}</div>
                ))}
            </div>
        </Fragment>
    );
}
