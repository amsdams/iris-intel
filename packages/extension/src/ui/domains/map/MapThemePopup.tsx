import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import {MAP_THEMES, THEMES} from '../../theme';
import './map.css';

interface MapThemePopupProps {
    onClose: () => void;
}

export function MapThemePopup({ onClose }: MapThemePopupProps): JSX.Element {
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
            title="Map Style"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-map-themes">
                <div className="iris-map-section-title">THEME</div>
                {Object.keys(MAP_THEMES).map((id) => (
                    <label 
                        key={id} 
                        className={`iris-map-theme-item ${mapThemeId === id ? 'iris-map-theme-item-active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="map-theme"
                            checked={mapThemeId === id}
                            onChange={() => setMapTheme(id)}
                            className="iris-map-theme-radio"
                        />
                        <span className="iris-map-theme-name">
                            {MAP_THEMES[id].name}
                        </span>
                    </label>
                ))}

                <div className="iris-map-section-title" style={{ marginTop: '12px' }}>INTERACTION</div>
                <label className="iris-map-theme-item">
                    <input
                        type="checkbox"
                        checked={allowRotation}
                        onChange={toggleAllowRotation}
                        className="iris-map-theme-radio"
                    />
                    <span className="iris-map-theme-name">Allow Rotation</span>
                </label>
                <label className="iris-map-theme-item">
                    <input
                        type="checkbox"
                        checked={allowPitch}
                        onChange={toggleAllowPitch}
                        className="iris-map-theme-radio"
                    />
                    <span className="iris-map-theme-name">Allow Pitch (3D)</span>
                </label>
            </div>
        </Popup>
    );
}
