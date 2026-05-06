import { h, JSX } from 'preact';
import { EntityLogic, Portal, Link, Field } from '@iris/core';

interface DashboardProps {
    type: string;
    data: Portal | Link | Field;
    colors: Record<string, string>;
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

export function Dashboard({ type, data, colors }: DashboardProps): JSX.Element {
    const teamKey = data.team;
    const teamColor = colors[teamKey] || '#fff';

    const renderPortal = (p: Portal): JSX.Element => {
        const resos = p.resonators || [];
        const mods = p.mods || [];
        const mitigationTotal = p.mitigation?.total ?? 0;
        
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const r = resos[i];
                            const level = r?.level || 0;
                            const energyPct = r ? (r.energy / (level > 0 ? (level * 1000) : 1000)) * 100 : 0;
                            const color = LEVEL_COLORS[level] || '#333';
                            return (
                                <div key={i} style={{ background: '#1a1a1a', border: `1px solid ${color}44`, padding: '4px 2px', position: 'relative', minHeight: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: color, fontSize: '10px', fontWeight: 'bold', zIndex: 1 }}>{r ? `R${level}` : '-'}</span>
                                    {r && <div style={{ fontSize: '7px', fontWeight: 'normal', color: '#888', marginTop: '1px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 1 }}>{r.owner}</div>}
                                    {r && <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: '#0f0', width: `${Math.min(100, energyPct)}%` }}></div>}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' }}>
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
                                <div key={i} style={{ background: '#1a1a1a', border: `1px solid ${color}44`, padding: '4px 2px', fontSize: '9px', color: color, textAlign: 'center', minHeight: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: m ? 'bold' : 'normal' }}>
                                    <div>{label}</div>
                                    {m && <div style={{ fontSize: '7px', fontWeight: 'normal', color: '#888', marginTop: '1px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.owner}</div>}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #222', marginTop: '10px', paddingTop: '10px' }}>
                        <span style={{ border: `1px solid ${p.visited ? '#9b59b6' : '#333'}`, color: p.visited ? '#9b59b6' : '#444', padding: '1px 6px', borderRadius: '99px', fontSize: '9px', fontWeight: p.visited ? 'bold' : 'normal' }}>VISITED</span>
                        <span style={{ border: `1px solid ${p.captured ? '#e74c3c' : '#333'}`, color: p.captured ? '#e74c3c' : '#444', padding: '1px 6px', borderRadius: '99px', fontSize: '9px', fontWeight: p.captured ? 'bold' : 'normal' }}>CAPTURED</span>
                        <span style={{ border: `1px solid ${p.scanned ? '#00d9ff' : '#333'}`, color: p.scanned ? '#00d9ff' : '#444', padding: '1px 6px', borderRadius: '99px', fontSize: '9px', fontWeight: p.scanned ? 'bold' : 'normal' }}>SCANNED</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderField = (field: Field): JSX.Element => {
        const estimatedMU = calculateEstimatedFieldMu(field);
        return (
            <div style={{ padding: '12px', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.95)', boxShadow: `0 0 10px ${teamColor}44` }}>
                <div style={{ color: teamColor, fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>FIELD DETAILS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                    <div style={{ background: '#111', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>TEAM</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{field.team}</div>
                    </div>
                    <div style={{ background: '#111', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>EST. MU</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{estimatedMU.toLocaleString()}</div>
                    </div>
                </div>
                <div style={{ background: '#111', padding: '6px', borderRadius: '4px', fontSize: '11px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{field.id.slice(0, 12)}...</span>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid #222', paddingTop: '8px' }}>
                    <div style={{ color: '#666', fontSize: '9px', fontWeight: 'bold', marginBottom: '5px' }}>ANCHORS</div>
                    {field.points.map((point, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: '#aaa', padding: '2px 0' }}>
                            <span>Anchor {index + 1}</span>
                            <span style={{ color: '#ccc' }}>{point.portalId?.slice(0, 10) || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLink = (link: Link): JSX.Element => {
        const distKm = EntityLogic.getDistKm(link.fromLat, link.fromLng, link.toLat, link.toLng);
        const distStr = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(2)}km`;
        return (
            <div style={{ padding: '12px', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.95)', boxShadow: `0 0 10px ${teamColor}44` }}>
                <div style={{ color: teamColor, fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>LINK DETAILS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                    <div style={{ background: '#111', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>TEAM</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{link.team}</div>
                    </div>
                    <div style={{ background: '#111', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>LENGTH</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{distStr}</div>
                    </div>
                </div>
                <div style={{ background: '#111', padding: '6px', borderRadius: '4px', fontSize: '11px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{link.id.slice(0, 12)}...</span>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid #222', paddingTop: '8px' }}>
                    <div style={{ color: '#666', fontSize: '9px', fontWeight: 'bold', marginBottom: '5px' }}>ANCHORS</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: '#aaa', padding: '2px 0' }}>
                        <span>From</span>
                        <span style={{ color: '#ccc' }}>{link.fromPortalId.slice(0, 10)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: '#aaa', padding: '2px 0' }}>
                        <span>To</span>
                        <span style={{ color: '#ccc' }}>{link.toPortalId.slice(0, 10)}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div id="entity-details" style={{ color: '#fff', padding: '0', fontFamily: 'monospace', fontSize: '12px', pointerEvents: 'auto' }}>
            {type === 'portal' ? renderPortal(data as Portal) : type === 'field' ? renderField(data as Field) : type === 'link' ? renderLink(data as Link) : (
                <div style={{ padding: '12px', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.95)', boxShadow: `0 0 10px ${teamColor}44` }}>
                    <div style={{ color: teamColor, fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>{type.toUpperCase()} DETAILS</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#111', padding: '6px', borderRadius: '4px', fontSize: '11px' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{(data as Portal | Link | Field).id.slice(0, 12)}...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function calculateEstimatedFieldMu(field: Field): number {
    if (field.points.length < 3) return 0;
    const [p1, p2, p3] = field.points;
    const area = Math.abs(
        p1.lng * (p2.lat - p3.lat) +
        p2.lng * (p3.lat - p1.lat) +
        p3.lng * (p1.lat - p2.lat)
    ) / 2;

    return Math.max(1, Math.round(area * 1000000));
}
