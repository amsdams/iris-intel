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

    const themeId = useStore((state) => state.themeId);

    const theme = THEMES[themeId] || THEMES.INGRESS;

    return (
        <Popup
            onClose={onClose}
            title="Map Theme"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-map-themes">
                {Object.keys(MAP_THEMES).map((id) => (
                    <div 
                        key={id} 
                        className={`iris-map-theme-item ${mapThemeId === id ? 'iris-map-theme-item-active' : ''}`}
                        onClick={() => setMapTheme(id)}
                    >
                        <input
                            type="radio"
                            checked={mapThemeId === id}
                            readOnly
                            className="iris-map-theme-radio"
                        />
                        <span className="iris-map-theme-name">
                            {MAP_THEMES[id].name}
                        </span>
                    </div>
                ))}
            </div>
        </Popup>
    );
}
