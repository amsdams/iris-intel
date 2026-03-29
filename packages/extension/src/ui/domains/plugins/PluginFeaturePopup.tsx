import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { UI_COLORS, SPACING } from '../../theme';

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
            <div className="iris-plugin-feature-details" style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                <div className="iris-feature-row iris-feature-player" style={{ marginBottom: SPACING.XS }}>
                    <span style={{ color: UI_COLORS.TEXT_MUTED }}>Player: </span>
                    <span style={{ color: color || UI_COLORS.TEXT_BASE, fontWeight: 'bold' }}>
                        {name}
                    </span>
                </div>
                <div className="iris-feature-row iris-feature-time" style={{ marginBottom: SPACING.XS }}>
                    <span style={{ color: UI_COLORS.TEXT_MUTED }}>Time: </span>
                    <span>{new Date(time).toLocaleString()}</span>
                </div>
                <div className="iris-feature-row iris-feature-portal" style={{ marginBottom: SPACING.XS }}>
                    <span style={{ color: UI_COLORS.TEXT_MUTED }}>Portal: </span>
                    <span 
                        className="iris-feature-portal-link"
                        style={{ color: UI_COLORS.AQUA, cursor: 'pointer', borderBottom: '1px dotted' }}
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
                <div className="iris-feature-row iris-feature-coords" style={{ marginTop: SPACING.SM, fontSize: '0.8em', color: '#666' }}>
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
            </div>
        </Popup>
    );
}
