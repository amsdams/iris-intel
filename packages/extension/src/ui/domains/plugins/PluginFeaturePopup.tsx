import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import {THEMES} from '../../theme';
import './plugins.css';

interface ActionMarkupData {
    plain?: string;
    team?: string;
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
}

type ActionMarkupSegment = [string, ActionMarkupData];

interface PlayerAction {
    text: string;
    markup: ActionMarkupSegment[];
    time: number;
}

interface PluginFeatureProperties extends Record<string, unknown> {
    color?: string;
    name?: string;
    label?: string;
    time?: number;
    portalName?: string;
    lat?: number;
    lng?: number;
    isPlayerMarker?: boolean;
    actions?: PlayerAction[];
}

export function PluginFeaturePopup(): JSX.Element | null {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const selectedFeature = useStore((state) => state.selectedPluginFeature);
    const setSelectedPluginFeature = useStore((state) => state.setSelectedPluginFeature);

    if (!selectedFeature) return null;

    const properties = (selectedFeature.properties ?? {}) as PluginFeatureProperties;
    const {
        name = 'Unknown',
        label,
        time = 0,
        portalName = 'Unknown portal',
        lat = 0,
        lng = 0,
        isPlayerMarker = false,
        actions = [],
    } = properties;

    const renderActionSegment = (segment: ActionMarkupSegment, index: number): JSX.Element | null => {
        const [type, data] = segment;
        const text = data.plain || data.name || '';

        if (type === 'FACTION' || type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
            return null;
        }

        if (type === 'PORTAL' || type === 'LINK') {
            const portalNameText = data.name || data.plain || '';
            const portalAddress = data.address || '';
            const handlePortalClick = (): void => {
                if (typeof data.latE6 !== 'number' || typeof data.lngE6 !== 'number') return;

                window.postMessage({
                    type: 'IRIS_MOVE_MAP',
                    center: { lat: data.latE6 / 1e6, lng: data.lngE6 / 1e6 },
                    zoom: 17,
                }, '*');
            };

            return (
                <span key={index}>
                    <span
                        className="iris-feature-portal-link"
                        onClick={handlePortalClick}
                    >
                        {portalNameText}
                    </span>
                    {portalAddress && portalAddress !== portalNameText ? ` (${portalAddress})` : ''}
                </span>
            );
        }

        return <span key={index}>{text}</span>;
    };

    return (
        <Popup
            title={isPlayerMarker ? 'Player Last Activity' : 'Plugin Feature'}
            onClose={() => setSelectedPluginFeature(null)}
            className="iris-popup-top-center iris-popup-medium"
            style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
                '--iris-feature-color': properties.color,
            } as Record<string, string>}
        >
            <div className="iris-plugin-feature-details">
                <div className="iris-feature-row iris-feature-player">
                    <span className="iris-feature-label">{isPlayerMarker ? 'Player: ' : 'Label: '}</span>
                    <span className="iris-feature-value-strong">
                        {isPlayerMarker ? name : (label || name)}
                    </span>
                </div>
                {isPlayerMarker && (
                    <div className="iris-feature-row iris-feature-time">
                        <span className="iris-feature-label">Time: </span>
                        <span>{new Date(time).toLocaleString()}</span>
                    </div>
                )}
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

                {actions.length > 0 && (
                    <div className="iris-feature-actions">
                        <div className="iris-feature-label iris-mb-1">Recent Actions:</div>
                        {actions.map((action, i) => (
                            <div key={i} className="iris-feature-action-item">
                                <span className="iris-feature-action-time">
                                    [{new Date(action.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                                </span>
                                {action.markup.length > 0 ? action.markup.map((segment, segmentIndex) => renderActionSegment(segment, segmentIndex)) : action.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Popup>
    );
}
