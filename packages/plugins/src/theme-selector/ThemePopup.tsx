import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../../extension/src/ui/shared/Popup';
import { THEMES, UI_COLORS } from '../../../extension/src/ui/theme';

interface ThemePopupProps {
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

export function ThemePopup({ onClose }: ThemePopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const setTheme = useStore((state) => state.setTheme);

    return (
        <Popup
            onClose={onClose}
            title="Theme Settings"
            style={{
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.keys(THEMES).map((id) => (
                    <div 
                        key={id} 
                        style={{ 
                            ...itemStyle, 
                            borderColor: themeId === id ? UI_COLORS.AQUA : '#333',
                            background: themeId === id ? '#1a1a1a' : '#111'
                        }}
                        onClick={() => setTheme(id)}
                    >
                        <input
                            type="radio"
                            checked={themeId === id}
                            readOnly
                            style={{ marginRight: '10px' }}
                        />
                        <span style={{ color: themeId === id ? UI_COLORS.AQUA : '#fff' }}>{id}</span>
                        
                        {/* Small preview dots */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: THEMES[id].E }} />
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: THEMES[id].R }} />
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: THEMES[id].M }} />
                        </div>
                    </div>
                ))}
            </div>
            
            <p style={{ fontSize: '0.75em', color: UI_COLORS.TEXT_MUTED, marginTop: '15px', textAlign: 'center' }}>
                Themes are provided by the Theme Selector Plugin.
            </p>
        </Popup>
    );
}
