import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { EntityLogic, Portal, Link, Field } from '@iris/core';
import { INGRESS_COLORS, ITEM_LEVEL_COLORS, PORTAL_HISTORY_COLORS, RARITY_COLORS } from './MapConstants';

interface DashboardProps {
    type: string;
    data: Portal | Link | Field;
    colors: Record<string, string>;
    onClose?: () => void;
}

export function Dashboard({ type, data, colors, onClose }: DashboardProps): JSX.Element {
    const teamKey = data.team;
    const teamColor = colors[teamKey] || '#fff';
    const title = `${type.toUpperCase()} DETAILS`;
    const titleMeta = getTitleMeta(type, data);
    const [showOwners, setShowOwners] = useState(false);

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
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                    {p.image && (
                        <div
                            title="Open portal image"
                            onClick={() => window.open(p.image, '_blank', 'noopener,noreferrer')}
                            style={{ width: '56px', height: '46px', flexShrink: 0, cursor: 'pointer', border: `1px solid ${teamColor}66`, borderRadius: '4px', background: `url(${p.image}) center/cover`, boxShadow: `0 0 6px ${teamColor}33` }}
                        />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '13px', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'PORTAL'}</div>
                        <div style={{ color: '#aaa', fontSize: '10px', lineHeight: 1.25, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.owner || (p.team === 'N' ? 'Neutral' : 'Unknown')}</div>
                    </div>
                    <div style={{ color: ITEM_LEVEL_COLORS[p.level || 1] || teamColor, fontSize: '20px', lineHeight: 1, fontWeight: 'bold', flexShrink: 0 }}>L{p.level || 0}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {[
                        ['HEALTH', `${p.health ?? 0}%`, INGRESS_COLORS.ENLIGHTENED],
                        ['RES', `${p.resCount || 0}/8`, teamColor],
                        ['MIT', `${mitigationTotal}`, INGRESS_COLORS.XM],
                        ['STICKY', `${stickiness}%`, INGRESS_COLORS.TRACKER],
                    ].map(([label, value, color]) => (
                        <div key={label} style={{ background: '#111', padding: '4px 3px', textAlign: 'center', borderRadius: '3px', minWidth: 0 }}>
                            <div style={{ color: '#666', fontSize: '8px', lineHeight: 1.1 }}>{label}</div>
                            <div style={{ color, fontWeight: 'bold', fontSize: '11px', lineHeight: 1.25 }}>{value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px', marginBottom: '6px' }}>
                    {Array.from({ length: 8 }).map((_, i) => {
                        const r = resos[i];
                        const level = r?.level || 0;
                        const energyPct = r ? (r.energy / (level > 0 ? (level * 1000) : 1000)) * 100 : 0;
                        const color = ITEM_LEVEL_COLORS[level] || '#333';
                        return (
                            <div key={i} title={r?.owner} style={{ background: '#1a1a1a', border: `1px solid ${color}55`, padding: '2px 1px', position: 'relative', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
                                <span style={{ color, fontSize: '10px', fontWeight: 'bold', zIndex: 1 }}>{r ? level : '-'}</span>
                                {r && <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: INGRESS_COLORS.ENLIGHTENED, width: `${Math.min(100, energyPct)}%` }}></div>}
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '8px' }}>
                    {Array.from({ length: 4 }).map((_, i) => {
                        const m = mods[i];
                        const label = getModShortLabel(m);
                        let color = '#333';
                        if (m) {
                            color = RARITY_COLORS[m.rarity] || '#fff';
                        }
                        return (
                            <div key={i} title={m ? `${m.rarity} ${m.name}` : undefined} style={{ background: '#1a1a1a', border: `1px solid ${color}44`, padding: '3px 2px', fontSize: '9px', color, textAlign: 'center', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: m ? 'bold' : 'normal', overflow: 'hidden', borderRadius: '2px' }}>
                                <div>{label}</div>
                            </div>
                        );
                    })}
                </div>

                <div
                    onClick={() => setShowOwners((current) => !current)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', padding: '6px 0', color: teamColor, fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.04em' }}
                >
                    <span>OWNERS</span>
                    <span style={{ color: '#777' }}>{showOwners ? 'HIDE' : 'SHOW'}</span>
                </div>

                {showOwners && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '8px' }}>
                        <OwnerColumn title="RESONATORS">
                            {Array.from({ length: 8 }).map((_, i) => {
                                const r = resos[i];
                                const maxEnergy = r ? getMaxResonatorEnergy(r.level) : 0;
                                const healthPct = r && maxEnergy > 0 ? Math.round((r.energy / maxEnergy) * 100) : 0;
                                return (
                                    <OwnerRow
                                        key={i}
                                        label={r ? `R${r.level}` : `R${i + 1}`}
                                        detail={r ? `${healthPct}%` : '-'}
                                        owner={r?.owner}
                                        color={ITEM_LEVEL_COLORS[r?.level || 0] || '#555'}
                                    />
                                );
                            })}
                        </OwnerColumn>
                        <OwnerColumn title="MODS">
                            {Array.from({ length: 4 }).map((_, i) => {
                                const m = mods[i];
                                return (
                                    <OwnerRow
                                        key={i}
                                        label={m ? getModShortLabel(m) : `M${i + 1}`}
                                        detail={m?.rarity || '-'}
                                        owner={m?.owner}
                                        color={m ? RARITY_COLORS[m.rarity] || '#fff' : '#555'}
                                    />
                                );
                            })}
                        </OwnerColumn>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '5px', borderTop: '1px solid #222', paddingTop: '7px', flexWrap: 'wrap' }}>
                    <span style={{ border: `1px solid ${p.visited ? PORTAL_HISTORY_COLORS.visited : '#333'}`, color: p.visited ? PORTAL_HISTORY_COLORS.visited : '#444', padding: '2px 7px', borderRadius: '99px', fontSize: '9px', fontWeight: p.visited ? 'bold' : 'normal' }}>VISITED</span>
                    <span style={{ border: `1px solid ${p.captured ? PORTAL_HISTORY_COLORS.captured : '#333'}`, color: p.captured ? PORTAL_HISTORY_COLORS.captured : '#444', padding: '2px 7px', borderRadius: '99px', fontSize: '9px', fontWeight: p.captured ? 'bold' : 'normal' }}>CAPTURED</span>
                    <span style={{ border: `1px solid ${p.scanned ? PORTAL_HISTORY_COLORS.scanned : '#333'}`, color: p.scanned ? PORTAL_HISTORY_COLORS.scanned : '#444', padding: '2px 7px', borderRadius: '99px', fontSize: '9px', fontWeight: p.scanned ? 'bold' : 'normal' }}>SCANNED</span>
                </div>
            </div>
        );
    };

    const renderField = (field: Field): JSX.Element => {
        const estimatedMU = calculateEstimatedFieldMu(field);
        return (
            <div style={{ padding: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginBottom: '6px' }}>
                    <div style={{ background: '#111', padding: '4px', borderRadius: '3px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>TEAM</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{field.team}</div>
                    </div>
                    <div style={{ background: '#111', padding: '4px', borderRadius: '3px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>EST. MU</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{estimatedMU.toLocaleString()}</div>
                    </div>
                </div>
                <div style={{ background: '#111', padding: '4px', borderRadius: '3px', fontSize: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{field.id.slice(0, 12)}...</span>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid #222', paddingTop: '6px' }}>
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
            <div style={{ padding: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginBottom: '6px' }}>
                    <div style={{ background: '#111', padding: '4px', borderRadius: '3px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>TEAM</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{link.team}</div>
                    </div>
                    <div style={{ background: '#111', padding: '4px', borderRadius: '3px' }}>
                        <div style={{ color: '#666', fontSize: '9px' }}>LENGTH</div>
                        <div style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px' }}>{distStr}</div>
                    </div>
                </div>
                <div style={{ background: '#111', padding: '4px', borderRadius: '3px', fontSize: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{link.id.slice(0, 12)}...</span>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid #222', paddingTop: '6px' }}>
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
        <div id="entity-details" style={{ color: '#fff', padding: '0', fontFamily: 'monospace', fontSize: '12px', pointerEvents: 'auto', border: `1px solid ${teamColor}`, borderRadius: '4px', background: 'rgba(0,0,0,0.95)', overflow: 'hidden', boxShadow: `0 0 10px ${teamColor}44` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 8px', borderBottom: '1px solid #333' }}>
                <span style={{ color: teamColor, fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.04em' }}>{title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {titleMeta && <span style={{ color: '#aaa', fontSize: '10px', fontWeight: 'bold' }}>{titleMeta}</span>}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close details"
                            style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.06)', color: '#ddd', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '4px', font: 'inherit', fontSize: '18px', lineHeight: 1, cursor: 'pointer' }}
                        >
                            x
                        </button>
                    )}
                </div>
            </div>
            {type === 'portal' ? renderPortal(data as Portal) : type === 'field' ? renderField(data as Field) : type === 'link' ? renderLink(data as Link) : (
                <div style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#111', padding: '6px', borderRadius: '4px', fontSize: '11px' }}>
                        <span style={{ color: '#666' }}>ID</span>
                        <span style={{ color: '#ccc' }}>{(data as Portal | Link | Field).id.slice(0, 12)}...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function OwnerColumn({ title, children }: { title: string; children: preact.ComponentChildren }): JSX.Element {
    return (
        <div style={{ minWidth: 0 }}>
            <div style={{ color: '#777', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>{children}</div>
        </div>
    );
}

function OwnerRow({ label, detail, owner, color }: { label: string; detail: string; owner?: string; color: string }): JSX.Element {
    const isEmpty = !owner;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '32px 38px minmax(0, 1fr)', gap: '5px', alignItems: 'center', background: '#111', border: `1px solid ${isEmpty ? '#222' : `${color}33`}`, borderRadius: '3px', padding: '3px 4px', minWidth: 0 }}>
            <span style={{ color: isEmpty ? '#444' : color, fontSize: '9px', fontWeight: 'bold' }}>{label}</span>
            <span style={{ color: '#777', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</span>
            <span style={{ color: isEmpty ? '#444' : '#cfcfcf', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner || '-'}</span>
        </div>
    );
}

function getModShortLabel(mod: { rarity: string; name: string } | undefined): string {
    if (!mod) return '-';
    const rarity = mod.rarity === 'VERY_RARE' ? 'VR' : (mod.rarity === 'RARE' ? 'R' : 'C');
    const shortName = mod.name.split(' ').map((w: string) => w[0]).join('');
    return `${rarity}${shortName}`;
}

function getMaxResonatorEnergy(level: number): number {
    return [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000][level] || 1000;
}

function getTitleMeta(type: string, data: Portal | Link | Field): string {
    if (type === 'portal') {
        const portal = data as Portal;
        return portal.level !== undefined ? `L${portal.level}` : portal.team;
    }

    if (type === 'field') {
        return `~${calculateEstimatedFieldMu(data as Field).toLocaleString()} MU`;
    }

    if (type === 'link') {
        const link = data as Link;
        const distKm = EntityLogic.getDistKm(link.fromLat, link.fromLng, link.toLat, link.toLng);
        return distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(2)}km`;
    }

    return '';
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
