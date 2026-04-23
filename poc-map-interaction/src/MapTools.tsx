import { h, JSX } from 'preact';

interface MapToolsProps {
    openDrawer: string | null;
    onToggle: (id: string) => void;
    onNav: (action: string) => void;
    onStyle: (style: string) => void;
    onMode: (mode: string) => void;
}

export function MapTools({ openDrawer, onToggle, onNav, onStyle, onMode }: MapToolsProps): JSX.Element {
    return (
        <div id="map-tools-container" style={{ position: 'fixed', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 2000001, pointerEvents: 'none' }}>
            
            {/* Navigation Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('nav')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 0 10px rgba(0,255,255,0.2)' }}>🧭</div>
                <div className="drawer-content" style={{ display: openDrawer === 'nav' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {['+', '-', '↑', '↓', '←', '→', 'R'].map(l => (
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
        </div>
    );
}
