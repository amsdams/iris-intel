import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';
import './map.css';

interface NavigationPopupProps {
    onClose: () => void;
}

export function NavigationPopup({ onClose }: NavigationPopupProps): JSX.Element {
    const { lat, lng, zoom } = useStore((state) => state.mapState);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const zoomIn = (): void => {
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: { lat, lng },
            zoom: Math.min(zoom + 1, 20),
        }, '*');
    };

    const zoomOut = (): void => {
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: { lat, lng },
            zoom: Math.max(zoom - 1, 3),
        }, '*');
    };

    const pan = (dx: number, dy: number): void => {
        // Pan logic is usually handled by map.panBy in the content script.
        // We'll use a specialized message for this.
        window.postMessage({
            type: 'IRIS_PAN_MAP',
            dx,
            dy
        }, '*');
    };

    const btnStyle = {
        color: theme.AQUA,
        borderColor: theme.AQUA,
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px'
    };

    return (
        <Popup
            onClose={onClose}
            title="Navigation"
            className="iris-popup-top-center iris-popup-small"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-navigation-controls">
                <div className="iris-map-section-title">ZOOM</div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                    <button className="iris-btn" onClick={zoomIn} style={btnStyle}>+</button>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: '40px', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: theme.AQUA }}>
                        Z{Math.floor(zoom)}
                    </div>
                    <button className="iris-btn" onClick={zoomOut} style={btnStyle}>-</button>
                </div>

                <div className="iris-map-section-title">PAN</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gap: '10px', justifyContent: 'center' }}>
                    <div />
                    <button className="iris-btn" onClick={() => pan(0, -250)} style={btnStyle}>↑</button>
                    <div />
                    
                    <button className="iris-btn" onClick={() => pan(-250, 0)} style={btnStyle}>←</button>
                    <div />
                    <button className="iris-btn" onClick={() => pan(250, 0)} style={btnStyle}>→</button>
                    
                    <div />
                    <button className="iris-btn" onClick={() => pan(0, 250)} style={btnStyle}>↓</button>
                    <div />
                </div>
            </div>
        </Popup>
    );
}
