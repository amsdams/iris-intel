import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { IRIS_VERSION_LABEL } from '../../../version';

// ---------------------------------------------------------------------------
// StateDebugPopup
// ---------------------------------------------------------------------------

interface StateDebugPopupProps {
    onClose: () => void;
}

export function StateDebugPopup({ onClose }: StateDebugPopupProps): JSX.Element {
    const portals = useStore((state) => state.portals);
    const links = useStore((state) => state.links);
    const fields = useStore((state) => state.fields);
    const statsItems = useStore((state) => state.statsItems);

    const portalCount = Object.keys(portals).length;
    const linkCount = Object.keys(links).length;
    const fieldCount = Object.keys(fields).length;
    const debugLogging = useStore((state) => state.debugLogging);
    const toggleDebugLogging = useStore((state) => state.toggleDebugLogging);

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
            <div className="iris-debug-info">
                <div className="iris-debug-toggle" style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                            type="checkbox"
                            checked={debugLogging}
                            onChange={toggleDebugLogging}
                        />
                        Enable Debug Logging
                    </label>
                </div>
                <div className="iris-debug-stats">
                    <p className="iris-debug-stat-item" style={{ margin: 0 }}>Version: {IRIS_VERSION_LABEL}</p>
                    <p className="iris-debug-stat-item" style={{ margin: 0 }}>Portals: {portalCount}</p>
                    <p className="iris-debug-stat-item" style={{ margin: 0 }}>Links: {linkCount}</p>
                    <p className="iris-debug-stat-item" style={{ margin: 0 }}>Fields: {fieldCount}</p>
                    {Object.values(statsItems).map((item) => (
                        <p key={item.id} className={`iris-debug-stat-item iris-debug-stat-${item.id}`} style={{ margin: 0 }}>
                            {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
                        </p>
                    ))}
                </div>
            </div>
        </Popup>
    );
}
