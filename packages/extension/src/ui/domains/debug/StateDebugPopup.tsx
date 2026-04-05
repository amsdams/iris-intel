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
    const mapState = useStore((state) => state.mapState);
    const discoveredLocation = useStore((state) => state.discoveredLocation);

    return (
        <Popup
            onClose={onClose}
            title="State Debug Info"
            className="iris-debug-popup-custom"
        >
            <div className="iris-debug-info">
                <div className="iris-debug-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={debugLogging}
                            onChange={toggleDebugLogging}
                        />
                        Enable Debug Logging
                    </label>
                </div>
                <div className="iris-debug-stats">
                    <p className="iris-debug-stat-item">Version: {IRIS_VERSION_LABEL}</p>
                    <p className="iris-debug-stat-item iris-debug-stat-label">Location:</p>
                    <p className="iris-debug-stat-item iris-debug-stat-value">Lat: {mapState.lat.toFixed(6)}</p>
                    <p className="iris-debug-stat-item iris-debug-stat-value">Lng: {mapState.lng.toFixed(6)}</p>
                    <p className="iris-debug-stat-item iris-debug-stat-value">Zoom: {mapState.zoom}</p>
                    {discoveredLocation && (
                        <div style={{ marginTop: '4px' }}>
                            <p className="iris-debug-stat-item iris-debug-stat-label" style={{ fontSize: '0.85em' }}>Address:</p>
                            <p className="iris-debug-stat-item iris-debug-discovered-location">
                                {discoveredLocation}
                            </p>
                        </div>
                    )}
                    
                    <div className="iris-debug-divider">
                        <p className="iris-debug-stat-item">Portals: {portalCount}</p>
                        <p className="iris-debug-stat-item">Links: {linkCount}</p>
                        <p className="iris-debug-stat-item">Fields: {fieldCount}</p>
                    </div>
                    {Object.values(statsItems).map((item) => (
                        <p key={item.id} className={`iris-debug-stat-item iris-debug-stat-${item.id}`}>
                            {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
                        </p>
                    ))}
                </div>
            </div>
        </Popup>
    );
}
