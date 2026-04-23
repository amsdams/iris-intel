import { h, JSX } from 'preact';
import { useMemo } from 'preact/hooks';
import { useStore, InventoryParser, Plext, normalizeTeam } from '@iris/core';
import { COLORS, RARITY_COLORS, ITEM_LEVEL_COLORS } from './MapConstants';
import { formatMU, formatAP } from './GeoUtils';
import { CommTab } from './useComm';

interface DataDockProps {
    openDrawer: string | null;
    onToggle: (id: string) => void;
    commTab: CommTab;
    onCommTabChange: (tab: CommTab) => void;
    onPortalClick: (lat: number, lng: number, name: string) => void;
}

export function DataDock({ openDrawer, onToggle, commTab, onCommTabChange, onPortalClick }: DataDockProps): JSX.Element {
    const { gameScore, regionScore, playerStats, hasSubscription, inventory, plexts } = useStore();

    // 1. Inventory Stats
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

    // 2. COMM Filtering
    const filteredPlexts = useMemo(() => {
        if (commTab === 'all') return plexts;
        if (commTab === 'faction') return plexts.filter(p => p.type === 'PLAYER_GENERATED' || p.categories === 2); // Simplified
        if (commTab === 'alerts') return plexts.filter(p => p.type === 'SYSTEM_NARROWCAST');
        return plexts;
    }, [plexts, commTab]);

    const renderPlextMarkup = (p: Plext) => {
        return p.markup.map((m, i) => {
            const [type, data] = m;
            const text = data.plain || '';
            const team = normalizeTeam(data.team);
            const color = team !== 'N' ? (COLORS[team as keyof typeof COLORS] || '#ccc') : '#ccc';
            
            if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
                return <span key={i} style={{ color, fontWeight: 'bold' }}>{text}</span>;
            }
            if (type === 'PORTAL') {
                const lat = (data.latE6 || 0) / 1e6;
                const lng = (data.lngE6 || 0) / 1e6;
                return (
                    <span 
                        key={i} 
                        onClick={() => onPortalClick(lat, lng, data.name || text)}
                        style={{ color: '#00ffff', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        {text}
                    </span>
                );
            }
            return <span key={i} style={{ color: '#bbb' }}>{text}</span>;
        });
    };

    return (
        <div id="data-dock-orchestrator">
            {/* PANELS */}
            <div id="data-panel-container" style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 2000002, pointerEvents: 'none' }}>
                
                {/* COMM Panel */}
                <div style={{ display: openDrawer === 'comm' ? 'flex' : 'none', flexDirection: 'column', background: 'rgba(10,10,10,0.95)', border: '1px solid #00ffff', borderRadius: '12px', height: '400px', color: '#fff', boxShadow: '0 -5px 20px rgba(0,0,0,0.8)', pointerEvents: 'auto', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
                        {(['all', 'faction', 'alerts'] as CommTab[]).map(t => (
                            <div key={t} onClick={() => onCommTabChange(t)} style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', background: commTab === t ? 'rgba(0,255,255,0.1)' : 'transparent', color: commTab === t ? '#00ffff' : '#666', borderBottom: commTab === t ? '2px solid #00ffff' : 'none' }}>
                                {t.toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column-reverse', gap: '8px' }}>
                        {filteredPlexts.map(p => (
                            <div key={p.id} style={{ fontSize: '11px', lineHeight: '1.4', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px' }}>
                                <span style={{ color: '#555', marginRight: '6px', fontSize: '9px' }}>{new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {renderPlextMarkup(p)}
                            </div>
                        ))}
                        {filteredPlexts.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#444' }}>No messages in {commTab}.</div>}
                    </div>
                </div>

                {/* Player Stats Panel */}
                <div style={{ display: openDrawer === 'player' ? 'block' : 'none', background: 'rgba(10,10,10,0.95)', border: '1px solid #00ffff', borderRadius: '12px', padding: '15px', color: '#fff', boxShadow: '0 -5px 20px rgba(0,0,0,0.8)', pointerEvents: 'auto' }}>
                    {playerStats ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ color: COLORS[normalizeTeam(playerStats.team) as keyof typeof COLORS] || '#fff', fontWeight: 'bold', fontSize: '16px' }}>{playerStats.nickname}</span>
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
                                            background: COLORS[normalizeTeam(playerStats.team) as keyof typeof COLORS] || '#00ffff',
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

            {/* DOCK BAR */}
            <div id="bottom-dock" style={{ position: 'fixed', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '15px', padding: '8px 20px', background: 'rgba(20,20,20,0.9)', borderRadius: '30px', border: '1px solid #00ffff', zIndex: 2000003, pointerEvents: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                <div className="dock-item" onClick={() => onToggle('player')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'player' ? 1 : 0.6, transition: 'opacity 0.2s' }}>👤</div>
                <div className="dock-item" onClick={() => onToggle('inventory')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'inventory' ? 1 : 0.6, transition: 'opacity 0.2s' }}>🎒</div>
                <div className="dock-item" onClick={() => onToggle('comm')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'comm' ? 1 : 0.6, transition: 'opacity 0.2s' }}>💬</div>
                <div className="dock-item" onClick={() => onToggle('scores')} style={{ fontSize: '24px', cursor: 'pointer', opacity: openDrawer === 'scores' ? 1 : 0.6, transition: 'opacity 0.2s' }}>📊</div>
            </div>
        </div>
    );
}
