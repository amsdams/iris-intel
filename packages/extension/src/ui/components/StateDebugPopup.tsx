import { h } from 'preact';
import { useStore } from '@iris/core';

// ---------------------------------------------------------------------------
// StateDebugPopup
// ---------------------------------------------------------------------------

interface StateDebugPopupProps {
    onClose: () => void;
}

export function StateDebugPopup({ onClose }: StateDebugPopupProps) {
    const portals = useStore((state) => state.portals);
    const links = useStore((state) => state.links);
    const fields = useStore((state) => state.fields);
    const statsItems = useStore((state) => state.statsItems);

    const portalCount = Object.keys(portals).length;
    const linkCount = Object.keys(links).length;
    const fieldCount = Object.keys(fields).length;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px', // Adjust position to not overlap with PlayerStatsPopup
            zIndex: 10002,
            background: 'rgba(0, 0, 0, 0.92)',
            color: '#00ffff',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #00ffff',
            boxShadow: '0 0 20px #00ffff55',
            fontFamily: 'monospace',
            minWidth: '250px',
            maxHeight: '80vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
        }}>
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '18px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '0 4px',
                }}
            >✕</button>

            <h2 style={{ margin: '0 0 10px 0', color: '#00ffff', paddingRight: '20px' }}>State Debug Info</h2>
            <p style={{ margin: 0 }}>Portals: {portalCount}</p>
            <p style={{ margin: 0 }}>Links: {linkCount}</p>
            <p style={{ margin: 0 }}>Fields: {fieldCount}</p>
            {Object.values(statsItems).map((item) => (
                <p key={item.id} style={{ margin: 0 }}>
                    {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
                </p>
            ))}
        </div>
    );
}
