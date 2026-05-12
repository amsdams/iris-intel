import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';

interface MapTabProps {
    onAction: (action: string) => void;
}

export function MapTab({ onAction }: MapTabProps): JSX.Element {
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const plannedLinksEnabled = useStore((state) => state.pluginStates['planned-links'] ?? false);

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Map Navigation</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('search')}>
                    <div className="iris-drawer-btn-icon">🔍</div>
                    <div className="iris-drawer-btn-label">Search</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('nav')}>
                    <div className="iris-drawer-btn-icon">🧭</div>
                    <div className="iris-drawer-btn-label">Controls</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('missions')}>
                    <div className="iris-drawer-btn-icon">🚀</div>
                    <div className="iris-drawer-btn-label">Missions</div>
                </button>
                {plannedLinksEnabled && (
                    <Fragment>
                        <button className={`iris-drawer-btn ${planningMode && planningTool === 'links' ? 'iris-drawer-btn-active' : ''}`} onClick={() => onAction('planning-links')}>
                            <div className="iris-drawer-btn-icon">↔</div>
                            <div className="iris-drawer-btn-label">Links</div>
                        </button>
                        <button className={`iris-drawer-btn ${planningMode && planningTool === 'markers' ? 'iris-drawer-btn-active' : ''}`} onClick={() => onAction('planning-markers')}>
                            <div className="iris-drawer-btn-icon">●</div>
                            <div className="iris-drawer-btn-label">Markers</div>
                        </button>
                    </Fragment>
                )}
            </div>
        </Fragment>
    );
}
