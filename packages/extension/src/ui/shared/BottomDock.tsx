import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { THEMES } from '../theme';
import { DashboardType } from './DashboardOverlay';
import './bottomdock.css';

interface BottomDockProps {
    activeDashboard: DashboardType;
    onToggleDashboard: (type: DashboardType) => void;
}

export function BottomDock({ activeDashboard, onToggleDashboard }: BottomDockProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const navItems: { type: DashboardType, icon: string, label: string }[] = [
        { type: 'intel', icon: '👤', label: 'Intel' },
        { type: 'map', icon: '🗺️', label: 'Map' },
        { type: 'system', icon: '⚙️', label: 'System' },
    ];

    return (
        <div className="iris-bottom-dock" style={{ borderColor: `${theme.AQUA}55` }}>
            {navItems.map(item => (
                <button
                    key={item.type}
                    className={`iris-dock-btn ${activeDashboard === item.type ? 'iris-dock-btn-active' : ''}`}
                    onClick={() => onToggleDashboard(item.type)}
                    style={{ color: activeDashboard === item.type ? theme.AQUA : '#fff' }}
                >
                    <div className="iris-dock-icon">{item.icon}</div>
                    <div className="iris-dock-label">{item.label}</div>
                </button>
            ))}
        </div>
    );
}
