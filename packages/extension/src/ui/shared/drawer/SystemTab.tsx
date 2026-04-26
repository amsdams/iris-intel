import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';

interface SystemTabProps {
    onAction: (action: string) => void;
    showMap: boolean;
    onClose: () => void;
}

export function SystemTab({ onAction, showMap, onClose }: SystemTabProps): JSX.Element {
    const menuItems = useStore((state) => state.menuItems);

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Iris Core</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('plugins')}>
                    <div className="iris-drawer-btn-icon">🧩</div>
                    <div className="iris-drawer-btn-label">Manager</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('settings')}>
                    <div className="iris-drawer-btn-icon">⚙️</div>
                    <div className="iris-drawer-btn-label">Display</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('diag')}>
                    <div className="iris-drawer-btn-icon">🛠️</div>
                    <div className="iris-drawer-btn-label">Debug</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('toggle')}>
                    <div className="iris-drawer-btn-icon">🔄</div>
                    <div className="iris-drawer-btn-label">{showMap ? 'Intel' : 'IRIS'}</div>
                </button>
            </div>
            
            {menuItems.length > 0 && (
                <Fragment>
                    <div className="iris-drawer-section-label">Plugin Actions</div>
                    <div className="iris-drawer-scroll-group">
                        {menuItems.map(m => (
                            <button key={m.id} className="iris-drawer-btn" onClick={() => { m.onClick(); onClose(); }}>
                                <div className="iris-drawer-btn-icon">📦</div>
                                <div className="iris-drawer-btn-label">{m.label}</div>
                            </button>
                        ))}
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
}
