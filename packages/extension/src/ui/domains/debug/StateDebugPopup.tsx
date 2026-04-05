import { h, JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { IRIS_VERSION_LABEL } from '../../../version';
import './debug.css';

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
    const lastResolvedLatLng = useStore((state) => state.lastResolvedLatLng);
    const addressStatus = useStore((state) => state.addressStatus);
    const addressNextLookupAt = useStore((state) => state.addressNextLookupAt);

    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        if (addressStatus !== 'pending' || !addressNextLookupAt) {
            setCountdown(null);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.max(0, addressNextLookupAt - Date.now());
            setCountdown(remaining);
        }, 50);

        return () => clearInterval(interval);
    }, [addressStatus, addressNextLookupAt]);

    const isStale = discoveredLocation && lastResolvedLatLng && (
        Math.abs(lastResolvedLatLng.lat - mapState.lat) > 0.000001 ||
        Math.abs(lastResolvedLatLng.lng - mapState.lng) > 0.000001
    );

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
                    
                    <div className="iris-debug-address-section">
                        <div className="iris-debug-address-header">
                            <p className="iris-debug-stat-item iris-debug-stat-label iris-debug-address-label">Address:</p>
                            {isStale && <span className="iris-debug-address-stale">(stale)</span>}
                            {addressStatus === 'resolving' && <span className="iris-debug-address-resolving">Resolving...</span>}
                            {countdown !== null && <span className="iris-debug-address-wait">Wait: {(countdown / 1000).toFixed(1)}s</span>}
                        </div>
                        {discoveredLocation ? (
                            <p className={`iris-debug-stat-item iris-debug-discovered-location ${isStale ? 'iris-debug-location-stale' : ''}`}>
                                {discoveredLocation}
                            </p>
                        ) : (
                            <p className="iris-debug-stat-item iris-debug-discovered-location iris-debug-location-unknown">
                                (unknown)
                            </p>
                        )}
                    </div>
                    
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
