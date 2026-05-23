import { h, JSX } from 'preact';
import type { PortalHistoryKey, PortalHistoryLayerState, PortalHistoryMode } from './portalHistory';
import { PORTAL_HISTORY_COLORS } from './portalHistory';
import { INGRESS_COLORS, ITEM_LEVEL_COLORS } from './MapConstants';

interface MapToolsProps {
    openDrawer: string | null;
    onToggle: (id: string) => void;
    onNav: (action: string) => void;
    onStyle: (style: string) => void;
    onMode: (mode: string) => void;
    portalHistoryLayers: PortalHistoryLayerState;
    onPortalHistoryLayerToggle: (key: PortalHistoryKey) => void;
    keyOverlayEnabled: boolean;
    onKeyOverlayToggle: () => void;
    portalLevelColorEnabled: boolean;
    onPortalLevelColorToggle: () => void;
    portalHealthColorEnabled: boolean;
    onPortalHealthColorToggle: () => void;
}

const HISTORY_LAYER_LABELS: Record<PortalHistoryKey, string> = {
    visited: 'V',
    captured: 'C',
    scanned: 'S',
};

const HISTORY_MODE_LABELS: Record<PortalHistoryMode, string> = {
    off: 'Off',
    highlight: 'On',
    inverse: 'Inv',
};

function historyButtonStyle(mode: PortalHistoryMode, color: string): h.JSX.CSSProperties {
    const isOff = mode === 'off';
    const isInverse = mode === 'inverse';
    return {
        width: '42px',
        height: '36px',
        background: isOff ? 'rgba(40,40,40,0.9)' : (isInverse ? `${color}10` : `${color}22`),
        color: isOff ? '#777' : color,
        border: `${isInverse ? 2 : 1}px ${isInverse ? 'dashed' : 'solid'} ${isOff ? '#555' : color}`,
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1px',
        pointerEvents: 'auto',
        boxShadow: isInverse ? `0 0 10px ${color}33 inset` : 'none',
    };
}

export function MapTools({ openDrawer, onToggle, onNav, onStyle, onMode, portalHistoryLayers, onPortalHistoryLayerToggle, keyOverlayEnabled, onKeyOverlayToggle, portalLevelColorEnabled, onPortalLevelColorToggle, portalHealthColorEnabled, onPortalHealthColorToggle }: MapToolsProps): JSX.Element {
    return (
        <div id="map-tools-container" style={{ position: 'fixed', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 2000001, pointerEvents: 'none' }}>
            
            {/* Navigation Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('nav')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 0 10px rgba(0,255,255,0.2)' }}>🧭</div>
                <div className="drawer-content" style={{ display: openDrawer === 'nav' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {['🎯', 'R', '+', '-', '↑', '↓', '←', '→'].map(l => (
                        <div key={l} className="debug-btn" onClick={() => onNav(l)} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l}</div>
                    ))}
                </div>
            </div>

            {/* Style Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('style')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🎨</div>
                <div className="drawer-content" style={{ display: openDrawer === 'style' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {['Dark', 'Light', 'Voyager', 'OSM'].map(l => (
                        <div key={l} className="debug-btn" onClick={() => onStyle(l)} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l[0]}</div>
                    ))}
                </div>
            </div>

            {/* Mode Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('mode')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🛠</div>
                <div className="drawer-content" style={{ display: openDrawer === 'mode' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    <div className="debug-btn" onClick={() => onMode('3D')} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>3D</div>
                    <div className="debug-btn" onClick={() => onMode('Src')} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>Src</div>
                </div>
            </div>

            {/* Portal History Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('history')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>◎</div>
                <div className="drawer-content" style={{ display: openDrawer === 'history' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {(Object.keys(HISTORY_LAYER_LABELS) as PortalHistoryKey[]).map((key) => {
                        const mode = portalHistoryLayers[key];
                        const color = PORTAL_HISTORY_COLORS[key];
                        return (
                            <div
                                key={key}
                                className="debug-btn"
                                onClick={() => onPortalHistoryLayerToggle(key)}
                                title={`${key}: ${mode}`}
                                style={historyButtonStyle(mode, color)}
                            >
                                <span>{HISTORY_LAYER_LABELS[key]}</span>
                                <span style={{ fontSize: '8px', color: mode === 'off' ? '#666' : color }}>{HISTORY_MODE_LABELS[mode]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Inventory Keys Toggle */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div
                    className="debug-btn"
                    onClick={onKeyOverlayToggle}
                    title={`Inventory keys: ${keyOverlayEnabled ? 'on' : 'off'}`}
                    style={{
                        width: '40px',
                        height: '40px',
                        background: keyOverlayEnabled ? `${INGRESS_COLORS.KEY}22` : 'rgba(34,34,34,0.9)',
                        color: keyOverlayEnabled ? INGRESS_COLORS.KEY : '#fff',
                        border: `1px solid ${keyOverlayEnabled ? INGRESS_COLORS.KEY : '#00ffff'}`,
                        borderRadius: '50%',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                        boxShadow: keyOverlayEnabled ? `0 0 10px ${INGRESS_COLORS.KEY}33` : 'none',
                    }}
                >
                    KEY
                </div>
            </div>

            {/* Portal Visual Modes */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('portal-visuals')} title="Portal visual modes" style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>◉</div>
                <div className="drawer-content" style={{ display: openDrawer === 'portal-visuals' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    <div
                        className="debug-btn"
                        onClick={onPortalLevelColorToggle}
                        title={`Portal level coloring: ${portalLevelColorEnabled ? 'on' : 'off'}`}
                        style={{
                            width: '42px',
                            height: '36px',
                            background: portalLevelColorEnabled ? `${ITEM_LEVEL_COLORS[8]}22` : 'rgba(40,40,40,0.9)',
                            color: portalLevelColorEnabled ? ITEM_LEVEL_COLORS[8] : '#777',
                            border: `1px solid ${portalLevelColorEnabled ? ITEM_LEVEL_COLORS[8] : '#555'}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            boxShadow: portalLevelColorEnabled ? `0 0 10px ${ITEM_LEVEL_COLORS[8]}33 inset` : 'none',
                        }}
                    >
                        LVL
                    </div>
                    <div
                        className="debug-btn"
                        onClick={onPortalHealthColorToggle}
                        title={`Portal health coloring: ${portalHealthColorEnabled ? 'on' : 'off'}`}
                        style={{
                            width: '42px',
                            height: '36px',
                            background: portalHealthColorEnabled ? `${INGRESS_COLORS.ENLIGHTENED}22` : 'rgba(40,40,40,0.9)',
                            color: portalHealthColorEnabled ? INGRESS_COLORS.ENLIGHTENED : '#777',
                            border: `1px solid ${portalHealthColorEnabled ? INGRESS_COLORS.ENLIGHTENED : '#555'}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            boxShadow: portalHealthColorEnabled ? `0 0 10px ${INGRESS_COLORS.ENLIGHTENED}33 inset` : 'none',
                        }}
                    >
                        HP
                    </div>
                </div>
            </div>

            {/* Compact Diagnostics */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div
                    className="debug-btn"
                    onClick={() => onToggle('diagnostics')}
                    title="Diagnostics"
                    style={{
                        width: '40px',
                        height: '40px',
                        background: openDrawer === 'diagnostics' ? 'rgba(0,255,255,0.18)' : 'rgba(34,34,34,0.9)',
                        color: openDrawer === 'diagnostics' ? '#7ef9ff' : '#fff',
                        border: `1px solid ${openDrawer === 'diagnostics' ? '#7ef9ff' : '#00ffff'}`,
                        borderRadius: '50%',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                    }}
                >
                    DBG
                </div>
            </div>
        </div>
    );
}
