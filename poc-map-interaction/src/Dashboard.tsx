import { h, JSX } from 'preact';
import { Portal, Link, Field } from '@iris/core';

interface DashboardProps {
    type: string;
    data: Portal | Link | Field;
    colors: Record<string, string>;
    onClose: () => void;
}

export function Dashboard({ type, data, colors, onClose }: DashboardProps): JSX.Element {
    const teamKey = data.team;
    const teamColor = colors[teamKey] || '#fff';

    const renderPortal = (p: Portal): JSX.Element => {
        const resos = p.resonators || [];
        const mods = p.mods || [];
        const mitigationTotal = p.mitigation?.total ?? 0;

        return (
            <div style={{ display: 'block', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.9)', overflow: 'hidden' }}>
                {p.image && <div style={{ height: '100px', background: `url(${p.image}) center/cover`, borderBottom: `2px solid ${teamColor}` }}></div>}
                <div style={{ padding: '12px' }}>
                    <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{p.name || 'PORTAL'}</div>
                    <div style={{ color: '#888', fontSize: '10px', marginBottom: '12px' }}>Owner: {p.owner || (p.team === 'N' ? 'Neutral' : 'Unknown')}</div>
                    
                    {/* Stats Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', background: '#111', padding: '6px', borderRadius: '4px' }}>
                        <div><span style={{ color: '#666' }}>Level:</span> <span style={{ color: '#ff0' }}>{p.level || 0}</span></div>
                        <div><span style={{ color: '#666' }}>Defense:</span> <span style={{ color: '#0ff' }}>{mitigationTotal}</span></div>
                        <div><span style={{ color: '#666' }}>Health:</span> <span style={{ color: '#0f0' }}>{p.health ?? 0}%</span></div>
                    </div>

                    {/* Resonators (Compact Grid: R1-R8) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', marginBottom: '12px' }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const r = resos[i];
                            const label = r ? `R${r.level}` : '-';
                            const opacity = r ? 1 : 0.2;
                            return (
                                <div key={i} style={{ background: '#222', borderBottom: '2px solid #0f0', textAlign: 'center', fontSize: '9px', padding: '2px', opacity }}>{label}</div>
                            );
                        })}
                    </div>

                    {/* Mods (Abbreviated: VRS, VRHS, etc.) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                        {Array.from({ length: 4 }).map((_, i) => {
                            const m = mods[i];
                            let label = '-';
                            if (m) {
                                const rarity = m.rarity === 'VERY_RARE' ? 'VR' : (m.rarity === 'RARE' ? 'R' : 'C');
                                const shortName = m.name.split(' ').map((w: string) => w[0]).join('');
                                label = `${rarity}${shortName}`;
                            }
                            return (
                                <div key={i} style={{ background: '#151515', padding: '4px', borderLeft: '2px solid #b08cff', fontSize: '10px', opacity: m ? 1 : 0.2, textAlign: 'center' }}>{label}</div>
                            );
                        })}
                    </div>

                    {/* History */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <span style={{ border: `1px solid ${p.visited ? '#9b59b6' : '#333'}`, color: p.visited ? '#9b59b6' : '#444', padding: '2px 6px', borderRadius: '99px', fontSize: '9px' }}>V</span>
                        <span style={{ border: `1px solid ${p.captured ? '#e74c3c' : '#333'}`, color: p.captured ? '#e74c3c' : '#444', padding: '2px 6px', borderRadius: '99px', fontSize: '9px' }}>C</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div id="entity-details" style={{ position: 'fixed', top: '50px', left: '10px', width: '250px', color: '#fff', padding: '0', fontFamily: 'monospace', fontSize: '12px', zIndex: 1000007, pointerEvents: 'auto' }}>
            {type === 'portal' ? renderPortal(data as Portal) : (
                <div style={{ padding: '12px', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.9)' }}>
                    <div style={{ color: teamColor, fontWeight: 'bold', marginBottom: '8px' }}>{type.toUpperCase()} DETAILS</div>
                    <div>ID: {data.id}</div><div>Team: {data.team}</div>
                </div>
            )}
            <div style={{ padding: '12px', borderTop: '1px solid #222', textAlign: 'right', background: 'rgba(0,0,0,0.9)', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px', borderLeft: `1px solid ${teamColor}`, borderRight: `1px solid ${teamColor}`, borderBottom: `1px solid ${teamColor}` }}>
                <button 
                    id="close-details" 
                    onClick={onClose}
                    style={{ background: '#222', color: '#eee', border: '1px solid #555', padding: '4px 12px', cursor: 'pointer', fontSize: '10px', borderRadius: '3px' }}
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
}
