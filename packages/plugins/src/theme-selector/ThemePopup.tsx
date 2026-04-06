import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../../extension/src/ui/shared/Popup';
import { THEMES } from '../../../extension/src/ui/theme';
import './theme-selector.css';

interface ThemePopupProps {
    onClose: () => void;
}

export function ThemePopup({ onClose }: ThemePopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const setTheme = useStore((state) => state.setTheme);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    return (
        <Popup
            onClose={onClose}
            title="Theme Settings"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-theme-settings">
                {Object.keys(THEMES).map((id) => (
                    <label 
                        key={id} 
                        className={`iris-theme-item ${themeId === id ? 'iris-theme-item-active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="theme-id"
                            checked={themeId === id}
                            onChange={() => setTheme(id)}
                            className="iris-theme-radio"
                        />
                        <span className="iris-theme-name">{id}</span>
                        
                        <div className="iris-theme-previews">
                            <div className="iris-theme-dot" style={{ background: THEMES[id].E }} />
                            <div className="iris-theme-dot" style={{ background: THEMES[id].R }} />
                            <div className="iris-theme-dot" style={{ background: THEMES[id].M }} />
                        </div>
                    </label>
                ))}
            </div>
            
            <p className="iris-theme-note">
                Themes are provided by the Theme Selector Plugin.
            </p>
        </Popup>
    );
}
