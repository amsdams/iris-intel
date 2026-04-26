import { h, JSX, Fragment } from 'preact';
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

interface DashboardSection {
    title: string;
    items: DashboardItem[];
}

export function DashboardOverlay({ type, onClose, onAction, showMap }: DashboardOverlayProps): JSX.Element | null {
    if (!type) return null;

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const menuItems = useStore((state) => state.menuItems);

    const sections: DashboardSection[] = [];

    if (type === 'intel') {
        sections.push({
            title: 'AGENT DATA',
            items: [
                { id: 'stats', label: 'Stats', icon: '👤' },
                { id: 'inventory', label: 'Inventory', icon: '🎒' },
                { id: 'comm', label: 'COMM', icon: '💬' },
            ]
        });
        sections.push({
            title: 'WORLD DATA',
            items: [
                { id: 'gameScore', label: 'Global MU', icon: '📊' },
                { id: 'regionScore', label: 'Cell MU', icon: '📉' },
                { id: 'passcodes', label: 'Passcodes', icon: '🔑' }
            ]
        });
    } else if (type === 'map') {
        sections.push({
            title: 'NAVIGATION',
            items: [
                { id: 'search', label: 'Search', icon: '🔍' },
                { id: 'nav', label: 'Controls', icon: '🧭' },
                { id: 'missions', label: 'Missions', icon: '🚀' }
            ]
        });
        sections.push({
            title: 'MAP FILTERS',
            items: [
                { id: 'layers', label: 'Layers', icon: '🌐' },
                { id: 'filters', label: 'Tactical', icon: '🛡️' },
                { id: 'history', label: 'History', icon: '📜' }
            ]
        });
    } else if (type === 'system') {
        sections.push({
            title: 'IRIS SETTINGS',
            items: [
                { id: 'plugins', label: 'Manager', icon: '🧩' },
                { id: 'settings', label: 'Display', icon: '⚙️' },
                { id: 'diag', label: 'Diagnostics', icon: '🛠️' },
                { id: 'toggle', label: showMap ? 'Use Intel' : 'Use IRIS', icon: '🔄' }
            ]
        });
        
        if (menuItems.length > 0) {
            sections.push({
                title: 'PLUGIN ACTIONS',
                items: menuItems.map(m => ({ id: `plugin-${m.id}`, label: m.label, icon: '📦', original: m }))
            });
        }
    }

    return (
        <div className="iris-dashboard-overlay" onClick={onClose}>
            <div className="iris-dashboard-content">
                <div className="iris-dashboard-header" onClick={(e) => e.stopPropagation()}>
                    <h1 style={{ color: theme.AQUA }}>{type.toUpperCase()} CENTER</h1>
                    <button className="iris-dashboard-close" onClick={onClose} style={{ color: theme.AQUA, borderColor: theme.AQUA }}>✕</button>
                </div>
                
                <div className="iris-dashboard-grid">
                    {sections.map(section => (
                        <Fragment key={section.title}>
                            <div className="iris-dashboard-section-title">{section.title}</div>
                            {section.items.map(item => (
                                <button 
                                    key={item.id} 
                                    className={`iris-dashboard-item ${item.id.startsWith('plugin-') ? 'iris-dashboard-item-plugin' : ''}`}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (item.id.startsWith('plugin-') && (item as any).original) {
                                            (item as any).original.onClick();
                                            onClose();
                                        } else {
                                            onAction(item.id); 
                                            onClose(); 
                                        }
                                    }}
                                >
                                    <div className="iris-dashboard-icon">{item.icon}</div>
                                    <div className="iris-dashboard-label" style={{ color: theme.AQUA }}>{item.label}</div>
                                </button>
                            ))}
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
