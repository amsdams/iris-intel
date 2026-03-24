import { h } from 'preact';
import { useStore, normalizeTeam } from '@iris/core';
import { Popup } from './Popup';
import { UI_COLORS, SPACING, THEMES } from '../theme';

export function PluginFeaturePopup() {
    const selectedFeature = useStore((state) => state.selectedPluginFeature);
    const setSelectedPluginFeature = useStore((state) => state.setSelectedPluginFeature);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    if (!selectedFeature) return null;

    const { name, time, portalName, lat, lng, isPlayerMarker, team } = selectedFeature;
    
    // Determine faction color from theme
    const factionKey = normalizeTeam(team) as 'E' | 'R' | 'M' | 'N';
    const factionColor = theme[factionKey] || theme.N || UI_COLORS.TEXT_BASE;

    return (
        <Popup
            title={isPlayerMarker ? "Player Last Activity" : "Movement Path"}
            onClose={() => setSelectedPluginFeature(null)}
            style={{
                bottom: '20px',
                right: '20px',
                minWidth: '250px',
                borderColor: factionColor,
            }}
        >
            <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                {name && (
                    <div style={{ marginBottom: SPACING.XS }}>
                        <span style={{ color: UI_COLORS.TEXT_MUTED }}>Player: </span>
                        <span style={{ color: factionColor, fontWeight: 'bold' }}>
                            {name}
                        </span>
                    </div>
                )}
                {time && (
                    <div style={{ marginBottom: SPACING.XS }}>
                        <span style={{ color: UI_COLORS.TEXT_MUTED }}>Time: </span>
                        <span>{new Date(time).toLocaleString()}</span>
                    </div>
                )}
                {portalName && (
                    <div style={{ marginBottom: SPACING.XS }}>
                        <span style={{ color: UI_COLORS.TEXT_MUTED }}>Portal: </span>
                        <span 
                            style={{ color: UI_COLORS.AQUA, cursor: 'pointer', borderBottom: '1px dotted' }}
                            onClick={() => {
                                if (lat !== undefined && lng !== undefined) {
                                    window.postMessage({
                                        type: 'IRIS_MOVE_MAP',
                                        center: { lat, lng },
                                        zoom: 17
                                    }, '*');
                                }
                            }}
                        >
                            {portalName}
                        </span>
                    </div>
                )}
                {lat !== undefined && lng !== undefined && (
                    <div style={{ marginTop: SPACING.SM, fontSize: '0.8em', color: '#666' }}>
                        {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                    </div>
                )}
                {!isPlayerMarker && !portalName && (
                    <div style={{ color: UI_COLORS.TEXT_MUTED, fontStyle: 'italic', fontSize: '0.8em' }}>
                        Historical movement path segment.
                    </div>
                )}
            </div>
        </Popup>
    );
}
