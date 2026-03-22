import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';

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
        <Popup
            onClose={onClose}
            title="State Debug Info"
            style={{
                bottom: '20px',
                right: '20px',
                minWidth: '250px',
            }}
        >
            <p style={{ margin: 0 }}>Portals: {portalCount}</p>
            <p style={{ margin: 0 }}>Links: {linkCount}</p>
            <p style={{ margin: 0 }}>Fields: {fieldCount}</p>
            {Object.values(statsItems).map((item) => (
                <p key={item.id} style={{ margin: 0 }}>
                    {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
                </p>
            ))}
        </Popup>
    );
}
