import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import {MAP_THEMES, THEMES} from '../../theme';
import './map.css';

interface MapSettingsPopupProps {
    onClose: () => void;
}

export function MapSettingsPopup({ onClose }: MapSettingsPopupProps): JSX.Element {
    const mapThemeId = useStore((state) => state.mapThemeId);
    const setMapTheme = useStore((state) => state.setMapTheme);

    const allowRotation = useStore((state) => state.allowRotation);
    const toggleAllowRotation = useStore((state) => state.toggleAllowRotation);
    const allowPitch = useStore((state) => state.allowPitch);
    const toggleAllowPitch = useStore((state) => state.toggleAllowPitch);

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    return (
        <Popup
            onClose={onClose}
            title="Map Settings"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-map-themes">
                <div className="iris-map-section-title">MAP THEME</div>
                {Object.keys(MAP_THEMES).map((id) => (
                    <label 
                        key={id} 
                        className={`iris-choice-item iris-label ${mapThemeId === id ? 'iris-choice-item-active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="map-theme"
                            checked={mapThemeId === id}
                            onChange={() => setMapTheme(id)}
                            className="iris-radio"
                        />
                        <span className="iris-map-theme-name">
                            {MAP_THEMES[id].name}
                        </span>
                    </label>
                ))}

                <div className="iris-map-section-title iris-mt-3">INTERACTION</div>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={allowRotation}
                        onChange={toggleAllowRotation}
                        className="iris-checkbox"
                    />
                    <span className="iris-map-theme-name">Allow Rotation</span>
                </label>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={allowPitch}
                        onChange={toggleAllowPitch}
                        className="iris-checkbox"
                    />
                    <span className="iris-map-theme-name">Allow Pitch (3D)</span>
                </label>
            </div>
        </Popup>
    );
}
