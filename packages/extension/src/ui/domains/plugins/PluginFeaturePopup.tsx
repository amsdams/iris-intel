import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { UI_COLORS } from '../../theme';

type PluginFeatureProperties = {
    color?: string;
    name?: string;
    time?: number;
    portalName?: string;
    lat?: number;
    lng?: number;
    isPlayerMarker?: boolean;
} & Record<string, unknown>;

export function PluginFeaturePopup(): JSX.Element | null {
    const selectedFeature = useStore((state) => state.selectedPluginFeature);
    const setSelectedPluginFeature = useStore((state) => state.setSelectedPluginFeature);

    if (!selectedFeature) return null;

    const properties = (selectedFeature.properties ?? {}) as PluginFeatureProperties;
    const {
        color,
        name = 'Unknown',
        time = 0,
        portalName = 'Unknown portal',
        lat = 0,
        lng = 0,
        isPlayerMarker = false,
    } = properties;

    return (
        <Popup
            title={isPlayerMarker ? 'Player Last Activity' : 'Plugin Feature'}
            onClose={() => setSelectedPluginFeature(null)}
            style={{
                bottom: '20px',
                right: '20px',
                minWidth: '250px',
                borderColor: color || UI_COLORS.AQUA,
            }}
        >
            <div className="iris-plugin-feature-details">
                <div className="iris-feature-row iris-feature-player">
                    <span className="iris-feature-label">Player: </span>
                    <span className="iris-feature-value-strong" style={{ color: color || UI_COLORS.TEXT_BASE }}>
                        {name}
                    </span>
                </div>
                <div className="iris-feature-row iris-feature-time">
                    <span className="iris-feature-label">Time: </span>
                    <span>{new Date(time).toLocaleString()}</span>
                </div>
                <div className="iris-feature-row iris-feature-portal">
                    <span className="iris-feature-label">Portal: </span>
                    <span 
                        className="iris-feature-portal-link"
                        onClick={() => {
                            window.postMessage({
                                type: 'IRIS_MOVE_MAP',
                                center: { lat, lng },
                                zoom: 17
                            }, '*');
                        }}
                    >
                        {portalName}
                    </span>
                </div>
                <div className="iris-feature-coords">
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
            </div>
        </Popup>
    );
}
