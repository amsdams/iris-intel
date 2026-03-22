import { h } from 'preact';
import { useStore, Plext } from '@iris/core';

interface CommPopupProps {
    onClose: () => void;
}

const TEAM_COLOUR: Record<string, string> = {
    E: '#00ff00',
    R: '#0000ff',
    M: '#ff0000',
    N: '#ffffff',
};

export function CommPopup({ onClose }: CommPopupProps) {
    const plexts = useStore((state) => state.plexts);

    const normalizeTeam = (team: string): string => {
        if (!team) return 'N';
        const t = team.toUpperCase();
        console.log("team", t);
        if (t === 'ENLIGHTENED') return 'E';
        if (t === 'RESISTANCE') return 'R';
        if (t === 'NEUTRAL') return 'M';
        return 'N';
    };

    const formatTime = (ms: number) => {
        const date = new Date(ms);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    const renderMarkup = (markup: any[]) => {
        return markup.map((m, i) => {
            const type = m[0];
            const data = m[1];
            let color = '#ffffff';

            if (type === 'PLAYER') {
                color = TEAM_COLOUR[normalizeTeam(data.team)] || '#ffffff';
            } else if (type === 'PORTAL') {
                color = '#00ffff';
            } else if (type === 'SECURE') {
                color = '#ffff00';
            } else if (type === 'SENDER') {
                color = TEAM_COLOUR[normalizeTeam(data.team)] || '#ffffff';
            }

            return (
                <span key={i} style={{ color }}>
                    {data.plain || data.name || data}
                </span>
            );
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: '60px',
            right: '20px',
            width: '400px',
            maxHeight: '70vh',
            background: 'rgba(0, 0, 0, 0.92)',
            color: '#ffffff',
            padding: '0',
            borderRadius: '8px',
            border: '2px solid #00ffff',
            boxShadow: '0 0 20px #00ffff55',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10000,
            pointerEvents: 'auto',
        }}>
            <div style={{
                padding: '12px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
            }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>COMM</span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '18px',
                    }}
                >✕</button>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
            }}>
                {plexts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        No messages yet
                    </div>
                ) : (
                    plexts.map((p) => (
                        <div key={p.id} style={{
                            marginBottom: '6px',
                            fontSize: '0.85em',
                            lineHeight: '1.4',
                            borderBottom: '1px solid #222',
                            paddingBottom: '4px',
                        }}>
                            <span style={{ color: '#666', marginRight: '6px' }}>
                                [{formatTime(p.time)}]
                            </span>
                            {p.markup ? renderMarkup(p.markup) : p.text}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
