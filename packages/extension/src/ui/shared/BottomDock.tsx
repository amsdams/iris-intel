import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { THEMES } from '../theme';
import { DrawerTab } from './DockDrawer';
import './bottomdock.css';

interface BottomDockProps {
    activeDashboard: DrawerTab;
    onToggleDashboard: (type: DrawerTab) => void;
}

export function BottomDock({ activeDashboard, onToggleDashboard }: BottomDockProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const navItems: { type: DrawerTab, icon: string, label: string }[] = [
        { type: 'intel', icon: '👤', label: 'Intel' },
        { type: 'nav', icon: '🧭', label: 'Nav' },
        { type: 'highlighters', icon: '✨', label: 'High' },
        { type: 'filters', icon: '🛡️', label: 'Filt' },
        { type: 'system', icon: '⚙️', label: 'Sys' },
    ];

    return (
        <div className="iris-bottom-dock" style={{ borderColor: `${theme.AQUA}55`, gap: '8px', padding: '0 8px', maxWidth: '95%', width: 'auto' }}>
            {navItems.map(item => (
                <button
                    key={item.type}
                    className={`iris-dock-btn ${activeDashboard === item.type ? 'iris-dock-btn-active' : ''}`}
                    onClick={() => onToggleDashboard(item.type)}
                    style={{ 
                        color: activeDashboard === item.type ? theme.AQUA : '#fff',
                        width: '40px' /* Slightly smaller to fit 5 */
                    }}
                >
                    <div className="iris-dock-icon" style={{ fontSize: '1.2em' }}>{item.icon}</div>
                    <div className="iris-dock-label" style={{ fontSize: '0.55em' }}>{item.label}</div>
                </button>
            ))}
        </div>
    );
}
