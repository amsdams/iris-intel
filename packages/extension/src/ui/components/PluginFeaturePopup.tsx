import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { UI_COLORS, SPACING } from '../theme';

export function PluginFeaturePopup() {
    const selectedFeature = useStore((state) => state.selectedPluginFeature);
    const setSelectedPluginFeature = useStore((state) => state.setSelectedPluginFeature);

    if (!selectedFeature) return null;

    const { name, time, portalName, lat, lng, isPlayerMarker } = selectedFeature;

    return (
        <Popup
            title={isPlayerMarker ? "Player Last Activity" : "Plugin Feature"}
            onClose={() => setSelectedPluginFeature(null)}
            style={{
                bottom: '20px',
                right: '20px',
                minWidth: '250px',
                borderColor: selectedFeature.color || UI_COLORS.AQUA,
            }}
        >
            <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                <div style={{ marginBottom: SPACING.XS }}>
                    <span style={{ color: UI_COLORS.TEXT_MUTED }}>Player: </span>
                    <span style={{ color: selectedFeature.color || UI_COLORS.TEXT_BASE, fontWeight: 'bold' }}>
                        {name}
                    </span>
                </div>
                <div style={{ marginBottom: SPACING.XS }}>
                    <span style={{ color: UI_COLORS.TEXT_MUTED }}>Time: </span>
                    <span>{new Date(time).toLocaleString()}</span>
                </div>
                <div style={{ marginBottom: SPACING.XS }}>
                    <span style={{ color: UI_COLORS.TEXT_MUTED }}>Portal: </span>
                    <span 
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
                <div style={{ marginTop: SPACING.SM, fontSize: '0.8em', color: '#666' }}>
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
            </div>
        </Popup>
    );
}
