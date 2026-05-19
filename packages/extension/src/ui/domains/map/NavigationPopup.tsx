import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';
import './map.css';

interface NavigationPopupProps {
    onClose: () => void;
}

const MAX_MERCATOR_LAT = 85.05112878;
const PAN_STEP_PX = 250;

function lngToWorldX(lng: number, worldSize: number): number {
    return ((lng + 180) / 360) * worldSize;
}

function latToWorldY(lat: number, worldSize: number): number {
    const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
    const sin = Math.sin((clampedLat * Math.PI) / 180);
    return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
}

function worldXToLng(x: number, worldSize: number): number {
    const lng = (x / worldSize) * 360 - 180;
    return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function worldYToLat(y: number, worldSize: number): number {
    const mercatorY = 0.5 - y / worldSize;
    const lat = 90 - (360 * Math.atan(Math.exp(-mercatorY * 2 * Math.PI))) / Math.PI;
    return Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
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
        const worldSize = 512 * (2 ** zoom);
        const nextX = lngToWorldX(lng, worldSize) + dx;
        const nextY = latToWorldY(lat, worldSize) + dy;

        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: {
                lat: worldYToLat(nextY, worldSize),
                lng: worldXToLng(nextX, worldSize),
            },
            zoom,
        }, '*');
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
                '--iris-map-nav-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-navigation-controls">
                <div className="iris-map-section-title">ZOOM</div>
                <div className="iris-map-nav-row">
                    <button className="iris-btn iris-map-nav-btn" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">+</button>
                    <div className="iris-map-nav-zoom-label">
                        Z{Math.floor(zoom)}
                    </div>
                    <button className="iris-btn iris-map-nav-btn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">-</button>
                </div>

                <div className="iris-map-section-title">PAN</div>
                <div className="iris-map-nav-grid">
                    <div />
                    <button className="iris-btn iris-map-nav-btn" onClick={() => pan(0, -PAN_STEP_PX)} title="Pan north" aria-label="Pan north">↑</button>
                    <div />
                    
                    <button className="iris-btn iris-map-nav-btn" onClick={() => pan(-PAN_STEP_PX, 0)} title="Pan west" aria-label="Pan west">←</button>
                    <div />
                    <button className="iris-btn iris-map-nav-btn" onClick={() => pan(PAN_STEP_PX, 0)} title="Pan east" aria-label="Pan east">→</button>
                    
                    <div />
                    <button className="iris-btn iris-map-nav-btn" onClick={() => pan(0, PAN_STEP_PX)} title="Pan south" aria-label="Pan south">↓</button>
                    <div />
                </div>
            </div>
        </Popup>
    );
}
