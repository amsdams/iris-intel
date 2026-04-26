import { h, JSX } from 'preact';
import './dock-drawer.css';
import { AgentTab } from './drawer/AgentTab';
import { MapTab } from './drawer/MapTab';
import { TacticalTab } from './drawer/TacticalTab';
import { LayersTab } from './drawer/LayersTab';
import { VisualsTab } from './drawer/VisualsTab';
import { SystemTab } from './drawer/SystemTab';

export type DrawerTab = 'intel' | 'nav' | 'tactical' | 'layers' | 'highlighters' | 'system' | null;

interface DockDrawerProps {
    tab: DrawerTab;
    onClose: () => void;
    onAction: (action: string) => void;
    showMap: boolean;
}

export function DockDrawer({ tab, onClose, onAction, showMap }: DockDrawerProps): JSX.Element | null {
    if (!tab) return null;

    return (
        <div className="iris-dock-drawer">
            <div className="iris-drawer-header">
                <h3 className="iris-drawer-title">{tab.toUpperCase()} CONTROL</h3>
                <button className="iris-drawer-close" onClick={onClose}>✕</button>
            </div>
            <div className="iris-drawer-content">
                {tab === 'intel' && <AgentTab onAction={onAction} />}
                {tab === 'nav' && <MapTab onAction={onAction} />}
                {tab === 'tactical' && <TacticalTab />}
                {tab === 'layers' && <LayersTab />}
                {tab === 'highlighters' && <VisualsTab />}
                {tab === 'system' && <SystemTab onAction={onAction} showMap={showMap} onClose={onClose} />}
            </div>
        </div>
    );
}
