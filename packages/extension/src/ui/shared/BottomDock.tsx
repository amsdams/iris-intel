import { h, JSX } from 'preact';
import { DrawerTab } from './DockDrawer';
import './bottomdock.css';

interface BottomDockProps {
    activeDashboard: DrawerTab;
    onToggleDashboard: (type: DrawerTab) => void;
}

export function BottomDock({ activeDashboard, onToggleDashboard }: BottomDockProps): JSX.Element {
    const navItems: { type: DrawerTab, icon: string, label: string, className: string }[] = [
        { type: 'intel', icon: '👤', label: 'Agent', className: 'iris-dock-btn-intel' },
        { type: 'nav', icon: '🧭', label: 'Map', className: 'iris-dock-btn-nav' },
        { type: 'tactical', icon: '🔍', label: 'Tact', className: 'iris-dock-btn-tactical' },
        { type: 'layers', icon: '🌐', label: 'Layr', className: 'iris-dock-btn-layers' },
        { type: 'highlighters', icon: '✨', label: 'Vis', className: 'iris-dock-btn-highlighters' },
        { type: 'system', icon: '⚙️', label: 'Sys', className: 'iris-dock-btn-system' },
    ];

    return (
        <div className="iris-bottom-dock">
            {navItems.map(item => (
                <button
                    key={item.type}
                    className={`iris-dock-btn ${item.className} ${activeDashboard === item.type ? 'iris-dock-btn-active' : ''}`}
                    onClick={() => onToggleDashboard(item.type)}
                >
                    <div className="iris-dock-icon">{item.icon}</div>
                    <div className="iris-dock-label">{item.label}</div>
                </button>
            ))}
        </div>
    );
}
