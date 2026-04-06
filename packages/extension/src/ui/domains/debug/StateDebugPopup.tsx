import { h, JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { IRIS_VERSION_LABEL } from '../../../version';
import './debug.css';
import {THEMES} from "../../theme";

// ---------------------------------------------------------------------------
// StateDebugPopup
// ---------------------------------------------------------------------------

interface StateDebugPopupProps {
    onClose: () => void;
}

export function StateDebugPopup({ onClose }: StateDebugPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
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

        return (): void => clearInterval(interval);
    }, [addressStatus, addressNextLookupAt]);

    const isStale = discoveredLocation && lastResolvedLatLng && (
        Math.abs(lastResolvedLatLng.lat - mapState.lat) > 0.000001 ||
        Math.abs(lastResolvedLatLng.lng - mapState.lng) > 0.000001
    );

    return (
        <Popup
            onClose={onClose}
            title="Diagnostics"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-debug-info">
                <div className="iris-debug-stats">
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Version</span>
                            <span className="iris-debug-value">{IRIS_VERSION_LABEL}</span>
                        </div>
                    </div>

                    <div className="iris-debug-section-title">LOCATION</div>
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Lat</span>
                            <span className="iris-debug-value">{mapState.lat.toFixed(6)}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Lng</span>
                            <span className="iris-debug-value">{mapState.lng.toFixed(6)}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Zoom</span>
                            <span className="iris-debug-value">{mapState.zoom}</span>
                        </div>
                    </div>
                    
                    <div className="iris-debug-address-section">
                        <div className="iris-debug-address-header">
                            <span className="iris-debug-section-title">ADDRESS</span>
                            {isStale && <span className="iris-debug-address-stale">(stale)</span>}
                            {addressStatus === 'resolving' && <span className="iris-debug-address-resolving">Resolving...</span>}
                            {countdown !== null && <span className="iris-debug-address-wait">Wait: {(countdown / 1000).toFixed(1)}s</span>}
                        </div>
                        <div className="iris-debug-table">
                             <div className="iris-debug-row">
                                <span className={`iris-debug-value iris-debug-discovered-location ${isStale ? 'iris-debug-location-stale' : ''}`}>
                                    {discoveredLocation || '(unknown)'}
                                </span>
                             </div>
                        </div>
                    </div>
                    
                    <div className="iris-debug-section-title">ENTITIES</div>
                    <div className="iris-debug-table">
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Portals</span>
                            <span className="iris-debug-value">{portalCount}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Links</span>
                            <span className="iris-debug-value">{linkCount}</span>
                        </div>
                        <div className="iris-debug-row">
                            <span className="iris-debug-label">Fields</span>
                            <span className="iris-debug-value">{fieldCount}</span>
                        </div>
                    </div>

                    {Object.values(statsItems).length > 0 && (
                        <>
                            <div className="iris-debug-section-title">EXTRA</div>
                            <div className="iris-debug-table">
                                {Object.values(statsItems).map((item) => (
                                    <div key={item.id} className="iris-debug-row">
                                        <span className="iris-debug-label">{item.label}</span>
                                        <span className={`iris-debug-value iris-debug-stat-${item.id}`}>
                                            {typeof item.value === 'function' ? item.value() : item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="iris-debug-section-title">DEVELOPER</div>
                    <div className="iris-debug-toggle">
                        <label className="iris-label">
                            <input
                                type="checkbox"
                                checked={debugLogging}
                                onChange={toggleDebugLogging}
                                className="iris-checkbox"
                            />
                            Log raw message activity
                        </label>
                    </div>
                </div>
            </div>
        </Popup>
    );
}
