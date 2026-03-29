import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { MAP_THEMES, UI_COLORS } from '../../theme';

interface MapThemePopupProps {
    onClose: () => void;
}

const itemStyle: h.JSX.CSSProperties = {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.9em',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #333',
    background: '#111',
};

export function MapThemePopup({ onClose }: MapThemePopupProps): JSX.Element {
    const mapThemeId = useStore((state) => state.mapThemeId);
    const setMapTheme = useStore((state) => state.setMapTheme);

    return (
        <Popup
            onClose={onClose}
            title="Map Theme"
            style={{
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
            }}
        >
            <div className="iris-map-themes" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.keys(MAP_THEMES).map((id) => (
                    <div 
                        key={id} 
                        className={`iris-map-theme-item ${mapThemeId === id ? 'iris-map-theme-item-active' : ''}`}
                        style={{ 
                            ...itemStyle, 
                            borderColor: mapThemeId === id ? UI_COLORS.AQUA : '#333',
                            background: mapThemeId === id ? '#1a1a1a' : '#111'
                        }}
                        onClick={() => setMapTheme(id)}
                    >
                        <input
                            type="radio"
                            checked={mapThemeId === id}
                            readOnly
                            style={{ marginRight: '10px' }}
                        />
                        <span className="iris-map-theme-name" style={{ color: mapThemeId === id ? UI_COLORS.AQUA : '#fff' }}>
                            {MAP_THEMES[id].name}
                        </span>
                    </div>
                ))}
            </div>
        </Popup>
    );
}
