import { h, JSX } from 'preact';
import { Portal, Link, Field } from '@iris/core';

interface DashboardProps {
    type: string;
    data: Portal | Link | Field;
    colors: Record<string, string>;
    onClose: () => void;
}

const LEVEL_COLORS: Record<number, string> = {
    1: '#FECE5A', 2: '#FFA630', 3: '#FF7315', 4: '#E80000',
    5: '#FF0099', 6: '#EE26CD', 7: '#C124E0', 8: '#9627F4'
};

const MOD_COLORS: Record<string, string> = {
    'COMMON': '#49EBC3',
    'RARE': '#B68BFF',
    'VERY_RARE': '#F781FF'
};

export function Dashboard({ type, data, colors, onClose }: DashboardProps): JSX.Element {
    const teamKey = data.team;
    const teamColor = colors[teamKey] || '#fff';

    const renderPortal = (p: Portal): JSX.Element => {
        const resos = p.resonators || [];
        const mods = p.mods || [];
        const mitigationTotal = p.mitigation?.total ?? 0;
        
        // Calculate stickiness (simplified estimate based on common mod rules)
        let stickiness = 0;
        mods.forEach(m => {
            if (m.name.includes('Shield')) {
                if (m.rarity === 'VERY_RARE') stickiness += 80;
                else if (m.rarity === 'RARE') stickiness += 45;
                else stickiness += 15;
            }
        });

        return (
            <div style={{ display: 'block', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.95)', overflow: 'hidden', boxShadow: `0 0 10px ${teamColor}44` }}>
                {p.image && <div style={{ height: '100px', background: `url(${p.image}) center/cover`, borderBottom: `2px solid ${teamColor}` }}></div>}
                <div style={{ padding: '12px' }}>
                    <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>{p.name || 'PORTAL'}</div>
                    <div style={{ color: '#888', fontSize: '10px', marginBottom: '10px' }}>Owner: {p.owner || (p.team === 'N' ? 'Neutral' : 'Unknown')}</div>
                    
                    {/* Primary Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '10px' }}>
                        <div style={{ background: '#111', padding: '4px', textAlign: 'center', borderRadius: '2px' }}>
                            <div style={{ color: '#666', fontSize: '9px' }}>LEVEL</div>
                            <div style={{ color: LEVEL_COLORS[p.level || 1] || '#fff', fontWeight: 'bold' }}>{p.level || 0}</div>
                        </div>
                        <div style={{ background: '#111', padding: '4px', textAlign: 'center', borderRadius: '2px' }}>
                            <div style={{ color: '#666', fontSize: '9px' }}>HEALTH</div>
                            <div style={{ color: '#0f0', fontWeight: 'bold' }}>{p.health ?? 0}%</div>
                        </div>
                        <div style={{ background: '#111', padding: '4px', textAlign: 'center', borderRadius: '2px' }}>
                            <div style={{ color: '#666', fontSize: '9px' }}>RESOs</div>
                            <div style={{ color: teamColor, fontWeight: 'bold' }}>{p.resCount || 0}/8</div>
                        </div>
                    </div>

                    {/* Tactical Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                        <div style={{ background: '#111', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '2px' }}>
                            <span style={{ color: '#666', fontSize: '9px' }}>MITIGATION</span>
                            <span style={{ color: '#0ff', fontWeight: 'bold', fontSize: '11px' }}>{mitigationTotal}</span>
                        </div>
                        <div style={{ background: '#111', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '2px' }}>
                            <span style={{ color: '#666', fontSize: '9px' }}>STICKY</span>
                            <span style={{ color: '#f0f', fontWeight: 'bold', fontSize: '11px' }}>{stickiness}%</span>
                        </div>
                    </div>

                    {/* Resonators (Compact Grid: R1-R8 with Health Bars) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const r = resos[i];
                            const level = r?.level || 0;
                            const energyPct = r ? 100 : 0; // Simulated health
                            const color = LEVEL_COLORS[level] || '#333';
                            return (
                                <div key={i} style={{ background: '#1a1a1a', border: `1px solid ${color}44`, padding: '2px', position: 'relative', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: color, fontSize: '10px', fontWeight: 'bold', zIndex: 1 }}>{r ? `R${level}` : '-'}</span>
                                    {r && <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: '#0f0', width: `${energyPct}%` }}></div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Mods (1 Row, 4 Cols) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                        {Array.from({ length: 4 }).map((_, i) => {
                            const m = mods[i];
                            let label = '-';
                            let color = '#333';
                            if (m) {
                                const rarity = m.rarity === 'VERY_RARE' ? 'VR' : (m.rarity === 'RARE' ? 'R' : 'C');
                                const shortName = m.name.split(' ').map((w: string) => w[0]).join('');
                                label = `${rarity}${shortName}`;
                                color = MOD_COLORS[m.rarity] || '#fff';
                            }
                            return (
                                <div key={i} style={{ background: '#1a1a1a', border: `1px solid ${color}44`, padding: '4px 2px', fontSize: '9px', color: color, textAlign: 'center', minHeight: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: m ? 'bold' : 'normal' }}>
                                    {label}
                                </div>
                            );
                        })}
                    </div>

                    {/* History */}
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #222', marginTop: '10px', paddingTop: '10px' }}>
                        <span style={{ border: `1px solid ${p.visited ? '#9b59b6' : '#333'}`, color: p.visited ? '#9b59b6' : '#444', padding: '1px 6px', borderRadius: '99px', fontSize: '9px', fontWeight: p.visited ? 'bold' : 'normal' }}>VISITED</span>
                        <span style={{ border: `1px solid ${p.captured ? '#e74c3c' : '#333'}`, color: p.captured ? '#e74c3c' : '#444', padding: '1px 6px', borderRadius: '99px', fontSize: '9px', fontWeight: p.captured ? 'bold' : 'normal' }}>CAPTURED</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div id="entity-details" style={{ position: 'fixed', top: '50px', left: '10px', width: '250px', color: '#fff', padding: '0', fontFamily: 'monospace', fontSize: '12px', zIndex: 1000007, pointerEvents: 'auto' }}>
            {type === 'portal' ? renderPortal(data as Portal) : (
                <div style={{ padding: '12px', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.95)', boxShadow: `0 0 10px ${teamColor}44` }}>
                    <div style={{ color: teamColor, fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>{type.toUpperCase()} DETAILS</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#111', padding: '6px', borderRadius: '4px', fontSize: '11px' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{data.id.slice(0, 12)}...</span>
                    </div>
                </div>
            )}
            <div style={{ padding: '8px 12px', textAlign: 'right' }}>
                <button 
                    id="close-details" 
                    onClick={onClose}
                    style={{ background: '#222', color: '#eee', border: '1px solid #444', padding: '4px 12px', cursor: 'pointer', fontSize: '10px', borderRadius: '3px', fontWeight: 'bold' }}
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
}
