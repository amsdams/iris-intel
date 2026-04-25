import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { THEMES } from '../theme';
import './dashboard.css';

export type DashboardType = 'intel' | 'map' | 'system' | null;

interface DashboardOverlayProps {
    type: DashboardType;
    onClose: () => void;
    onAction: (action: string) => void;
    showMap: boolean;
}

interface DashboardItem {
    id: string;
    label: string;
    icon: string;
}

export function DashboardOverlay({ type, onClose, onAction, showMap }: DashboardOverlayProps): JSX.Element | null {
    if (!type) return null;

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const menuItems = useStore((state) => state.menuItems);

    const items: DashboardItem[] = [];

    if (type === 'intel') {
        items.push(
            { id: 'stats', label: 'Player Stats', icon: '👤' },
            { id: 'inventory', label: 'Inventory', icon: '🎒' },
            { id: 'gameScore', label: 'Global Score', icon: '📊' },
            { id: 'regionScore', label: 'Region Score', icon: '📉' },
            { id: 'comm', label: 'COMM', icon: '💬' },
            { id: 'passcodes', label: 'Passcodes', icon: '🔑' }
        );
    } else if (type === 'map') {
        items.push(
            { id: 'search', label: 'Search', icon: '🔍' },
            { id: 'nav', label: 'Navigation', icon: '🧭' },
            { id: 'filters', label: 'Filters', icon: '🛡️' },
            { id: 'missions', label: 'Missions', icon: '🚀' }
        );
    } else if (type === 'system') {
        items.push(
            { id: 'plugins', label: 'Plugins', icon: '🧩' },
            { id: 'settings', label: 'Map Settings', icon: '⚙️' },
            { id: 'diag', label: 'Diagnostics', icon: '🛠️' },
            { id: 'toggle', label: showMap ? 'Use Intel Map' : 'Use IRIS Map', icon: '🔄' }
        );
    }

    return (
        <div className="iris-dashboard-overlay" onClick={onClose}>
            <div className="iris-dashboard-content" onClick={(e) => e.stopPropagation()}>
                <div className="iris-dashboard-header">
                    <h1 style={{ color: theme.AQUA }}>{type.toUpperCase()} CENTER</h1>
                    <button className="iris-dashboard-close" onClick={onClose} style={{ color: theme.AQUA, borderColor: theme.AQUA }}>✕</button>
                </div>
                
                <div className="iris-dashboard-grid">
                    {items.map(item => (
                        <button 
                            key={item.id} 
                            className="iris-dashboard-item"
                            onClick={() => { onAction(item.id); onClose(); }}
                        >
                            <div className="iris-dashboard-icon">{item.icon}</div>
                            <div className="iris-dashboard-label" style={{ color: theme.AQUA }}>{item.label}</div>
                        </button>
                    ))}

                    {type === 'system' && menuItems.map(item => (
                        <button 
                            key={item.id} 
                            className="iris-dashboard-item iris-dashboard-item-plugin"
                            onClick={() => { item.onClick(); onClose(); }}
                        >
                            <div className="iris-dashboard-icon">📦</div>
                            <div className="iris-dashboard-label" style={{ color: theme.AQUA }}>{item.label}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
