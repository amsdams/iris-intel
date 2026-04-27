import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { THEMES, TEAM_NAME } from '../theme';
import { DrawerTab } from './DockDrawer';
import './bottomdock.css';

interface BottomDockProps {
    activeDashboard: DrawerTab;
    onToggleDashboard: (type: DrawerTab) => void;
    onToggleSelection: () => void;
    isSelectionVisible: boolean;
}

export function BottomDock({ activeDashboard, onToggleDashboard, onToggleSelection, isSelectionVisible }: BottomDockProps): JSX.Element {
    const selectedPortalId = useStore(state => state.selectedPortalId);
    const selectedFieldId = useStore(state => state.selectedFieldId);
    const selectedLinkId = useStore(state => state.selectedLinkId);
    const portals = useStore(state => state.portals);
    const themeId = useStore(state => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const navItems: { type: DrawerTab, icon: string, label: string, className: string }[] = [
        { type: 'intel', icon: '👤', label: 'Agent', className: 'iris-dock-btn-intel' },
        { type: 'nav', icon: '🧭', label: 'Map', className: 'iris-dock-btn-nav' },
        { type: 'tactical', icon: '🔍', label: 'Tact', className: 'iris-dock-btn-tactical' },
        { type: 'layers', icon: '🌐', label: 'Layr', className: 'iris-dock-btn-layers' },
        { type: 'highlighters', icon: '✨', label: 'Vis', className: 'iris-dock-btn-highlighters' },
        { type: 'system', icon: '⚙️', label: 'Sys', className: 'iris-dock-btn-system' },
    ];

    let selectionBtn = null;
    if (selectedPortalId || selectedFieldId || selectedLinkId) {
        let label = 'Target';
        let icon = '🎯';
        let color = theme.AQUA;

        if (selectedPortalId) {
            const p = portals[selectedPortalId];
            if (p) {
                label = p.level !== undefined ? `L${p.level}` : 'Portal';
                icon = '⛩️';
                color = theme[p.team as keyof typeof theme] as string || theme.N;
            }
        } else if (selectedFieldId) {
            label = 'Field';
            icon = '📐';
        } else if (selectedLinkId) {
            label = 'Link';
            icon = '🔗';
        }

        selectionBtn = (
            <button
                className={`iris-dock-btn iris-dock-btn-selection ${isSelectionVisible ? 'iris-dock-btn-active' : ''}`}
                onClick={onToggleSelection}
                style={{ color }}
            >
                <div className="iris-dock-icon">{icon}</div>
                <div className="iris-dock-label">{label}</div>
            </button>
        );
    }

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
            {selectionBtn && (
                <div className="iris-dock-separator" />
            )}
            {selectionBtn}
        </div>
    );
}
